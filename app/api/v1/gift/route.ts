import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { admin, withShop } from "@/lib/db";
import { device } from "@/lib/session";
import { sha256, token } from "@/lib/crypto";
import { periodBucket } from "@/lib/time";

const S = z.object({ shopSlug: z.string().regex(/^[a-z0-9-]{3,40}$/) });

// Dost ko bhejo: after a play, one gift slip per period. It only turns into a play at the shop itself.
export const POST = route(async (req) => {
  const { shopSlug } = await body(req, S);
  const dev = (await device(true))!;
  const shop = await admin((q) => q.one<{ id: string }>("select id from shops where slug = $1", [shopSlug]));
  if (!shop) return fail(404, "not_found", "Yeh dukaan nahi mili.", "This shop was not found.");
  const t = token(18);
  const r = await withShop(shop.id, async (q) => {
    const c = await q.one("select id, play_period from campaigns where shop_id = $1 and status = 'live' order by starts_at desc limit 1", [shop.id]);
    if (!c) return "no_campaign";
    const bucket = periodBucket(c.play_period);
    const played = await q.one("select 1 from plays where shop_id = $1 and device_id = $2 and campaign_id = $3", [shop.id, dev, c.id]);
    if (!played) return "not_played";
    const prior = await q.one("select 1 from gift_slips where shop_id = $1 and from_device = $2 and period_bucket = $3", [shop.id, dev, bucket]);
    if (prior) return "already";
    await q.query("insert into gift_slips (shop_id, from_device, token_hash, period_bucket, expires_at) values ($1,$2,$3,$4, now() + interval '7 days')", [shop.id, dev, sha256(t), bucket]);
    return "ok";
  });
  if (r === "no_campaign") return fail(409, "ended", "Abhi koi khel nahi chal raha.", "No game is running right now.");
  if (r === "not_played") return fail(409, "not_played", "Pehle khud khelo, phir dost ko bhejo.", "Play once yourself, then send one to a friend.");
  if (r === "already") return fail(409, "already_sent", "Is baar ka lifafa ban chuka hai. Agli baar phir.", "You have made this period's slip already.");
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return ok({ url: `${site}/g/${t}` }, 201);
});
