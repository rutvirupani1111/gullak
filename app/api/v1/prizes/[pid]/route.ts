import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { admin, withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";

const S = z.object({ remaining: z.number().int().min(0).max(100000).optional(), total_stock: z.number().int().min(0).max(100000).optional(), active: z.boolean().optional(), daily_cap: z.number().int().min(0).max(10000).nullable().optional(), cost_paise: z.number().int().min(0).max(1000000).optional() });
export const PATCH = route<{ params: Promise<{ pid: string }> }>(async (req, { params }) => {
  const { pid } = await params;
  const b = await body(req, S);
  const row = await admin((q) => q.one("select shop_id, kind from prizes where id = $1", [pid]));
  if (!row) return fail(404, "not_found", "Nahi mila.", "Not found.");
  const shop = await ownerShop(row.shop_id);
  if (b.active === false && (row.kind === "consolation" || row.kind === "none")) return fail(409, "required", "Yeh inaam hamesha rehta hai.", "This tier is always required.");
  const keys = Object.keys(b) as (keyof typeof b)[];
  const ifMatch = Number(req.headers.get("if-match"));
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(", ");
  const r = await withShop(shop.id, (q) => q.one(`update prizes set ${sets}, version = version + 1 where id = $1 and version = $2 returning *`, [pid, ifMatch, ...keys.map((k) => b[k])]));
  if (!r) {
    const cur = await withShop(shop.id, (q) => q.one("select * from prizes where id = $1", [pid]));
    return fail(409, "version_conflict", "Kisi aur ne badla.", "Someone else changed this.", { current: cur });
  }
  return ok(r);
});
