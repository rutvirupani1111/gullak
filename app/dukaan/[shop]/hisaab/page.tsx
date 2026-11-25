import { ownerShop } from "@/lib/session";
import { withShop } from "@/lib/db";
import { stats } from "@/lib/server/stats";
import CalendarWall from "@/components/owner/CalendarWall";
export const metadata = { title: "Calendar: Gullak" };
export default async function Page({ params }: { params: Promise<{ shop: string }> }) {
  const s = await ownerShop((await params).shop);
  const now = new Date(Date.now() + 330 * 60000);
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 34 * 86400000).toISOString().slice(0, 10);
  const [d, campaigns] = await Promise.all([
    stats(s.id, from, to),
    withShop(s.id, (q) => q.query("select id, name, status from campaigns where shop_id = $1 order by starts_at desc", [s.id])),
  ]);
  return <CalendarWall shopId={s.id} slug={s.slug} today={to} d={JSON.parse(JSON.stringify(d))} campaigns={JSON.parse(JSON.stringify(campaigns))} />;
}
