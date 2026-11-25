import { notFound } from "next/navigation";
import { ownerShop } from "@/lib/session";
import { withShop } from "@/lib/db";
import Almirah from "@/components/owner/Almirah";

export default async function Page({ params }: { params: Promise<{ shop: string; campaign: string }> }) {
  const p = await params;
  const s = await ownerShop(p.shop);
  const d = await withShop(s.id, async (q) => {
    const c = await q.one("select id, name, title_hi, title_en, status, game, starts_at, ends_at, open_minute, close_minute, play_period, daily_budget_paise, live_qr_required, strict_skill, version from campaigns where id = $1", [p.campaign]);
    if (!c) return null;
    const prizes = await q.query("select id, label_hi, label_en, kind, cost_paise, weight, tier, total_stock, remaining, daily_cap, active, version from prizes where campaign_id = $1 and active order by sort, id", [c.id]);
    const med = await q.one<{ m: number | null }>("select percentile_cont(.5) within group (order by plays) m from campaign_daily where campaign_id = $1 and day > now() - interval '14 days'", [c.id]);
    const hist = await q.one<{ m: number | null }>("select percentile_cont(.5) within group (order by p) m from (select date_trunc('day', hour) d, sum(plays) p from shop_hourly_stats where shop_id = $1 and hour > now() - interval '14 days' group by 1) x", [s.id]);
    return { c, prizes, perDay: Number(med?.m ?? hist?.m ?? 0) || 0 };
  });
  if (!d) notFound();
  return <Almirah slug={s.slug} d={JSON.parse(JSON.stringify(d))} />;
}
