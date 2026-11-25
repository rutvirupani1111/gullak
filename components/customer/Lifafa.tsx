"use client";
import { useState } from "react";
import { pal, textOn } from "@/lib/art";
import { GullakArt } from "@/components/art";

type Shop = { slug: string; name: string; name_local: string | null; address: string; city: string; palette: string; initial: string; expires_at: string };

/** C9: a shagun envelope with the shop's address printed on it. It only works at the shop. */
export default function Lifafa({ token, state, shop }: { token: string; state: "fresh" | "used" | "missing"; shop: Shop | null }) {
  const [phase, setPhase] = useState<"shut" | "open" | "kept">("shut");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const p = pal(shop?.palette ?? "haldi-press-red");

  async function keep() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/v1/gift/${token}/save`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message_hi);
      try { localStorage.setItem("gk.gift." + d.slug, token); } catch {}
      setPhase("kept");
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "Network nahi mila. Dobara try karo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100dvh", background: "#5B1F14", color: "var(--newsprint)", display: "grid", placeItems: "center", padding: "24px 16px", overflow: "hidden" }}>
      <div className="halftone" style={{ position: "fixed", inset: 0, opacity: 0.12, pointerEvents: "none" }} />
      <div style={{ width: "min(100%, 380px)", textAlign: "center", position: "relative" }}>
        {state !== "fresh" || !shop ? (
          <div className="paper" style={{ padding: 22 }}>
            <p className="f-display" style={{ fontSize: 30, margin: 0, color: "var(--press-red)" }}>{state === "used" ? "Lifafa khul chuka" : "Lifafa nahi mila"}</p>
            <p>{state === "used" ? "Yeh lifafa istemaal ho chuka ya 7 din purana ho gaya. This gift slip has been used or has expired." : "Yeh link adhoora lagta hai. This link looks incomplete."}</p>
            <a className="plate" href="/w">Meri gullak</a>
          </div>
        ) : (
          <>
            <p className="f-chalk" style={{ fontSize: 22, margin: "0 0 10px" }}>Kisi dost ne aapke liye ek khel bheja hai</p>
            <button
              onClick={() => phase === "shut" && setPhase("open")}
              aria-label="Lifafa kholo"
              style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", background: "none", border: 0, padding: 0, cursor: phase === "shut" ? "pointer" : "default", perspective: 900 }}
            >
              {/* the slip inside rises out when the flap opens */}
              <div className="paper" style={{ position: "absolute", left: "8%", right: "8%", top: "10%", height: "78%", padding: "10px 12px", textAlign: "left", transform: phase === "shut" ? "translateY(0)" : "translateY(-46%)", transition: "transform .8s var(--ease-hero) .25s", zIndex: 1 }}>
                <p className="f-display" style={{ margin: 0, fontSize: 22, color: p.a === "#F5E9CF" ? "var(--ink)" : p.b }}>Ek muft khel</p>
                <p style={{ margin: "2px 0 0", fontSize: 14 }}>{shop.name_local || shop.name} mein. One free game at this shop.</p>
              </div>
              {/* envelope body: kraft shagun lifafa with a printed address block */}
              <svg viewBox="0 0 320 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2 }} aria-hidden="true">
                <path d="M4 40 h312 v156 h-312z" fill="#E2207B" stroke="#1C1210" strokeWidth="3" />
                <path d="M4 196 L160 104 L316 196" fill="#C81A6C" stroke="#1C1210" strokeWidth="3" />
                <path d="M4 40 L120 132 M316 40 L200 132" stroke="#1C1210" strokeWidth="2" opacity=".5" />
                <g opacity=".35">{Array.from({ length: 14 }, (_, i) => <circle key={i} cx={20 + i * 22} cy={186} r="3" fill="#F4B400" />)}</g>
                <rect x="96" y="122" width="128" height="50" fill="#F5E9CF" stroke="#1C1210" strokeWidth="2" />
                <text x="160" y="142" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1C1210">{(shop.name_local || shop.name).slice(0, 22)}</text>
                <text x="160" y="160" textAnchor="middle" fontSize="9" fill="#1C1210">{shop.city}</text>
                <text x="36" y="70" fontSize="22" fill="#F4B400" style={{ fontFamily: "var(--f-display)" }}>शुभ</text>
              </svg>
              {/* the flap folds back on its top hinge */}
              <svg viewBox="0 0 320 120" style={{ position: "absolute", left: 0, right: 0, top: "20%", width: "100%", zIndex: phase === "shut" ? 3 : 0, transformOrigin: "50% 0", transform: phase === "shut" ? "rotateX(0)" : "rotateX(180deg)", transition: "transform .6s var(--ease-hero)" }} aria-hidden="true">
                <path d="M4 0 L160 96 L316 0z" fill="#F4B400" stroke="#1C1210" strokeWidth="3" />
                <circle cx="160" cy="70" r="16" fill="#D7261E" stroke="#1C1210" strokeWidth="2.5" />
                <text x="160" y="77" textAnchor="middle" fontSize="18" fill={textOn("#D7261E")} style={{ fontFamily: "var(--f-display)" }}>{shop.initial}</text>
              </svg>
            </button>
            <div style={{ marginTop: 22, minHeight: 150 }}>
              {phase === "shut" && <p style={{ margin: 0 }}>Lifafe par tap karo. Tap the envelope.</p>}
              {phase === "open" && (
                <div className="rise">
                  <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{shop.address}, {shop.city}</p>
                  <p style={{ margin: "0 0 14px", fontSize: 14 }}>Yeh khel sirf dukaan par chalega: wahan ka QR scan karo. It only works at the shop.</p>
                  <button className="plate red" disabled={busy} onClick={keep} style={{ minWidth: 220 }}>
                    <span className="f-display" style={{ fontSize: 20 }}>{busy ? "..." : "Gullak mein rakho"}</span>
                  </button>
                  {err && <p role="alert" style={{ color: "var(--haldi)", fontWeight: 700 }}>{err}</p>}
                </div>
              )}
              {phase === "kept" && (
                <div className="rise" style={{ display: "grid", justifyItems: "center", gap: 8 }}>
                  <GullakArt size={84} style={{ animation: "wobble .45s var(--spring-soft)" }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Rakh liya. Dukaan par jaake QR scan karo, ek bonus khel milega.</p>
                  <p style={{ margin: 0, fontSize: 14 }}>Saved. Scan the QR at the shop for one bonus game.</p>
                  <a className="plate ghost" href="/w">Meri gullak</a>
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, opacity: 0.8 }}>Bhejne wale ko koi inaam nahi milta. Koi kharidaari zaroori nahi.</p>
          </>
        )}
      </div>
    </main>
  );
}
