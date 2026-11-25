import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { withShop } from "@/lib/db";
import { campaignForOwner } from "@/lib/server/owner";

const S = z.object({ weights: z.array(z.object({ id: z.uuid(), weight: z.number().int().min(0).max(10000) })).min(1).max(12) });
export const PATCH = route<{ params: Promise<{ cid: string }> }>(async (req, { params }) => {
  const { c, shop } = await campaignForOwner((await params).cid);
  const b = await body(req, S);
  const total = b.weights.reduce((a, w) => a + w.weight, 0);
  if (total !== 10000) return fail(400, "bad_total", "Kul 100% hona chahiye.", "Weights must add up to 100%.");
  const ifMatch = Number(req.headers.get("if-match"));
  const r = await withShop(shop.id, async (q) => {
    const v = await q.one("update campaigns set version = version + 1, updated_at = now() where id = $1 and version = $2 returning version", [c.id, ifMatch]);
    if (!v) return null;
    for (const w of b.weights) await q.query("update prizes set weight = $3, version = version + 1 where id = $1 and campaign_id = $2", [w.id, c.id, w.weight]);
    return v.version as number;
  });
  if (r === null) {
    const cur = await withShop(shop.id, (q) => q.query("select id, weight from prizes where campaign_id = $1 and active order by sort, id", [c.id]));
    return fail(409, "version_conflict", "Kisi aur ne badla.", "Someone else changed this.", { current: cur, version: c.version });
  }
  return ok({ version: r });
});
