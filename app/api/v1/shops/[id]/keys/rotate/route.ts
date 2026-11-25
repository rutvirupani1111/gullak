import { route, ok } from "@/lib/http";
import { withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";
import { newShopKey } from "@/lib/crypto";

// A new signing key (kv + 1). Old public keys stay published, so coupons already in gullaks still verify.
export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const shop = await ownerShop((await params).id);
  const k = newShopKey();
  const r = await withShop(shop.id, async (q) => {
    const cur = await q.one<{ kv: number }>("select coalesce(max(kv), 0)::int kv from shop_keys where shop_id = $1", [shop.id]);
    await q.query("update shop_keys set retired_at = now() where shop_id = $1 and retired_at is null", [shop.id]);
    await q.query("insert into shop_keys (shop_id, kv, public_key, private_key_enc) values ($1, $2, $3, $4)", [shop.id, cur!.kv + 1, k.pub, k.privEnc]);
    return { kv: cur!.kv + 1 };
  });
  return ok(r);
});
