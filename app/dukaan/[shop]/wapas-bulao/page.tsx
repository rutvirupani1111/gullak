import { ownerShop } from "@/lib/session";
import { withShop } from "@/lib/db";
import { decPhone } from "@/lib/crypto";
import Thaila from "@/components/owner/Thaila";
export default async function Page({ params, searchParams }: { params: Promise<{ shop: string }>; searchParams: Promise<Record<string, string>> }) {
  const s = await ownerShop((await params).shop);
  const days = Math.max(1, Math.min(365, Number((await searchParams).days ?? 7) || 7));
  const rows = await withShop(s.id, (q) =>
    q.query(
      `select c.id, c.first_name, c.phone_enc, c.last_sent_at, v.last_day, v.n,
              (select p.label_hi from coupons co join prizes p on p.id = co.prize_id where co.device_id = c.device_id and co.shop_id = c.shop_id order by co.issued_at desc limit 1) last_prize
       from customers c join lateral (select max(day) last_day, count(*)::int n from visits where shop_id = c.shop_id and device_id = c.device_id) v on true
       where c.shop_id = $1 and c.wa_opt_in and c.deleted_at is null and c.phone_enc is not null and (v.last_day is null or v.last_day < (now() + interval '330 minutes')::date - $2::int)
       order by (c.last_sent_at > now() - interval '7 days') nulls first, v.last_day desc nulls last limit 20`,
      [s.id, days],
    ),
  );
  const list = rows.map((r) => {
    const ph = decPhone(r.phone_enc);
    return { id: r.id, name: r.first_name, masked: `+91 ${ph.slice(3, 5)}•••••${ph.slice(-3)}`, lastDay: r.last_day, visits: r.n, lastPrize: r.last_prize, sentAt: r.last_sent_at };
  });
  return <Thaila shopId={s.id} days={days} list={JSON.parse(JSON.stringify(list))} demo={s.is_demo} />;
}
