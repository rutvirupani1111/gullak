"use client";
// O5: a Sivakasi tear-off wall calendar. Every number on the sheet, the day page, the Hisaab table and
// the CSV comes from the same stats() response, so they cannot disagree.
import { useState } from "react";
import { rupees } from "@/lib/art";

type Day = { day: string; scans: number; opens: number; plays: number; wins: number; redemptions: number; paise: number; byHour: number[] };
type S = { from: string; to: string; days: Day[]; totals: Omit<Day, "day" | "byHour">; repeatVisitors: number; visitors: number; newVsOld: { day: string; fresh: number; old: number }[] };
type Camp = { id: string; name: string; status: string };
const MONTHS = ["Janvari", "Farvari", "March", "April", "Mai", "Joon", "Julai", "Agast", "Sitambar", "Aktoobar", "Navambar", "Disambar"];
const DOW = ["Som", "Mangal", "Budh", "Guru", "Shukra", "Shani", "Ravi"];
const RIB = ["#D7261E", "#13804F", "#0E8A86", "#E2207B", "#FF7A1A"];

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(Date.parse(d + "T00:00:00Z") + n * 86400000);

export default function CalendarWall({ shopId, slug, today, d: initial, campaigns = [] }: { shopId: string; slug: string; today: string; d: S; campaigns?: Camp[] }) {
  const [d, setD] = useState(initial);
  const [camp, setCamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [tearing, setTearing] = useState(false);
  const [table, setTable] = useState(false);
  const byDay = new Map(d.days.map((x) => [x.day, x]));
  const peak = Math.max(1, ...d.days.map((x) => x.plays));

  async function pick(id: string | null) {
    setCamp(id);
    setLoading(true);
    const r = await fetch(`/api/v1/shops/${shopId}/stats?from=${d.from}&to=${d.to}${id ? `&campaign=${id}` : ""}`);
    if (r.ok) setD(await r.json());
    setLoading(false);
  }
  function tear(day: string) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setOpen(day);
    setTearing(true);
    setTimeout(() => { setOpen(day); setTearing(false); }, 380);
  }

  // five weeks ending this week, Monday first
  const t = new Date(today + "T00:00:00Z");
  const dow = (t.getUTCDay() + 6) % 7;
  const start = addDays(today, -dow - 28);
  const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i));
  const month = MONTHS[t.getUTCMonth()];

  // rush map: 7 weekdays x 24 hours of plays over the last 4 weeks
  const rush = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const x of d.days) {
    if (x.day < addDays(today, -27)) continue;
    const w = (new Date(x.day + "T00:00:00Z").getUTCDay() + 6) % 7;
    x.byHour.forEach((n, h) => (rush[w][h] += n));
  }
  const rushPeak = Math.max(1, ...rush.flat());

  return (
    <main className="wrap" style={{ padding: "18px 16px 80px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "end" }}>
        <h1 className="f-display" style={{ fontSize: "clamp(30px, 7vw, 44px)", margin: 0 }}>Calendar</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className={"plate small " + (table ? "" : "ghost")} aria-pressed={table} onClick={() => setTable(!table)}>Hisaab table</button>
          <a className="plate small ghost" href={`/api/v1/shops/${shopId}/stats.csv?from=${d.from}&to=${d.to}${camp ? `&campaign=${camp}` : ""}`} download={`${slug}-hisaab.csv`}>CSV</a>
        </div>
      </div>

      {/* campaign ribbons hang from the top as bookmark tabs */}
      <div role="radiogroup" aria-label="Khel chuno" style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        {[{ id: null as string | null, name: "Sab khel" }, ...campaigns].map((c, i) => (
          <button key={c.id ?? "all"} role="radio" aria-checked={camp === c.id} onClick={() => pick(c.id)}
            style={{ minHeight: 44, padding: "6px 12px 14px", border: "2px solid var(--ink)", borderTop: 0, cursor: "pointer", fontWeight: 700, color: i === 0 ? "var(--ink)" : "#fff",
              background: i === 0 ? "var(--haldi)" : RIB[(i - 1) % RIB.length], clipPath: "polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)", transform: camp === c.id ? "translateY(6px)" : "none", transition: "transform .3s var(--spring-soft)" }}>
            {c.name}
          </button>
        ))}
      </div>

      {table ? (
        <Hisaab d={d} />
      ) : (
        <div style={{ position: "relative", maxWidth: 640, margin: "22px auto 0" }}>
          {/* the nail and the string */}
          <svg viewBox="0 0 200 40" width="160" height="32" style={{ display: "block", margin: "0 auto -6px" }} aria-hidden="true">
            <path d="M40 38 L100 8 L160 38" stroke="#6E2C17" strokeWidth="2.5" fill="none" />
            <circle cx="100" cy="8" r="6" fill="#8E9B94" stroke="#1C1210" strokeWidth="2.5" />
          </svg>
          <div style={{ border: "3px solid var(--ink)", boxShadow: "6px 8px 0 var(--ink)", background: "#FBF4E2", position: "relative", overflow: "hidden", opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
            {/* printed header plate */}
            <div style={{ background: "var(--press-red)", color: "var(--newsprint)", padding: "12px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "end", borderBottom: "3px solid var(--ink)" }}>
              <span className="f-display truck" style={{ fontSize: 30, ["--sh" as string]: "#F4B400", color: "#F5E9CF" }}>{month}</span>
              <span className="f-serif" style={{ fontWeight: 700 }}>{d.totals.plays.toLocaleString("en-IN")} khel · {d.totals.redemptions} thappe</span>
            </div>
            {open ? (
              <DayPage day={byDay.get(open)} date={open} fresh={d.newVsOld.find((x) => x.day === open)} onBack={() => setOpen(null)} />
            ) : (
              <div style={{ padding: 10, transformOrigin: "0 0", animation: tearing ? "tearOff .38s cubic-bezier(.5,0,.75,0) forwards" : undefined,
                clipPath: tearing ? "polygon(0 0,100% 0,100% 100%,92% 97%,84% 100%,76% 97%,68% 100%,60% 97%,52% 100%,44% 97%,36% 100%,28% 97%,20% 100%,12% 97%,4% 100%,0 97%)" : undefined }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
                  {DOW.map((w) => <div key={w} className="f-serif" style={{ textAlign: "center", fontSize: 12, fontWeight: 700 }}>{w}</div>)}
                  {cells.map((day) => {
                    const x = byDay.get(day);
                    const isToday = day === today;
                    const future = day > today;
                    const r = x ? 1 + 7 * Math.sqrt(x.plays / peak) : 0;
                    return (
                      <button key={day} disabled={future} onClick={() => tear(day)} aria-label={`${day}: ${x?.plays ?? 0} khel`}
                        style={{ aspectRatio: "1", minHeight: 44, border: "1.5px solid #C9B88F", background: "transparent", position: "relative", padding: 0, cursor: future ? "default" : "pointer", opacity: future ? 0.35 : 1 }}>
                        {x && x.plays > 0 && (
                          <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
                            {Array.from({ length: 16 }, (_, k) => <circle key={k} cx={5 + (k % 4) * 10} cy={5 + Math.floor(k / 4) * 10} r={Math.min(4.6, r * 0.6)} fill="#D7261E" opacity=".55" />)}
                          </svg>
                        )}
                        <span className="f-serif" style={{ position: "relative", fontWeight: 700, fontSize: "clamp(14px, 4vw, 20px)", color: "var(--ink)" }}>{Number(day.slice(8))}</span>
                        {isToday && <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} aria-hidden="true"><path d="M20 3 C34 2 39 14 37 23 C35 35 22 39 12 35 C3 31 1 18 6 10 C10 4 18 3 25 5" stroke="#D7261E" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 13, margin: "8px 2px 0" }}>Bindiyaan jitni moti, us din utne khel. Kisi din ko chhuo: panna phatega aur us din ka hisaab dikhega.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <section style={{ marginTop: 34 }}>
        <h2 className="f-serif" style={{ fontSize: 24, margin: "0 0 6px" }}>Rush ka naksha</h2>
        <p style={{ margin: "0 0 10px", fontSize: 14 }}>Pichhle 4 hafte, har din aur har ghante ke khel. Jitna gehra, utni bheed.</p>
        <div style={{ overflowX: "auto", border: "2px solid var(--ink)", background: "#FBF4E2", padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px repeat(24, minmax(11px, 1fr))", gap: 2, minWidth: 330 }}>
            {rush.map((row, w) => (
              <div key={w} style={{ display: "contents" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{DOW[w]}</span>
                {row.map((n, h) => <span key={h} title={`${DOW[w]} ${h}:00, ${n} khel`} style={{ aspectRatio: "1", background: `radial-gradient(circle, #D7261E ${Math.round((n / rushPeak) * 62)}%, transparent ${Math.round((n / rushPeak) * 62) + 4}%)` }} />)}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => <span key={h} style={{ fontSize: 9, textAlign: "center" }}>{h % 6 === 0 ? h : ""}</span>)}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 10, marginTop: 16 }}>
          <Stat n={d.repeatVisitors} l="Pehchaane chehre" s={`${d.visitors} mein se, 2 ya zyada din aaye`} />
          <Stat n={d.totals.wins ? Math.round((d.totals.redemptions / d.totals.wins) * 100) + "%" : "0%"} l="Inaam liye gaye" s={`${d.totals.redemptions} thappe, ${d.totals.wins} jeete`} />
          <Stat n={rupees(d.totals.paise)} l="₹ diye" s="Jeete gaye inaam ki laagat" />
        </div>
      </section>
      <style>{`@keyframes tearOff { to { transform: translate(-30px, 160px) rotate(-14deg); opacity: 0 } }`}</style>
    </main>
  );
}

function Stat({ n, l, s }: { n: string | number; l: string; s: string }) {
  return (
    <div className="kraftp" style={{ padding: 12, boxShadow: "3px 4px 0 var(--ink)" }}>
      <div className="f-serif" style={{ fontSize: 28, fontWeight: 700 }}>{n}</div>
      <b>{l}</b>
      <div style={{ fontSize: 13 }}>{s}</div>
    </div>
  );
}

function DayPage({ day, date, fresh, onBack }: { day?: Day; date: string; fresh?: { fresh: number; old: number }; onBack: () => void }) {
  const x = day ?? { day: date, scans: 0, opens: 0, plays: 0, wins: 0, redemptions: 0, paise: 0, byHour: Array(24).fill(0) };
  const hours = x.byHour.slice(5, 23);
  const peak = Math.max(1, ...hours);
  const steps: [string, number][] = [["Scan", x.scans], ["Dibba khula", x.opens], ["Khel", x.plays], ["Jeete", x.wins], ["Thappe", x.redemptions]];
  const top = Math.max(1, x.scans, x.opens, x.plays);
  const dt = new Date(date + "T00:00:00Z");
  return (
    <div style={{ padding: 14, animation: "rise .4s var(--spring-soft) both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div className="f-serif" style={{ fontSize: 54, fontWeight: 700, lineHeight: 1, color: "var(--press-red)" }}>{dt.getUTCDate()}</div>
          <div className="f-serif" style={{ fontWeight: 700 }}>{MONTHS[dt.getUTCMonth()]}, {DOW[(dt.getUTCDay() + 6) % 7]}</div>
        </div>
        <button className="plate small" onClick={onBack}>Calendar par wapas</button>
      </div>

      <h3 className="f-serif" style={{ margin: "16px 0 6px" }}>Bheed ka samay</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(18, minmax(0, 1fr))", gap: 2, alignItems: "end" }}>
        {hours.map((n, i) => (
          <div key={i} style={{ display: "grid", justifyItems: "center" }}>
            <svg viewBox="0 0 20 34" width="100%" style={{ maxWidth: 26 }} aria-label={`${i + 5}:00, ${n} khel`} role="img">
              <clipPath id={`g${i}`}><path d="M2 2 h16 l-2 30 h-12z" /></clipPath>
              <rect x="0" y={32 - 30 * (n / peak)} width="20" height={30 * (n / peak)} fill="#B9502B" clipPath={`url(#g${i})`} />
              <path d="M2 2 h16 l-2 30 h-12z" fill="none" stroke="#1C1210" strokeWidth="1.5" />
            </svg>
            <span className="f-mono" style={{ fontSize: 9 }}>{n}</span>
            <span style={{ fontSize: 9 }}>{(i + 5) % 12 || 12}</span>
          </div>
        ))}
      </div>

      <h3 className="f-serif" style={{ margin: "18px 0 6px" }}>Tilli se tilli</h3>
      <div style={{ display: "grid", gap: 6 }}>
        {steps.map(([l, n], i) => (
          <div key={l} style={{ display: "grid", gridTemplateColumns: "96px 1fr auto", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{l}</span>
            <svg viewBox="0 0 200 12" width="100%" height="12" preserveAspectRatio="none" aria-hidden="true">
              <rect x="0" y="3" width={Math.max(2, 190 * (n / top))} height="6" fill="#E2CDA2" stroke="#1C1210" strokeWidth="1" />
              <ellipse cx={Math.max(4, 190 * (n / top))} cy="6" rx="5" ry="5.5" fill="#D7261E" stroke="#1C1210" strokeWidth="1" />
            </svg>
            <span className="f-mono" style={{ fontWeight: 700, minWidth: 64, textAlign: "right" }}>{n}{i > 0 && steps[i - 1][1] ? <small style={{ fontWeight: 400 }}> {Math.round((n / steps[i - 1][1]) * 100)}%</small> : null}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <Stat n={`${fresh?.fresh ?? 0} / ${fresh?.old ?? 0}`} l="Naye / purane" s="Us din pehli baar vs pehle bhi aaye" />
        <Stat n={rupees(x.paise)} l="₹ diye" s={`${x.wins} inaam`} />
      </div>
    </div>
  );
}

function Hisaab({ d }: { d: S }) {
  const rows = [...d.days].reverse();
  return (
    <div style={{ overflowX: "auto", marginTop: 18 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520, background: "#FBF4E2", border: "2px solid var(--ink)" }}>
        <thead><tr>{["Din", "Scan", "Dibba khula", "Khel", "Jeete", "Thappe", "₹ diye"].map((h) => <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "2px solid var(--ink)", fontSize: 14 }}>{h}</th>)}</tr></thead>
        <tbody>
          <tr style={{ fontWeight: 800, background: "#F4E1B0" }}><td style={{ padding: 8 }}>Kul</td><td>{d.totals.scans}</td><td>{d.totals.opens}</td><td>{d.totals.plays}</td><td>{d.totals.wins}</td><td>{d.totals.redemptions}</td><td>{rupees(d.totals.paise)}</td></tr>
          {rows.map((r) => (
            <tr key={r.day} className="f-mono" style={{ borderTop: "1px solid #C9B88F" }}>
              <td style={{ padding: 8 }}>{r.day}</td><td>{r.scans}</td><td>{r.opens}</td><td>{r.plays}</td><td>{r.wins}</td><td>{r.redemptions}</td><td>{rupees(r.paise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
