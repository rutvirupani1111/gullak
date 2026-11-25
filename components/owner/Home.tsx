"use client";
import { useState } from "react";
import { Keeper, Label, Bulbs } from "@/components/art";
import { pal } from "@/lib/art";
import { api } from "./Small";

type D = {
  shop: { id: string; slug: string; name: string; name_local: string | null; address: string; city: string; palette: string; initial: string; keeper: { face: string; head: string; stache: string; specs: boolean; prop: string }; is_demo: boolean };
  campaigns: { id: string; name: string; title_hi: string; status: string; game: string; starts_at: string; ends_at: string }[];
  today: { scans: number; plays: number; wins: number; redeemed: number };
  staff: { id: string; name: string }[];
  alert: { staff_name: string; n: number } | null;
};
const ST: Record<string, string> = { live: "Chalu", paused: "Ruka", draft: "Kaccha", ended: "Khatam" };
const GAME: Record<string, string> = { chakri: "Chakri", patti: "Lottery patti", toss: "Gullak toss" };

export default function Home({ d }: { d: D }) {
  const [camps, setCamps] = useState(d.campaigns);
  const [msg, setMsg] = useState<string | null>(null);
  const p = pal(d.shop.palette);
  async function act(id: string, action: "publish" | "pause" | "end") {
    const prev = camps;
    setCamps(camps.map((c) => (c.id === id ? { ...c, status: action === "publish" ? "live" : action === "pause" ? "paused" : "ended" } : action === "publish" && c.status === "live" ? { ...c, status: "paused" } : c)));
    const r = await api(`/api/v1/campaigns/${id}/status`, "POST", { action });
    if (!r.ok) { setCamps(prev); setMsg(r.d.message_hi); } else setMsg(action === "publish" ? "Khel chalu. Grahak ab is khel ko dekhenge." : action === "pause" ? "Khel ruk gaya." : "Khel khatam.");
  }
  return (
    <main>
      <section style={{ background: "#2A1A12", color: "var(--newsprint)", paddingBottom: 26 }}>
        <Bulbs lit />
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 20, alignItems: "end" }}>
          <div>
            <h1 className="f-display truck" style={{ fontSize: "clamp(34px, 8vw, 54px)", color: p.a, ["--sh" as string]: p.b, margin: "0 0 6px", lineHeight: 1 }}>{d.shop.name_local || d.shop.name}</h1>
            <p style={{ margin: 0 }}>{d.shop.address}, {d.shop.city}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <a className="plate" href={`/s/${d.shop.slug}`}>Grahak ki tarah kholo</a>
              <a className="plate ghost" href={`/counter`} onClick={() => { try { localStorage.setItem("gk.counter.slug", d.shop.slug); } catch {} }}>Counter screen</a>
              <a className="plate ghost" href={`/counter/live?shop=${d.shop.slug}`}>Live QR</a>
            </div>
          </div>
          {/* the counter board, chalked with today's numbers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 8 }}>
            <div className="chalkboard" style={{ padding: 14 }}>
              <p className="f-chalk" style={{ margin: "0 0 6px", fontSize: 20 }}>Aaj ka hisaab</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, textAlign: "center" }}>
                {[["Scan", d.today.scans], ["Khel", d.today.plays], ["Jeete", d.today.wins], ["Thappe", d.today.redeemed]].map(([l, n]) => (
                  <div key={l as string}><div className="f-chalk" style={{ fontSize: 30, color: "#F4B400" }}>{n}</div><div className="f-chalk" style={{ fontSize: 15 }}>{l}</div></div>
                ))}
              </div>
            </div>
            <Keeper k={d.shop.keeper} apron={p.b} size={96} />
          </div>
        </div>
      </section>
      <div className="wrap" style={{ padding: "22px 16px 60px" }}>
        {d.alert && <p className="paper" style={{ padding: 12, borderColor: "var(--press-red)" }}><b>Dhyan dein:</b> {d.alert.staff_name} ne aaj {d.alert.n} thappe lagaye, roz se 3 guna zyada. <a href={`/dukaan/${d.shop.slug}/chowkidar`}>Register dekho</a></p>}
        {msg && <p className="paper" role="status" style={{ padding: 10 }}>{msg}</p>}
        <h2 className="f-serif" style={{ fontSize: 26, margin: "4px 0 12px" }}>Shelf par khel</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 22, paddingBottom: 12, borderBottom: "14px solid #7A4A26", boxShadow: "0 8px 0 var(--ink)" }}>
          {camps.map((c, i) => (
            <div key={c.id} style={{ animation: `rise .4s var(--spring-soft) ${i * 60}ms both` }}>
              <a href={`/dukaan/${d.shop.slug}/khel/${c.id}`} style={{ display: "block", aspectRatio: "180/110", border: "3px solid var(--ink)", boxShadow: "5px 6px 0 var(--ink)", opacity: c.status === "ended" ? 0.55 : 1 }} aria-label={`${c.name}: inaam aur odds`}>
                <Label palette={d.shop.palette} initial={d.shop.initial} seed={c.id} title={GAME[c.game]} pattern={i * 3} />
              </a>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 6 }}>
                <div><b>{c.name}</b><div style={{ fontSize: 13 }}>{GAME[c.game]} · <span style={{ fontWeight: 800, color: c.status === "live" ? "var(--paan)" : undefined }}>{ST[c.status]}</span></div></div>
                {c.status !== "live" && c.status !== "ended" && <button className="plate small paan" onClick={() => act(c.id, "publish")}>Chalu karo</button>}
                {c.status === "live" && <button className="plate small ghost" onClick={() => act(c.id, "pause")}>Roko</button>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16, marginTop: 34 }}>
          {[["hisaab", "Calendar", "Har din ki bheed, khel aur thappe"], ["wapas-bulao", "Chitthi ka thaila", "Purane grahakon ko WhatsApp se bulao"], ["poster", "Painter ka bench", "QR poster banao aur print karo"], ["staff", "Chaabi ke khoonte", `${d.staff.length} staff, PIN badlo`]].map(([h, t, s]) => (
            <a key={h} href={`/dukaan/${d.shop.slug}/${h}`} className="kraftp" style={{ padding: 16, textDecoration: "none", boxShadow: "4px 5px 0 var(--ink)" }}>
              <b className="f-serif" style={{ fontSize: 20 }}>{t}</b><p style={{ margin: "4px 0 0" }}>{s}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
