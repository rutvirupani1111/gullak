"use client";
// O6: the postman's cloth bag. One postcard per opted-in regular who has not come back in N days.
// Nothing is sent automatically: the owner taps, WhatsApp opens with the message, the owner sends it.
import { useEffect, useRef, useState } from "react";
import { api, Help } from "./Small";

type Row = { id: string; name: string | null; masked: string; lastDay: string | null; visits: number; lastPrize: string | null; sentAt: string | null };

function ago(iso: string | null) {
  if (!iso) return "kabhi nahi";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "aaj" : d === 1 ? "kal" : `${d} din pehle`;
}

export default function Thaila({ shopId, days, list, demo }: { shopId: string; days: number; list: Row[]; demo: boolean }) {
  const [rows, setRows] = useState(list);
  const [asking, setAsking] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pending = useRef<string | null>(null);

  // when the owner comes back from WhatsApp, the card asks whether it went
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && pending.current) {
        setAsking(pending.current);
        pending.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  async function openWa(r: Row) {
    setErr(null);
    const w = window.open("", "_blank");
    const res = await api(`/api/v1/shops/${shopId}/comeback/${r.id}/mint`, "POST", {});
    if (!res.ok) {
      w?.close();
      return setErr(res.d.message_hi);
    }
    pending.current = r.id;
    if (w) w.location.href = res.d.waUrl;
    else location.href = res.d.waUrl;
    setTimeout(() => { if (pending.current === r.id) { setAsking(r.id); pending.current = null; } }, 1500);
  }
  async function sent(r: Row) {
    setAsking(null);
    const prev = rows;
    const at = new Date().toISOString();
    setRows([...rows.filter((x) => x.id !== r.id), { ...r, sentAt: at }]);
    const res = await api(`/api/v1/shops/${shopId}/comeback/${r.id}/sent`, "POST", {});
    if (!res.ok) setRows(prev);
  }

  return (
    <main className="wrap" style={{ padding: "18px 16px 80px" }}>
      <h1 className="f-display" style={{ fontSize: "clamp(30px, 7vw, 44px)", margin: 0 }}>Purane grahak</h1>
      <p className="f-serif" style={{ margin: "2px 0 0", fontWeight: 700 }}>Chitthi ka thaila</p>
      <Help hi={<>Yeh woh grahak hain jinhone WhatsApp ke liye haan kaha, par {days} din se nahi aaye. Chitthi par &quot;WhatsApp kholo&quot; dabao: message taiyaar milega, aap khud bhejo. Har chitthi mein ek bonus khel hai, 7 din tak. Roz 20 tak.</>}
        en={<>Regulars who said yes to WhatsApp but have not come in {days} days. Tap &quot;WhatsApp kholo&quot;: the message is ready, you send it yourself. Each one carries a bonus game, valid 7 days. Up to 20 a day.</>} />
      <div style={{ height: 12 }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[7, 14, 30].map((n) => <a key={n} className={"plate small " + (n === days ? "" : "ghost")} href={`?days=${n}`} aria-current={n === days ? "page" : undefined}>{n} din</a>)}
      </div>
      {demo && <p className="kraftp" style={{ padding: 10, marginTop: 14 }}>Demo: WhatsApp bina number ke khulega. Asli message dikhega, aap khud contact chunenge. Yeh number asli nahi hain.</p>}
      {err && <p role="alert" className="paper" style={{ padding: 10, borderColor: "var(--press-red)", fontWeight: 700 }}>{err}</p>}

      <div style={{ position: "relative", marginTop: 26 }}>
        {/* the bag */}
        <svg viewBox="0 0 400 90" width="100%" height="90" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
          <path d="M10 88 Q 20 20 200 14 Q 380 20 390 88 Z" fill="#7B5A3A" stroke="#1C1210" strokeWidth="3" />
          <path d="M60 50 Q200 30 340 50" stroke="#E2CDA2" strokeWidth="2" strokeDasharray="6 5" fill="none" />
          <text x="200" y="74" textAnchor="middle" fontSize="20" fill="#F5E9CF" style={{ fontFamily: "var(--f-serif)", fontWeight: 700 }}>DAAK · {rows.length} CHITTHI</text>
        </svg>
        <div style={{ background: "#7B5A3A", border: "3px solid var(--ink)", borderTop: 0, padding: "14px 12px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 14 }}>
          {rows.length === 0 && (
            <div style={{ gridColumn: "1 / -1", color: "var(--newsprint)", padding: 10 }}>
              <p className="f-chalk" style={{ fontSize: 22, margin: 0 }}>Thaila khaali hai.</p>
              <p style={{ margin: "6px 0 0" }}>Jab koi grahak jeet ke baad gullak mein &quot;Agli baar yaad dilaayein?&quot; par haan kahega aur {days} din nahi aayega, uski chitthi yahan aayegi. Chhota din chuno: <a href="?days=7" style={{ color: "var(--haldi)" }}>7 din</a>.</p>
              <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.85 }}>Empty for now. When a customer says yes to reminders in their gullak and stays away, their postcard lands here.</p>
              <a className="plate small" href="/w" style={{ marginTop: 10 }}>Dekho grahak ko kya dikhta hai</a>
            </div>
          )}
          {rows.map((r, i) => {
            const recent = r.sentAt && Date.now() - new Date(r.sentAt).getTime() < 7 * 86400000;
            return (
              <article key={r.id} style={{ background: "#F3E3BF", border: "2px solid var(--ink)", padding: 12, position: "relative", transform: `rotate(${((i % 3) - 1) * 0.8}deg)`, boxShadow: "3px 4px 0 var(--ink)", opacity: recent ? 0.7 : 1, animation: `rise .4s var(--spring-soft) ${i * 40}ms both` }}>
                <div style={{ position: "absolute", right: 10, top: 10, width: 44, height: 52, border: "2px dashed #D7261E", display: "grid", placeItems: "center", background: "#fff6dd" }}>
                  <svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><circle cx="15" cy="15" r="11" fill="none" stroke="#D7261E" strokeWidth="2" /><path d="M8 15h14M15 8v14" stroke="#D7261E" strokeWidth="2" /></svg>
                </div>
                <p className="f-chalk" style={{ fontSize: 22, margin: "0 56px 2px 0" }}>{r.name || "Grahak"}</p>
                <p className="f-mono" style={{ margin: 0, fontSize: 15 }}>{r.masked}</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.45 }}>
                  Aakhri baar: <b>{r.lastDay ? ago(r.lastDay) : "kabhi nahi"}</b> · {r.visits} baar aaye<br />
                  Pichhla inaam: <b>{r.lastPrize ?? "koi nahi"}</b>
                </p>
                {recent && <p style={{ margin: "8px 0 0", fontWeight: 800, color: "var(--paan)" }}>Bheja: {ago(r.sentAt)}</p>}
                {asking === r.id ? (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b>Bhej diya?</b>
                    <button className="plate small paan" onClick={() => sent(r)}>Haan</button>
                    <button className="plate small ghost" onClick={() => setAsking(null)}>Nahi</button>
                  </div>
                ) : (
                  <button className="plate small paan" style={{ marginTop: 10 }} onClick={() => openWa(r)}>{demo ? "WhatsApp kholo (bina number)" : "WhatsApp kholo"}</button>
                )}
              </article>
            );
          })}
        </div>
      </div>
      <p style={{ fontSize: 13, marginTop: 14 }}>Har message mein band karne ka tarika hota hai. Apna number flag na ho, isliye roz 20 se zyada nahi. WhatsApp Business behtar rahega.</p>
    </main>
  );
}
