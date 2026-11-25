"use client";
// O2: the steel almirah of prize jars, with the brass tarazu on top and the live chakri editor beside it.
// Every change shows at once, is sent debounced with If-Match, and can be taken back for 6 seconds.
import { useEffect, useMemo, useRef, useState } from "react";
import { api, Help } from "./Small";
import { GameProp } from "./GameProp";
import { rupees } from "@/lib/art";
import { minuteLabel } from "@/lib/time";

type Prize = { id: string; label_hi: string; label_en: string; kind: string; cost_paise: number; weight: number; tier: number; total_stock: number | null; remaining: number | null; daily_cap: number | null; active: boolean; version: number };
type Camp = { id: string; name: string; title_hi: string | null; title_en: string | null; status: string; game: string; starts_at: string; ends_at: string; open_minute: number; close_minute: number; play_period: string; daily_budget_paise: number; live_qr_required: boolean; strict_skill: boolean; version: number };
type D = { c: Camp; prizes: Prize[]; perDay: number };

const COLS = ["#F4B400", "#D7261E", "#13804F", "#E2207B", "#0E8A86", "#FF7A1A", "#B9502B", "#F5E9CF"];
const SNAP = 50; // 0.5 percent in basis points
const GAMES: [string, string, string][] = [["chakri", "Chakri", "Ghoomti chakri, asli odds dikhti hain"], ["patti", "Lottery patti", "Ghiso aur dekho"], ["toss", "Gullak toss", "Hunar ka khel: sikka gullak mein"]];
const isFloor = (p: Prize) => p.kind === "consolation" || p.kind === "none";

function oneIn(pct: number) {
  if (pct <= 0) return null;
  const n = Math.round(100 / pct);
  return n.toLocaleString("en-IN");
}
function every(days: number) {
  if (!isFinite(days)) return "";
  if (days < 1) return `din mein lagbhag ${Math.max(1, Math.round(1 / days))} baar`;
  if (days < 14) return `lagbhag har ${Math.round(days)} din mein ek baar`;
  if (days < 120) return `lagbhag har ${Math.round(days / 7)} hafte mein ek baar`;
  return `lagbhag har ${Math.round(days / 30)} mahine mein ek baar`;
}

export default function Almirah({ slug, d }: { slug: string; d: D }) {
  const [c, setC] = useState(d.c);
  const [prizes, setPrizes] = useState(d.prizes);
  const [version, setVersion] = useState(d.c.version);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [conflict, setConflict] = useState<{ mine: Prize[]; theirs: { id: string; weight: number }[] } | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const versionRef = useRef(version);
  versionRef.current = version;
  const prizesRef = useRef(prizes);
  prizesRef.current = prizes;
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const before = useRef<{ id: string; weight: number }[] | null>(null);

  const perDay = d.perDay > 0 ? d.perDay : 60;
  const guessed = !(d.perDay > 0);
  const total = prizes.reduce((a, p) => a + p.weight, 0) || 1;
  const pct = (p: Prize) => (p.weight / total) * 100;
  const daysLeft = Math.max(0, (new Date(c.ends_at).getTime() - Date.now()) / 86400000);
  const costPer100 = prizes.reduce((a, p) => a + (p.weight / total) * p.cost_paise, 0) * 100;
  const budgetPer100 = c.daily_budget_paise > 0 ? (c.daily_budget_paise / perDay) * 100 : Infinity;
  const beam = isFinite(budgetPer100) ? Math.max(-14, Math.min(14, ((costPer100 - budgetPer100) / budgetPer100) * 12)) : -6;
  const dayRun = (p: Prize) => (p.remaining === null || p.weight === 0 ? Infinity : p.remaining / ((p.weight / total) * perDay));
  const stockDays = Math.min(...prizes.map(dayRun));
  const overBudget = costPer100 > budgetPer100;

  function flash(text: string, undo?: () => void) {
    setToast({ text, undo });
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 6000);
  }

  async function sendWeights(list: { id: string; weight: number }[], prev: { id: string; weight: number }[] | null, quiet = false) {
    const r = await api(`/api/v1/campaigns/${c.id}/weights`, "PATCH", { weights: list }, { "If-Match": String(versionRef.current) });
    if (r.ok) {
      setVersion(r.d.version);
      // the server bumps each prize row's version with its weight
      setPrizes((ps) => ps.map((p) => (list.some((x) => x.id === p.id) ? { ...p, version: p.version + 1 } : p)));
      if (!quiet && prev) flash("Badla. Wapas lo?", () => {
        setPrizes((ps) => ps.map((p) => ({ ...p, weight: prev.find((x) => x.id === p.id)?.weight ?? p.weight })));
        sendWeights(prev, null, true).then(() => flash("Pehle jaisa kar diya."));
      });
    } else if (r.status === 409) {
      setConflict({ mine: prizes, theirs: r.d.current });
      setVersion(r.d.version ?? versionRef.current);
    } else flash(r.d.message_hi || "Save nahi hua.");
  }

  /** Optimistic: the jar and wheel move now, the server hears 400 ms after the last change. */
  function setWeights(next: Prize[]) {
    if (!before.current) before.current = prizes.map((p) => ({ id: p.id, weight: p.weight }));
    setPrizes(next);
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      const prev = before.current;
      before.current = null;
      sendWeights(next.map((p) => ({ id: p.id, weight: p.weight })), prev);
    }, 400);
  }

  /** Moves weight between prize i and prize j, keeping the total at exactly 10,000. */
  function shift(i: number, j: number, delta: number) {
    const a = prizes[i], b = prizes[j];
    const d2 = Math.max(-a.weight, Math.min(b.weight, delta));
    if (!d2) return;
    setWeights(prizes.map((p, k) => (k === i ? { ...p, weight: p.weight + d2 } : k === j ? { ...p, weight: p.weight - d2 } : p)));
  }
  const floorIdx = prizes.findIndex(isFloor);

  async function patchPrize(p: Prize, patch: Partial<Prize>, label: string) {
    const prev = p;
    setPrizes((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    const r = await api(`/api/v1/prizes/${p.id}`, "PATCH", patch, { "If-Match": String(p.version) });
    if (!r.ok) {
      setPrizes((ps) => ps.map((x) => (x.id === p.id ? (r.d.current ? { ...x, ...r.d.current } : prev) : x)));
      return flash(r.status === 409 ? "Kisi aur ne badla. Naya maal dikha diya." : r.d.message_hi);
    }
    setPrizes((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...r.d } : x)));
    flash(label, async () => {
      const back = await api(`/api/v1/prizes/${p.id}`, "PATCH", { remaining: prev.remaining, total_stock: prev.total_stock }, { "If-Match": String(r.d.version) });
      if (back.ok) setPrizes((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...back.d } : x)));
    });
  }
  const stockT = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const stockFrom = useRef<Record<string, Prize>>({});
  function stepStock(p: Prize, by: number) {
    if (p.remaining === null) return;
    const remaining = Math.max(0, p.remaining + by);
    const total_stock = Math.max(p.total_stock ?? 0, remaining);
    const cur = prizes.find((x) => x.id === p.id)!;
    setPrizes((ps) => ps.map((x) => (x.id === p.id ? { ...x, remaining, total_stock } : x)));
    clearTimeout(stockT.current[p.id]);
    const first = stockFrom.current[p.id] ?? cur;
    stockFrom.current[p.id] = first;
    stockT.current[p.id] = setTimeout(() => {
      delete stockFrom.current[p.id];
      const live = prizesRef.current.find((x) => x.id === p.id)!;
      patchPrize({ ...first, version: live.version }, { remaining, total_stock }, `${p.label_hi}: ${remaining} bache. Wapas lo?`);
    }, 500);
  }

  async function pausePrize(p: Prize) {
    if (floorIdx < 0 || isFloor(p)) return;
    const i = prizes.indexOf(p);
    const moved = prizes.map((x, k) => (k === i ? { ...x, weight: 0 } : k === floorIdx ? { ...x, weight: x.weight + p.weight } : x));
    await sendWeights(moved.map((x) => ({ id: x.id, weight: x.weight })), null, true);
    const r = await api(`/api/v1/prizes/${p.id}`, "PATCH", { active: false }, { "If-Match": String(p.version + 1) });
    if (r.ok || r.status === 409) setPrizes(moved.filter((x) => x.id !== p.id));
    flash(`${p.label_hi} almirah se hata. Uske odds 'agli baar' wale ko mile.`);
  }

  async function saveCamp(patch: Partial<Camp>) {
    const prev = c;
    setC({ ...c, ...patch });
    const r = await api(`/api/v1/campaigns/${c.id}`, "PATCH", patch, { "If-Match": String(versionRef.current) });
    if (!r.ok) {
      setC(prev);
      return flash(r.status === 409 ? "Kisi aur ne badla. Panna dobara kholo." : r.d.message_hi);
    }
    setVersion(r.d.version);
    flash("Badla. Wapas lo?", async () => {
      const keys = Object.keys(patch) as (keyof Camp)[];
      const back = Object.fromEntries(keys.map((k) => [k, prev[k]]));
      setC((x) => ({ ...x, ...back }));
      const b = await api(`/api/v1/campaigns/${c.id}`, "PATCH", back, { "If-Match": String(r.d.version) });
      if (b.ok) setVersion(b.d.version);
    });
  }
  async function status(action: "publish" | "pause" | "end") {
    const r = await api(`/api/v1/campaigns/${c.id}/status`, "POST", { action });
    if (!r.ok) return flash(r.d.message_hi);
    setC({ ...c, status: action === "publish" ? "live" : action === "pause" ? "paused" : "ended" });
    setVersion((v) => v + 1);
    flash(action === "publish" ? "Khel chalu. Grahak ab yahi khel dekhenge." : action === "pause" ? "Khel ruk gaya." : "Khel khatam.");
  }

  return (
    <main className="wrap" style={{ padding: "18px 16px 120px" }}>
      <a href={`/dukaan/${slug}`} style={{ fontWeight: 700, display: "inline-block", padding: "10px 0" }}>Ghar par wapas</a>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", justifyContent: "space-between" }}>
        <div>
          <h1 className="f-display" style={{ fontSize: "clamp(30px, 7vw, 44px)", margin: 0, lineHeight: 1.05 }}>{c.name}</h1>
          <p className="f-serif" style={{ margin: "4px 0 0", fontWeight: 500 }}>Inaam aur odds · <b style={{ color: c.status === "live" ? "var(--paan)" : "var(--clay-deep)" }}>{({ live: "Chalu", paused: "Ruka", draft: "Kaccha", ended: "Khatam" } as Record<string, string>)[c.status]}</b></p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {c.status !== "live" && c.status !== "ended" && <button className="plate paan" onClick={() => status("publish")}>Chalu karo</button>}
          {c.status === "live" && <button className="plate ghost" onClick={() => status("pause")}>Roko</button>}
          {c.status !== "ended" && <button className="plate ghost" onClick={() => confirm("Khel hamesha ke liye khatam karein?") && status("end")}>Khatam</button>}
        </div>
      </div>

      {conflict && (
        <div className="paper" role="alert" style={{ padding: 14, marginTop: 14, borderColor: "var(--press-red)" }}>
          <b>Kisi aur ne badla.</b> Aapke odds aur unke odds:
          <ul style={{ margin: "8px 0" }}>
            {conflict.mine.map((p) => {
              const t = conflict.theirs.find((x) => x.id === p.id);
              return <li key={p.id}>{p.label_hi}: aapka {(p.weight / 100).toFixed(1)}%, unka {((t?.weight ?? 0) / 100).toFixed(1)}%</li>;
            })}
          </ul>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="plate small" onClick={() => { setPrizes(prizes.map((p) => ({ ...p, weight: conflict.theirs.find((x) => x.id === p.id)?.weight ?? p.weight }))); setConflict(null); }}>Unka rakho</button>
            <button className="plate small red" onClick={() => { const mine = conflict.mine; setConflict(null); sendWeights(mine.map((p) => ({ id: p.id, weight: p.weight })), null); }}>Mera lagao</button>
          </div>
        </div>
      )}

      <Help hi={<>Har jar ek inaam hai, aur uske andar ka rang bacha hua stock. <b>+ / −</b> se stock badlo, chakri ke gol button khiskao ya <b>+ / −</b> se odds badlo. Har badlav turant save hota hai; galti ho to neeche <b>Wapas lo</b> dabao. Tarazu batata hai 100 khel par kitna kharch, aur stock kitne din chalega.</>}
        en={<>Each jar is a prize; its fill is the stock left. Change stock with + and −, and odds by dragging the round handles or with + and −. Every change saves at once; press Wapas lo (undo) to take it back. The scale shows the cost per 100 games and how many days the stock lasts.</>} />

      {/* the tarazu: rupees per 100 plays against how many days the stock lasts */}
      <Tarazu beam={beam} cost={costPer100} budget={budgetPer100} days={stockDays} overBudget={overBudget} guessed={guessed} perDay={perDay} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 26, marginTop: 18, alignItems: "start" }}>
        {/* the steel almirah */}
        <section aria-label="Almirah" style={{ background: "linear-gradient(90deg,#7d8a83,#9AA7A0 30%,#8E9B94 70%,#6f7c75)", border: "3px solid var(--ink)", boxShadow: "6px 7px 0 var(--ink)", padding: "14px 12px 10px", position: "relative" }}>
          <div style={{ position: "absolute", left: "50%", top: 10, bottom: 10, width: 2, background: "rgba(28,18,16,.35)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "18px 12px" }}>
            {prizes.map((p, i) => {
              const fill = p.remaining === null ? 1 : p.total_stock ? p.remaining / p.total_stock : 0;
              const warn = p.remaining !== null && dayRun(p) < daysLeft;
              return (
                <div key={p.id} style={{ display: "grid", justifyItems: "center", gap: 4, paddingBottom: 8, borderBottom: "6px solid #5d6862", position: "relative", zIndex: 1 }}>
                  <button onClick={() => setLifted(lifted === p.id ? null : p.id)} aria-label={`${p.label_hi}: ${p.remaining ?? "bina hadd"} bache`} aria-pressed={lifted === p.id}
                    style={{ background: "none", border: 0, padding: 0, cursor: "pointer", animation: warn ? "jarShake .3s ease-in-out 3" : undefined, transform: lifted === p.id ? "translateY(-8px)" : "none", transition: "transform .4s var(--spring-soft)" }}>
                    <Jar fill={fill} color={COLS[i % COLS.length]} infinite={p.remaining === null} />
                  </button>
                  <b className="f-chalk" style={{ fontSize: 17, textAlign: "center", lineHeight: 1.1, minHeight: 38, display: "grid", placeItems: "center" }}>{p.label_hi}</b>
                  {p.remaining !== null ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button className="plate small ghost" aria-label="Ek kam" onClick={() => stepStock(p, -1)} style={{ width: 44, padding: 0 }}>−</button>
                      <span className="f-mono" style={{ minWidth: 34, textAlign: "center", fontWeight: 700 }}>{p.remaining}</span>
                      <button className="plate small ghost" aria-label="Ek zyada" onClick={() => stepStock(p, 1)} style={{ width: 44, padding: 0 }}>+</button>
                    </div>
                  ) : <span style={{ fontSize: 13, fontWeight: 700 }}>Hamesha rehta hai</span>}
                </div>
              );
            })}
          </div>
          <button className="plate small" style={{ marginTop: 14, width: "100%" }} onClick={() => setAdding(!adding)}>{adding ? "Rehne do" : "Naya jar rakho"}</button>
          {adding && <AddJar cid={c.id} onAdded={(p) => { setPrizes([...prizes, p]); setAdding(false); flash(`${p.label_hi} almirah mein. Odds 0% se shuru, chakri par khiskao.`); }} />}
        </section>

        {/* live chakri editor */}
        <section aria-label="Chakri ke odds">
          <WheelEditor prizes={prizes} total={total} shift={shift} />
          <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gap: 10 }}>
            {prizes.map((p, i) => {
              const pc = pct(p);
              const days = 1 / ((pc / 100) * perDay);
              const run = dayRun(p);
              const warn = p.remaining !== null && run < daysLeft;
              return (
                <li key={p.id} className="kraftp" style={{ padding: "10px 12px", borderLeft: `10px solid ${COLS[i % COLS.length]}`, outline: lifted === p.id ? "3px solid var(--haldi)" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ flex: "1 1 120px" }}>{p.label_hi}</b>
                    <span className="f-mono" style={{ fontWeight: 700, fontSize: 18 }}>{pc.toFixed(1)}%</span>
                    {!isFloor(p) && floorIdx >= 0 && (
                      <span style={{ display: "flex", gap: 4 }}>
                        <button className="plate small ghost" style={{ width: 44, padding: 0 }} aria-label={`${p.label_hi} ke odds 0.5% kam`} onClick={() => shift(i, floorIdx, -SNAP)}>−</button>
                        <button className="plate small ghost" style={{ width: 44, padding: 0 }} aria-label={`${p.label_hi} ke odds 0.5% zyada`} onClick={() => shift(i, floorIdx, SNAP)}>+</button>
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 14 }}>
                    {pc > 0 ? <>1 in {oneIn(pc)} khel. Aapki bheed par {every(days)}.</> : "Abhi 0%: yeh inaam nahi niklega."}
                    {p.cost_paise > 0 && <> Har baar {rupees(p.cost_paise)} ka.</>}
                  </p>
                  {warn && <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800, color: "var(--press-red)" }}>Yeh {Math.max(1, Math.round(run))} din mein khatam ho jayega, campaign {Math.round(daysLeft)} din aur hai.</p>}
                  {!isFloor(p) && <button onClick={() => pausePrize(p)} style={{ background: "none", border: 0, padding: "8px 0 0", minHeight: 44, textDecoration: "underline", cursor: "pointer", color: "var(--clay-deep)", fontWeight: 600 }}>Almirah se hatao</button>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* campaign settings: game cart, hours, period, budget, guards */}
      <section style={{ marginTop: 34 }}>
        <h2 className="f-serif" style={{ fontSize: 26, margin: "0 0 4px" }}>Kaunsa khel? <span style={{ fontSize: 15, fontWeight: 500 }}>Which game</span></h2>
        <p style={{ margin: "0 0 10px", fontSize: 14 }}>Grahak ko yahi khel dikhega. Nateeja har khel mein server hi tay karta hai.</p>
        <div role="radiogroup" aria-label="Khel chuno" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
          {GAMES.map(([g, t, s]) => (
            <button key={g} role="radio" aria-checked={c.game === g} onClick={() => c.game !== g && saveCamp({ game: g })} className="kraftp"
              style={{ padding: 12, textAlign: "left", cursor: "pointer", boxShadow: c.game === g ? "0 0 0 4px var(--haldi), 5px 6px 0 var(--ink)" : "3px 4px 0 var(--ink)", transform: c.game === g ? "translateY(-4px)" : "none", transition: "transform .4s var(--spring-soft)" }}>
              <GameProp game={g} size={80} />
              <b className="f-display" style={{ fontSize: 20, display: "block" }}>{t}</b>
              <span style={{ fontSize: 14 }}>{s}</span>
            </button>
          ))}
        </div>
        <div className="paper" style={{ padding: 16, marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
          <label className="field">Khulne ka samay
            <select value={c.open_minute} onChange={(e) => saveCamp({ open_minute: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h * 60}>{minuteLabel(h * 60)}</option>)}</select>
          </label>
          <label className="field">Band hone ka samay
            <select value={c.close_minute} onChange={(e) => saveCamp({ close_minute: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={(h + 1) * 60}>{h === 23 ? "Raat 12 baje" : minuteLabel((h + 1) * 60)}</option>)}</select>
          </label>
          <label className="field">Kitni baar khel sakte hain
            <select value={c.play_period} onChange={(e) => saveCamp({ play_period: e.target.value })}><option value="day">Roz ek baar</option><option value="week">Hafte mein ek baar</option><option value="campaign">Poore khel mein ek baar</option></select>
          </label>
          <BudgetField paise={c.daily_budget_paise} onSave={(v) => saveCamp({ daily_budget_paise: v })} />
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600, minHeight: 44 }}>
            <input type="checkbox" checked={c.live_qr_required} onChange={(e) => saveCamp({ live_qr_required: e.target.checked })} style={{ width: 24, height: 24 }} />
            Live QR zaroori (poster ki photo se khel nahi)
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600, minHeight: 44 }}>
            <input type="checkbox" checked={c.strict_skill} onChange={(e) => saveCamp({ strict_skill: e.target.checked })} style={{ width: 24, height: 24 }} />
            Sirf hunar ka khel (gullak toss)
          </label>
        </div>
        <p style={{ fontSize: 14 }}><a className="tap" href={`/s/${slug}/niyam`}>Niyam ka panna dekho</a>: yeh odds aur stock apne aap wahan chhapte hain.</p>
      </section>

      {toast && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 60, maxWidth: 520, margin: "0 auto", background: "var(--ink)", color: "var(--newsprint)", border: "2px solid var(--haldi)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, animation: "rise .35s var(--spring-soft) both" }}>
          <span style={{ flex: 1 }}>{toast.text}</span>
          {toast.undo && <button className="plate small" onClick={() => { toast.undo!(); setToast(null); }}>Wapas lo</button>}
        </div>
      )}
    </main>
  );
}

function BudgetField({ paise, onSave }: { paise: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(Math.round(paise / 100)));
  useEffect(() => setV(String(Math.round(paise / 100))), [paise]);
  return (
    <label className="field">Roz ka inaam budget (₹)
      <input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} onBlur={() => { const n = Number(v) * 100; if (n !== paise) onSave(n); }} />
    </label>
  );
}

function Jar({ fill, color, infinite }: { fill: number; color: string; infinite: boolean }) {
  const h = 70 * Math.max(0, Math.min(1, fill));
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" aria-hidden="true">
      <rect x="22" y="4" width="36" height="10" fill="#6E2C17" stroke="#1C1210" strokeWidth="2.5" />
      <path d="M16 18 h48 q6 0 6 8 v62 q0 8 -8 8 h-44 q-8 0 -8 -8 v-62 q0 -8 6 -8z" fill="#E8EFEA" stroke="#1C1210" strokeWidth="2.5" />
      <clipPath id={"j" + color.slice(1)}><path d="M16 18 h48 q6 0 6 8 v62 q0 8 -8 8 h-44 q-8 0 -8 -8 v-62 q0 -8 6 -8z" /></clipPath>
      <g clipPath={`url(#j${color.slice(1)})`}>
        <rect x="8" y={96 - h} width="64" height={h} fill={color} style={{ transition: "y .45s var(--spring-soft), height .45s var(--spring-soft)" }} />
        {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={20 + (i % 3) * 20} cy={90 - Math.floor(i / 3) * 14} r="5" fill="#1C1210" opacity={h > 10 + Math.floor(i / 3) * 14 ? 0.18 : 0} />)}
      </g>
      <path d="M24 26 v50" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".6" />
      {infinite && <text x="40" y="66" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1C1210">∞</text>}
    </svg>
  );
}

function Tarazu({ beam, cost, budget, days, overBudget, guessed, perDay }: { beam: number; cost: number; budget: number; days: number; overBudget: boolean; guessed: boolean; perDay: number }) {
  return (
    <section aria-label="Tarazu" style={{ marginTop: 16, background: "#2A1A12", color: "var(--newsprint)", border: "3px solid var(--ink)", padding: "14px 12px 16px", boxShadow: "6px 7px 0 var(--ink)" }}>
      <svg viewBox="0 0 360 150" width="100%" style={{ maxHeight: 190, display: "block" }} aria-hidden="true">
        <path d="M168 146 h24 l-4 -16 h-16z" fill="#C8962E" stroke="#1C1210" strokeWidth="2.5" />
        <rect x="176" y="40" width="8" height="92" fill="#C8962E" stroke="#1C1210" strokeWidth="2.5" />
        <g style={{ transform: `rotate(${beam}deg)`, transformOrigin: "180px 42px", transition: "transform .5s var(--spring-soft)" }}>
          <rect x="40" y="36" width="280" height="10" rx="5" fill="#E0B04A" stroke="#1C1210" strokeWidth="2.5" />
          {[60, 300].map((x, i) => (
            <g key={x} style={{ transform: `rotate(${-beam}deg)`, transformOrigin: `${x}px 41px`, transition: "transform .5s var(--spring-soft)" }}>
              <path d={`M${x} 41 l-34 56 M${x} 41 l34 56`} stroke="#1C1210" strokeWidth="1.5" />
              <path d={`M${x - 46} 97 q46 26 92 0z`} fill={i === 0 && overBudget ? "#D7261E" : "#E0B04A"} stroke="#1C1210" strokeWidth="2.5" />
            </g>
          ))}
          <circle cx="180" cy="41" r="9" fill="#C8962E" stroke="#1C1210" strokeWidth="2.5" />
        </g>
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: -6 }}>
        <div style={{ textAlign: "center" }}>
          <div className="f-mono" style={{ fontSize: "clamp(22px, 6vw, 30px)", fontWeight: 700, color: overBudget ? "#FF7A6E" : "var(--haldi)" }}>{rupees(cost)}</div>
          <div style={{ fontSize: 14 }}>har 100 khel par {isFinite(budget) && <><br />budget {rupees(budget)}</>}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="f-mono" style={{ fontSize: "clamp(22px, 6vw, 30px)", fontWeight: 700, color: "var(--haldi)" }}>{isFinite(days) ? `${Math.max(0, Math.round(days))} din` : "Hamesha"}</div>
          <div style={{ fontSize: 14 }}>stock chalega<br />{perDay} khel roz{guessed ? " (andaaz)" : ""}</div>
        </div>
      </div>
    </section>
  );
}

/** Drag the boundary between two segments to move weight from one prize to its neighbour. */
function WheelEditor({ prizes, total, shift }: { prizes: Prize[]; total: number; shift: (i: number, j: number, d: number) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const segs = useMemo(() => {
    let a = 0;
    return prizes.map((p) => {
      const span = (p.weight / total) * 360;
      const s = { start: a, end: a + span };
      a += span;
      return s;
    });
  }, [prizes, total]);
  const pt = (a: number, r: number) => [150 + r * Math.sin((a * Math.PI) / 180), 150 - r * Math.cos((a * Math.PI) / 180)];
  const arc = (a0: number, a1: number) => {
    if (a1 - a0 >= 359.99) return "M150 10A140 140 0 1 1 149.99 10Z";
    if (a1 - a0 <= 0.001) return "";
    const [x0, y0] = pt(a0, 140), [x1, y1] = pt(a1, 140);
    return `M150 150L${x0} ${y0}A140 140 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}Z`;
  };
  function onMove(e: React.PointerEvent) {
    if (drag.current === null || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 300 - 150, y = ((e.clientY - r.top) / r.height) * 300 - 150;
    let ang = (Math.atan2(x, -y) * 180) / Math.PI;
    if (ang < 0) ang += 360;
    const i = drag.current;
    const lo = segs[i].start, hi = segs[i + 1].end;
    const clamped = Math.max(lo, Math.min(hi, ang));
    const want = Math.round((((clamped - lo) / 360) * total) / SNAP) * SNAP;
    const delta = want - prizes[i].weight;
    if (delta) shift(i, i + 1, delta);
  }
  return (
    <div style={{ width: "min(100%, 320px)", margin: "0 auto", aspectRatio: "1", position: "relative", touchAction: "none" }}>
      <svg ref={svg} viewBox="0 0 300 300" width="100%" height="100%" onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        <circle cx="153" cy="154" r="144" fill="#1C1210" />
        {segs.map((s, i) => <path key={prizes[i].id} d={arc(s.start, s.end)} fill={COLS[i % COLS.length]} stroke="#1C1210" strokeWidth="2.5" />)}
        {segs.map((s, i) => {
          if (s.end - s.start < 16) return null;
          const [x, y] = pt((s.start + s.end) / 2, 98);
          return <text key={"t" + i} x={x} y={y + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#1C1210" style={{ fontFamily: "var(--f-mono)" }}>{((prizes[i].weight / total) * 100).toFixed(1)}%</text>;
        })}
        <circle cx="150" cy="150" r="20" fill="#F5E9CF" stroke="#1C1210" strokeWidth="3" />
        {segs.slice(0, -1).map((s, i) => {
          const [x, y] = pt(s.end, 140);
          const [hx, hy] = pt(s.end, 116);
          return (
            <g key={"h" + i}>
              <line x1="150" y1="150" x2={x} y2={y} stroke="#1C1210" strokeWidth="3" />
              <circle cx={hx} cy={hy} r="21" fill="#F5E9CF" stroke="#1C1210" strokeWidth="3" tabIndex={0} role="slider"
                aria-label={`${prizes[i].label_hi} aur ${prizes[i + 1].label_hi} ke beech`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((prizes[i].weight / total) * 1000) / 10}
                style={{ cursor: "grab", outline: "none" }}
                onPointerDown={(e) => { drag.current = i; (e.target as Element).setPointerCapture?.(e.pointerId); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); shift(i, i + 1, SNAP); }
                  if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); shift(i, i + 1, -SNAP); }
                }} />
              <path d={`M${hx - 5} ${hy}h10M${hx} ${hy - 5}v10`} stroke="#1C1210" strokeWidth="2" pointerEvents="none" />
            </g>
          );
        })}
        <path d="M150 0 l11 20 h-22z" fill="#1C1210" />
      </svg>
      <p style={{ textAlign: "center", fontSize: 13, margin: "6px 0 0" }}>Gol button khiskao: ek inaam ke odds doosre ko jaate hain. Kul hamesha 100%.</p>
    </div>
  );
}

function AddJar({ cid, onAdded }: { cid: string; onAdded: (p: Prize) => void }) {
  const [f, setF] = useState({ label_hi: "", label_en: "", kind: "free_item", cost: "10", stock: "20", tier: "1" });
  const [err, setErr] = useState<string | null>(null);
  return (
    <form style={{ display: "grid", gap: 10, marginTop: 12, background: "var(--newsprint)", border: "2px solid var(--ink)", padding: 12 }} onSubmit={async (e) => {
      e.preventDefault();
      const r = await api(`/api/v1/campaigns/${cid}/prizes`, "POST", { label_hi: f.label_hi, label_en: f.label_en || f.label_hi, kind: f.kind, cost_paise: Math.round(Number(f.cost) * 100), stock: Number(f.stock), tier: Number(f.tier) });
      if (!r.ok) return setErr(r.d.message_hi);
      onAdded(r.d);
    }}>
      <label className="field">Inaam (Hindi)<input required value={f.label_hi} onChange={(e) => setF({ ...f, label_hi: e.target.value })} placeholder="Muft samosa" /></label>
      <label className="field">Inaam (English)<input value={f.label_en} onChange={(e) => setF({ ...f, label_en: e.target.value })} placeholder="Free samosa" /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label className="field">Aapko kitne ka (₹)<input inputMode="numeric" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value.replace(/\D/g, "") })} /></label>
        <label className="field">Kitne hain<input inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, "") })} /></label>
      </div>
      <label className="field">Kis seedhi par
        <select value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}><option value="1">1: sabke liye</option><option value="2">2: ek nishaana lagaao</option><option value="3">3: teeno nishaane</option></select>
      </label>
      {err && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700, margin: 0 }}>{err}</p>}
      <button className="plate red">Almirah mein rakho</button>
    </form>
  );
}
