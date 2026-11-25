import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { admin, withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";
import { PALETTES } from "@/lib/art";

const S = z.object({
  name: z.string().trim().min(2).max(60).optional(), name_local: z.string().trim().max(60).nullable().optional(),
  address: z.string().trim().min(3).max(140).optional(), city: z.string().trim().min(2).max(40).optional(),
  language: z.enum(["hi", "en", "hinglish"]).optional(), palette: z.string().refine((p) => p in PALETTES).optional(),
  initial: z.string().trim().min(1).max(2).optional(),
  keeper: z.object({ face: z.string().max(10), head: z.string().max(10), stache: z.string().max(10), specs: z.boolean(), prop: z.string().max(10) }).optional(),
});
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const shop = await ownerShop((await params).id);
  return ok(await withShop(shop.id, (q) => q.one("select id, slug, name, name_local, address, city, language, palette, initial, keeper, is_demo from shops where id = $1", [shop.id])));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const shop = await ownerShop((await params).id);
  const b = await body(req, S);
  const keys = Object.keys(b) as (keyof typeof b)[];
  if (!keys.length) return ok({ ok: true });
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const r = await withShop(shop.id, (q) => q.one(`update shops set ${sets} where id = $1 returning slug, name, name_local, address, city, language, palette, initial, keeper`, [shop.id, ...keys.map((k) => b[k])]));
  return ok(r);
});

// Removing a shop clears every campaign, coupon, customer phone and key it holds. The owner types the web name to confirm.
export const DELETE = route<Ctx>(async (req, { params }) => {
  const shop = await ownerShop((await params).id);
  const { confirm } = await body(req, z.object({ confirm: z.string().max(40) }));
  if (confirm !== shop.slug) return fail(400, "confirm_mismatch", "Web naam theek se likho, tabhi dukaan hategi.", "Type the shop's web name exactly to remove it.");
  await admin(async (q) => {
    for (const t of ["redemptions", "gift_slips", "comeback_tokens", "coupons", "plays"]) await q.query(`delete from ${t} where shop_id = $1`, [shop.id]);
    await q.query("delete from shops where id = $1", [shop.id]);
  });
  return ok({ deleted: true });
});
