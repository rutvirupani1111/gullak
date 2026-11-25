import { ownerShop } from "@/lib/session";
import { withShop } from "@/lib/db";
import Settings from "@/components/owner/Settings";
export const metadata = { title: "Dukaan ki settings: Gullak" };
export default async function Page({ params }: { params: Promise<{ shop: string }> }) {
  const s = await ownerShop((await params).shop);
  const d = await withShop(s.id, async (q) => ({
    shop: await q.one("select id, slug, name, name_local, address, city, language, palette, initial, keeper, is_demo from shops where id = $1", [s.id]),
    keys: await q.query("select kv, created_at, retired_at from shop_keys where shop_id = $1 order by kv desc", [s.id]),
  }));
  return <Settings d={JSON.parse(JSON.stringify(d))} />;
}
