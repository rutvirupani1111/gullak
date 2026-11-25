"use client";
// The live demo matchbox on the lane. Same choreography as the shop page (sleeve tilts back, tray
// slides up, bulbs light left to right), and the tray holds the demo shop's real prizes and odds.
import { useEffect, useRef, useState } from "react";
import { Bulbs, Label } from "@/components/art";

type Prize = { label: string; pct: number; remaining: number | null };

export default function LaneMatchbox({ slug, initial, palette, sleeve, prizes, title }: { slug: string; initial: string; palette: string; sleeve: string; prizes: Prize[]; title: string }) {
  const [state, setState] = useState<"closed" | "opening" | "open">("closed");
  const [calm, setCalm] = useState(false);
  const spark = useRef<HTMLCanvasElement>(null);
  useEffect(() => setCalm(matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  function open() {
    if (state !== "closed") return setState("open");
    setState("opening");
    try { navigator.vibrate?.(30); } catch {}
    if (!calm && spark.current) {
      const g = spark.current.getContext("2d")!;
      const parts = Array.from({ length: 18 }, () => ({ x: 16, y: 20, vx: 1 + Math.random() * 4, vy: -3 + Math.random() * 6 }));
      const t0 = performance.now();
      const step = (now: number) => {
        const life = 1 - (now - t0) / 300;
        g.clearRect(0, 0, 120, 40);
        for (const p of parts) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.2;
          g.fillStyle = `rgba(255,${130 + ((p.x * 7) % 100)},26,${Math.max(0, life)})`;
          g.fillRect(p.x, p.y, 2.5, 2.5);
        }
        if (life > 0) requestAnimationFrame(step);
        else g.clearRect(0, 0, 120, 40);
      };
      requestAnimationFrame(step);
    }
    setTimeout(() => setState("open"), calm ? 250 : 1100);
  }

  const out = state !== "closed";
  return (
    <div className="lane-box" data-state={state}>
      <Bulbs lit={out} n={10} />
      <div style={{ position: "relative", width: "100%", aspectRatio: "5 / 3", perspective: 1400, marginTop: 4 }}>
        {/* the tray: chalkboard with today's prizes and their real odds */}
        <div className="lane-tray" style={{ transform: out && !calm ? "translateY(-4%)" : "none" }}>
          <div className="chalkboard" style={{ position: "absolute", inset: 0, padding: "8px 12px", borderWidth: 8, overflow: "hidden" }}>
            <div className="f-chalk" style={{ fontSize: 18, borderBottom: "1px dashed rgba(237,230,211,.5)", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>Aaj ke inaam</span><span style={{ color: "#F4B400" }}>odds</span>
            </div>
            {prizes.length === 0 && <p className="f-chalk" style={{ fontSize: 17, margin: "8px 0" }}>Agla khel jald.</p>}
            {prizes.slice(0, 4).map((p, i) => (
              <div key={i} className="f-chalk lane-line" style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 16, padding: "2px 0", animationDelay: `${out ? 500 + i * 90 : 0}ms` }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span>
                <span style={{ color: "#F4B400", whiteSpace: "nowrap" }}>{p.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        {/* the sleeve, with its striker strip */}
        <button
          className="lane-sleeve"
          onClick={open}
          aria-label={state === "closed" ? `${title}: dibba kholo` : "Dibba khula hai"}
          aria-expanded={out}
          style={{
            background: sleeve,
            transform: out && !calm ? "rotateX(18deg) translateY(78%) scale(.94)" : "none",
            opacity: state === "open" ? 0 : 1,
            pointerEvents: state === "open" ? "none" : "auto",
          }}
        >
          <Label palette={palette} initial={initial} seed={slug} title={initial} style={{ position: "absolute", inset: "9% 7% 9% 13%" }} />
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "7%", background: "repeating-linear-gradient(0deg,#6E2C17 0 3px,#3a1a0c 3px 6px)", borderRight: "2px solid var(--ink)" }} />
          <canvas ref={spark} width={120} height={40} style={{ position: "absolute", left: "1%", top: "40%", width: 120, height: 40, pointerEvents: "none" }} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, minHeight: 52 }}>
        {state === "open" ? (
          <a className="plate red rise" href={`/s/${slug}?khula=1`} style={{ fontSize: 20 }}><span className="f-display">Andar chalo, khelo</span></a>
        ) : (
          <button className="plate red" onClick={open} style={{ fontSize: 20 }}><span className="f-display">Dibba kholo</span></button>
        )}
        <a className="plate ghost" href={`/s/${slug}/niyam`}>Asli odds</a>
      </div>
    </div>
  );
}
