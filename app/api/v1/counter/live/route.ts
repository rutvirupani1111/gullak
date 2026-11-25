import { route, ok, fail } from "@/lib/http";
import { admin, withShop } from "@/lib/db";
import { staff, owner } from "@/lib/session";
import { liveToken } from "@/lib/server/game";

export const GET = route(async (req) => {
  const st = await staff();
  let shopId = st?.shop_id;
  let slug = st?.slug;
  if (!shopId) {
    const o = await owner();
    const want = new URL(req.url).searchParams.get("shop");
    if (o && want) {
      const s = await admin((q) => q.one("select id, slug from shops where slug = $1 and owner_id = $2", [want, o.id]));
      shopId = s?.id; slug = s?.slug;
    }
  }
  if (!shopId) return fail(401, "signin", "Counter par PIN se login karo.", "Sign in at the counter with a PIN.");
  const c = await withShop(shopId, (q) => q.one("select id, live_secret, live_qr_required, name from campaigns where shop_id = $1 and status = 'live' order by starts_at desc limit 1", [shopId]));
  if (!c) return fail(409, "no_campaign", "Abhi koi khel chalu nahi hai.", "No game is live right now.");
  const w = Math.floor(Date.now() / 60000);
  return ok({ token: liveToken(c.live_secret, w), rotatesAt: new Date((w + 1) * 60000).toISOString(), slug, campaign: c.name, required: c.live_qr_required });
});
