import { ownerShop } from "@/lib/session";
import { withShop } from "@/lib/db";
import NewKhel from "@/components/owner/NewKhel";
export const metadata = { title: "Naya khel: Gullak" };
export default async function Page({ params }: { params: Promise<{ shop: string }> }) {
  const s = await ownerShop((await params).shop);
  const last = await withShop(s.id, (q) => q.one("select id, name, game from campaigns where shop_id = $1 order by created_at desc limit 1", [s.id]));
  const shop = await withShop(s.id, (q) => q.one("select id, slug, palette, initial from shops where id = $1", [s.id]));
  return <NewKhel shop={JSON.parse(JSON.stringify(shop))} last={last ? JSON.parse(JSON.stringify(last)) : null} />;
}
