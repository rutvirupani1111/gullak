import { ownerShop } from "@/lib/session";
import { withShop } from "@/lib/db";
import StaffHooks from "@/components/owner/StaffHooks";
export default async function Page({ params }: { params: Promise<{ shop: string }> }) {
  const s = await ownerShop((await params).shop);
  const staff = await withShop(s.id, (q) => q.query("select st.id, st.name, st.active, st.locked_until, (select count(*)::int from redemptions r where r.staff_id = st.id and r.undone_at is null and r.created_at > now() - interval '1 day') today from staff st where shop_id = $1 order by created_at", [s.id]));
  return <StaffHooks shopId={s.id} slug={s.slug} initial={JSON.parse(JSON.stringify(staff))} />;
}
