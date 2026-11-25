// Shop-local time. Every shop in v1 is Asia/Kolkata (UTC+05:30, no daylight saving), so the
// arithmetic is exact without a tz database.
const OFFSET = 330 * 60 * 1000;

export function localParts(d = new Date()) {
  const l = new Date(d.getTime() + OFFSET);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate(), dow: l.getUTCDay(), minute: l.getUTCHours() * 60 + l.getUTCMinutes(), hour: l.getUTCHours() };
}
export function localDay(d = new Date()) {
  const p = localParts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
export function isoWeek(d = new Date()) {
  const l = new Date(d.getTime() + OFFSET);
  const t = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`;
}
export function periodBucket(period: string, d = new Date()) {
  return period === "week" ? isoWeek(d) : period === "campaign" ? "all" : localDay(d);
}
/** Next local midnight for a daily period, next Monday 00:00 for a weekly one. */
export function nextPlayAt(period: string, endsAt: Date, d = new Date()): string {
  if (period === "campaign") return endsAt.toISOString();
  const p = localParts(d);
  const midnightLocal = Date.UTC(p.y, p.m, p.d + 1) - OFFSET;
  if (period === "day") return new Date(midnightLocal).toISOString();
  const daysToMon = ((8 - p.dow) % 7) || 7;
  return new Date(Date.UTC(p.y, p.m, p.d + daysToMon) - OFFSET).toISOString();
}
export function minuteLabel(m: number) {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h12 = h % 12 || 12;
  return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`;
}
export function timeLabel(iso: string | Date) {
  const p = localParts(new Date(iso));
  return minuteLabel(p.minute);
}
