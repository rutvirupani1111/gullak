import { route, ok, fail } from "@/lib/http";
import { withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";
import { decPhone, sha256, token } from "@/lib/crypto";
import { waTemplate } from "@/lib/consent";

export const POST = route<{ params: Promise<{ id: string; customerId: string }> }>(async (req, { params }) => {
  const p = await params;
  const shop = await ownerShop(p.id);
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const r = await withShop(shop.id, async (q) => {
    const sent = await q.one<{ n: number }>("select count(*)::int n from comeback_tokens where shop_id = $1 and created_at > now() - interval '1 day'", [shop.id]);
    if ((sent?.n ?? 0) >= 20) return "cap";
    const c = await q.one("select c.*, s.name as shop_name, s.language from customers c join shops s on s.id = c.shop_id where c.id = $1 and c.wa_opt_in and c.deleted_at is null and c.phone_enc is not null", [p.customerId]);
    if (!c) return null;
    const t = token(18);
    await q.query("insert into comeback_tokens (shop_id, customer_id, token_hash, expires_at) values ($1,$2,$3, now() + interval '7 days')", [shop.id, c.id, sha256(t)]);
    const link = `${site}/s/${shop.slug}?cb=${t}`;
    const text = waTemplate(c.language, c.shop_name, c.first_name, link);
    const num = decPhone(c.phone_enc).replace("+", "");
    return shop.is_demo ? `https://wa.me/?text=${encodeURIComponent(text)}` : `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  });
  if (r === "cap") return fail(429, "daily_cap", "Aaj ke 20 chitthi ho gaye. Kal aur.", "20 a day, so your number stays safe. More tomorrow.");
  if (!r) return fail(404, "not_found", "Yeh grahak ab list mein nahi hai.", "This customer is no longer on the list.");
  return ok({ waUrl: r });
});
