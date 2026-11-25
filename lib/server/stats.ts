import "server-only";
import { withShop } from "../db";

// One source for every count on the calendar, the Hisaab table and the CSV.
// Closed hours come from shop_hourly_stats (rolled up lazily here, on read); the open tail comes from events.
export type DayRow = { day: string; scans: number; opens: number; plays: number; wins: number; redemptions: number; paise: number };

export async function rollup(shopId: string) {
  await withShop(shopId, async (q) => {
    const s = await q.one<{ w: string }>("select stats_watermark as w from shops where id = $1 for update", [shopId]);
    if (!s) return;
    await q.query(
      `insert into shop_hourly_stats (shop_id, campaign_id, hour, scans, opens, plays, wins, redemptions, paise_given)
       select shop_id, coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'), date_trunc('hour', created_at),
              count(*) filter (where kind = 'scan'), count(*) filter (where kind = 'open'), count(*) filter (where kind = 'play'),
              count(*) filter (where kind = 'win'), count(*) filter (where kind = 'redeem') - count(*) filter (where kind = 'undo'),
              coalesce(sum(paise) filter (where kind = 'win'), 0)
       from events where shop_id = $1 and created_at >= $2 and created_at < date_trunc('hour', now())
       group by 1, 2, 3
       on conflict (shop_id, campaign_id, hour) do update set scans = shop_hourly_stats.scans + excluded.scans,
         opens = shop_hourly_stats.opens + excluded.opens, plays = shop_hourly_stats.plays + excluded.plays,
         wins = shop_hourly_stats.wins + excluded.wins, redemptions = shop_hourly_stats.redemptions + excluded.redemptions,
         paise_given = shop_hourly_stats.paise_given + excluded.paise_given`,
      [shopId, s.w],
    );
    await q.query("update shops set stats_watermark = greatest(stats_watermark, date_trunc('hour', now())) where id = $1", [shopId]);
  });
}

export async function stats(shopId: string, from: string, to: string, campaignId?: string | null) {
  await rollup(shopId);
  return withShop(shopId, async (q) => {
    const cFilter = campaignId ? "and campaign_id = $4" : "";
    const params: unknown[] = [shopId, from, to];
    if (campaignId) params.push(campaignId);
    const hours = await q.query<{ h: string; scans: number; opens: number; plays: number; wins: number; redemptions: number; paise: number }>(
      `select h, sum(scans)::int scans, sum(opens)::int opens, sum(plays)::int plays, sum(wins)::int wins, sum(redemptions)::int redemptions, sum(paise)::int paise from (
         select hour h, scans, opens, plays, wins, redemptions, paise_given paise from shop_hourly_stats
          where shop_id = $1 and hour >= $2::date - interval '330 minutes' and hour < $3::date + interval '1 day' - interval '330 minutes' ${cFilter}
         union all
         select date_trunc('hour', created_at), (kind='scan')::int, (kind='open')::int, (kind='play')::int, (kind='win')::int,
                (kind='redeem')::int - (kind='undo')::int, case when kind='win' then paise else 0 end
           from events, shops sh where sh.id = $1 and events.shop_id = $1 and created_at >= sh.stats_watermark
            and created_at >= $2::date - interval '330 minutes' and created_at < $3::date + interval '1 day' - interval '330 minutes' ${cFilter}
       ) x group by h order by h`,
      params,
    );
    const days = new Map<string, DayRow & { byHour: number[] }>();
    for (const r of hours) {
      const local = new Date(new Date(r.h).getTime() + 330 * 60000);
      const day = local.toISOString().slice(0, 10);
      const d = days.get(day) ?? { day, scans: 0, opens: 0, plays: 0, wins: 0, redemptions: 0, paise: 0, byHour: Array(24).fill(0) };
      d.scans += r.scans; d.opens += r.opens; d.plays += r.plays; d.wins += r.wins; d.redemptions += r.redemptions; d.paise += r.paise;
      d.byHour[local.getUTCHours()] += r.plays;
      days.set(day, d);
    }
    const repeat = await q.one<{ n: number; total: number }>(
      `select count(*) filter (where nd >= 2)::int n, count(*)::int total from (
         select device_id, count(distinct day) nd, bool_or(day between $2::date and $3::date) inr from visits where shop_id = $1 group by device_id) v where inr`,
      [shopId, from, to],
    );
    const newVsOld = await q.query<{ day: string; fresh: number; old: number }>(
      `select v.day::text, count(*) filter (where f.first = v.day)::int fresh, count(*) filter (where f.first < v.day)::int old
       from visits v join (select device_id, min(day) first from visits where shop_id = $1 group by device_id) f using (device_id)
       where v.shop_id = $1 and v.day between $2::date and $3::date group by v.day`,
      [shopId, from, to],
    );
    const list = [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
    const totals = list.reduce((a, d) => ({ scans: a.scans + d.scans, opens: a.opens + d.opens, plays: a.plays + d.plays, wins: a.wins + d.wins, redemptions: a.redemptions + d.redemptions, paise: a.paise + d.paise }), { scans: 0, opens: 0, plays: 0, wins: 0, redemptions: 0, paise: 0 });
    return { from, to, days: list, totals, repeatVisitors: repeat?.n ?? 0, visitors: repeat?.total ?? 0, newVsOld };
  });
}

export function toCsv(s: Awaited<ReturnType<typeof stats>>) {
  const head = "day,scans,boxes_opened,plays,wins,redeemed,rupees_given";
  return [head, ...s.days.map((d) => [d.day, d.scans, d.opens, d.plays, d.wins, d.redemptions, (d.paise / 100).toFixed(0)].join(","))].join("\n") + "\n";
}
