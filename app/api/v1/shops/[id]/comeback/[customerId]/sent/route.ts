import { route, ok } from "@/lib/http";
import { withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";

export const POST = route<{ params: Promise<{ id: string; customerId: string }> }>(async (_req, { params }) => {
  const p = await params;
  const shop = await ownerShop(p.id);
  const at = await withShop(shop.id, async (q) => {
    await q.query("update comeback_tokens set sent_at = now() where id = (select id from comeback_tokens where customer_id = $1 and shop_id = $2 order by created_at desc limit 1)", [p.customerId, shop.id]);
    const r = await q.one("update customers set last_sent_at = now() where id = $1 and shop_id = $2 returning last_sent_at", [p.customerId, shop.id]);
    return r?.last_sent_at;
  });
  return ok({ sentAt: at });
});
