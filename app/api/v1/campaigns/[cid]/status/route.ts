import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { withShop } from "@/lib/db";
import { campaignForOwner } from "@/lib/server/owner";

const S = z.object({ action: z.enum(["publish", "pause", "end"]) });
export const POST = route<{ params: Promise<{ cid: string }> }>(async (req, { params }) => {
  const { c, shop } = await campaignForOwner((await params).cid);
  const { action } = await body(req, S);
  const r = await withShop(shop.id, async (q) => {
    if (action === "publish") {
      const cons = await q.one("select 1 from prizes where campaign_id = $1 and kind in ('consolation','none') and active", [c.id]);
      if (!cons) return "no_consolation";
      await q.query("update campaigns set status = 'paused', version = version + 1 where shop_id = $1 and status = 'live' and id <> $2", [shop.id, c.id]);
      await q.query("update campaigns set status = 'live', starts_at = least(starts_at, now()), ends_at = greatest(ends_at, now() + interval '7 days'), version = version + 1 where id = $1", [c.id]);
    } else {
      await q.query("update campaigns set status = $2, version = version + 1 where id = $1", [c.id, action === "pause" ? "paused" : "ended"]);
    }
    return "ok";
  });
  if (r === "no_consolation") return fail(409, "no_consolation", "Ek 'agli baar' inaam zaroori hai.", "A consolation prize is required.");
  return ok({ ok: true });
});
