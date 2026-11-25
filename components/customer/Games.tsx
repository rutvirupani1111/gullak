"use client";
import { useEffect, useRef, useState } from "react";
import { computeStopAngle, seeded, segments } from "@/lib/wheel";
import { gullakX, judgeThrow, TOSS } from "@/lib/toss-sim";
import { pal, labelSvg } from "@/lib/art";

export type PlayResult = {
  playId: string; couponId: string | null; payload: Record<string, unknown> | null; sig: string | null;
  prize: { id: string; label_hi: string; label_en: string; kind: string; value: number; minBill: number } | null;
  layout: { prizeId: string; pct: number }[]; outcome: "win" | "lose"; tossHits: number | null;
};
type Lang = "hi" | "en";
type PlayFn = (extra?: { toss?: { throws: { t: number; vx: number; vy: number }[] } }) => Promise<PlayResult | null>;
type Prize = { id: string; label_hi: string; label_en: string; pct: number };
const COLS = ["#F4B400", "#D7261E", "#13804F", "#E2207B", "#0E8A86", "#FF7A1A", "#B9502B", "#F5E9CF"];

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  if (a1 - a0 >= 359.99) return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}Z`;
  return `M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}Z`;
}

/** Chakri: segment angle = 360 x probability, no visual minimum. Idle spin while /play is in flight. */
export function Chakri({ prizes, layout: initial, play, onLanded, lang, calm, palette }: { prizes: Prize[]; layout: { prizeId: string; pct: number }[]; play: PlayFn; onLanded: (r: PlayResult, el: HTMLElement | null) => void; lang: Lang; calm: boolean; palette: string; initial: string }) {
  const [layout, setLayout] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [win, setWin] = useState<string | null>(null);
  const wheel = useRef<SVGGElement>(null);
  const angle = useRef(0);
  const sparkC = useRef<HTMLCanvasElement>(null);
  const segs = segments(layout);
  const name = (id: string) => {
    const p = prizes.find((x) => x.id === id);
    return p ? (lang === "hi" ? p.label_hi : p.label_en) : "";
  };

  async function spin() {
    if (busy) return;
    setBusy(true);
    const t0 = performance.now();
    let raf = 0;
    let vel = 0;
    let last = t0;
    let tickAt = 0;
    const ctx = sparkC.current?.getContext("2d");
    const parts: { x: number; y: number; vx: number; vy: number; l: number }[] = [];
    let mode: "idle" | "land" = "idle";
    let land = { from: 0, to: 0, start: 0, dur: 2600 };
    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (mode === "idle") {
        vel = Math.min(540, ((now - t0) / 300) * 540);
        angle.current += vel * dt;
      } else {
        const s = Math.min(1, (now - land.start) / land.dur);
        const e = 1 - Math.pow(1 - s, 3);
        const prev = angle.current;
        angle.current = land.from + (land.to + 4 - land.from) * e;
        vel = (angle.current - prev) / Math.max(dt, 0.001);
        if (s >= 1) {
          wheel.current!.animate([{ transform: `rotate(${land.to + 4}deg)` }, { transform: `rotate(${land.to}deg)` }], { duration: 350, easing: "var(--spring-snap)", fill: "forwards" });
          angle.current = land.to;
          cancelAnimationFrame(raf);
          return;
        }
      }
      if (wheel.current) wheel.current.style.transform = `rotate(${angle.current}deg)`;
      // peg ticks are visual only here (no audio on this build); sparks scale with speed
      if (ctx && !calm) {
        if (now - tickAt > 40 && vel > 60) tickAt = now;
        const n = Math.min(3, Math.floor(vel / 200));
        for (let i = 0; i < n && parts.length < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          parts.push({ x: 150 + Math.cos(a) * 140, y: 150 + Math.sin(a) * 140, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, l: 1 });
        }
        ctx.clearRect(0, 0, 300, 300);
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.x += p.vx; p.y += p.vy; p.l -= 0.05;
          if (p.l <= 0) { parts.splice(i, 1); continue; }
          ctx.fillStyle = `rgba(255,${140 + (i % 5) * 20},26,${p.l})`;
          ctx.fillRect(p.x, p.y, 3, 3);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    if (!calm) raf = requestAnimationFrame(frame);
    const [res] = await Promise.all([play(), new Promise((r) => setTimeout(r, calm ? 0 : 600))]);
    if (!res) {
      cancelAnimationFrame(raf);
      setBusy(false);
      return;
    }
    if (JSON.stringify(res.layout) !== JSON.stringify(layout)) setLayout(res.layout); // stock changed: morph during the idle spin
    const target = res.prize?.id ?? res.layout[0]?.prizeId;
    const stop = computeStopAngle(res.layout, target, seeded(res.playId));
    if (calm) {
      angle.current = stop;
      if (wheel.current) wheel.current.style.transform = `rotate(${stop}deg)`;
      setWin(target);
      onLanded(res, wheel.current as unknown as HTMLElement);
      return;
    }
    const cur = angle.current;
    const base = cur - (cur % 360);
    const to = base + 360 * 3 + stop + (stop < cur % 360 ? 360 : 0);
    land = { from: cur, to, start: performance.now(), dur: 2600 };
    mode = "land";
    setTimeout(() => {
      setWin(target);
      onLanded(res, document.getElementById("gk-win-label"));
    }, 2600 + 380);
  }

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 300, height: 300, maxWidth: "88vw", aspectRatio: "1" }}>
        <svg viewBox="0 0 300 300" width="100%" height="100%" role="img" aria-label="Chakri">
          <circle cx="152" cy="152" r="146" fill="#D7261E" opacity=".35" />
          <g ref={wheel} style={{ transformOrigin: "150px 150px", transformBox: "view-box" } as React.CSSProperties}>
            {segs.map((s, i) => (
              <path key={s.prizeId} d={arc(150, 150, 140, s.start, s.end)} fill={win === s.prizeId ? "#FFE6A0" : COLS[i % COLS.length]} stroke="#1C1210" strokeWidth="2.5" />
            ))}
            {segs.map((s, i) => {
              const mid = (s.start + s.end) / 2;
              if (s.end - s.start < 14) return null;
              return (
                <text key={"t" + i} transform={`rotate(${mid} 150 150)`} x="150" y="40" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1C1210">{s.pct}%</text>
              );
            })}
            <circle cx="150" cy="150" r="22" fill={pal(palette).a} stroke="#1C1210" strokeWidth="3" />
            {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={150 + 132 * Math.sin((i * Math.PI) / 8)} cy={150 - 132 * Math.cos((i * Math.PI) / 8)} r="3" fill="#1C1210" />)}
          </g>
          <path d="M150 2 l12 22 h-24z" fill="#1C1210" />
          <path d="M150 6 l8 15 h-16z" fill="#F5E9CF" />
        </svg>
        <canvas ref={sparkC} width={300} height={300} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4, width: "100%", maxWidth: 340 }}>
        {segs.map((s, i) => (
          <li key={s.prizeId} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: win === s.prizeId ? 800 : 500 }} id={win === s.prizeId ? "gk-win-label" : undefined}>
            <span style={{ width: 14, height: 14, background: COLS[i % COLS.length], border: "2px solid var(--ink)", flex: "none" }} />
            <span style={{ flex: 1 }}>{name(s.prizeId)}</span>
            <span className="f-mono">{s.pct}%</span>
          </li>
        ))}
      </ul>
      {!win && (
        <button className="plate red" style={{ fontSize: 22, minWidth: 200 }} onClick={spin} disabled={busy}>
          <span className="f-display">{busy ? (lang === "hi" ? "Ghoom rahi hai" : "Spinning") : lang === "hi" ? "Chakri ghumao" : "Spin the chakri"}</span>
        </button>
      )}
    </div>
  );
}

/** Lottery patti: the result layer is drawn only after the payload is stored, so there is nothing to peek at. */
export function Patti({ play, onLanded, lang, palette, initial }: { play: PlayFn; onLanded: (r: PlayResult, el: HTMLElement | null) => void; lang: Lang; palette: string; initial: string }) {
  const [res, setRes] = useState<PlayResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const foil = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);

  async function start() {
    setBusy(true);
    const r = await play();
    setBusy(false);
    if (r) setRes(r);
  }
  useEffect(() => {
    if (!res || !foil.current) return;
    const c = foil.current, g = c.getContext("2d")!;
    g.fillStyle = "#A8AFAA";
    g.fillRect(0, 0, 300, 180);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = i % 2 ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.08)";
      g.fillRect(Math.random() * 300, Math.random() * 180, 2, 2);
    }
    g.fillStyle = "#1C1210";
    g.font = "bold 18px sans-serif";
    g.textAlign = "center";
    g.fillText(lang === "hi" ? "Yahan ghiso" : "Scratch here", 150, 96);
    g.globalCompositeOperation = "destination-out";
  }, [res, lang]);

  function reveal() {
    if (done || !res) return;
    setDone(true);
    foil.current?.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(30px) rotate(3deg)" }], { duration: 300, fill: "forwards" });
    setTimeout(() => onLanded(res, wrap.current), 320);
  }
  function scratch(e: React.PointerEvent) {
    if (!drawing.current || !foil.current || done) return;
    const r = foil.current.getBoundingClientRect();
    const g = foil.current.getContext("2d")!;
    g.beginPath();
    g.arc(((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 180, 14, 0, Math.PI * 2);
    g.fill();
  }
  useEffect(() => {
    if (!res || done) return;
    const i = setInterval(() => {
      const c = foil.current;
      if (!c) return;
      const d = c.getContext("2d")!.getImageData(0, 0, 300, 180).data;
      let clear = 0, n = 0;
      for (let k = 3; k < d.length; k += 4 * 8 * 3) { n++; if (d[k] === 0) clear++; }
      if (clear / n > 0.55) reveal();
    }, 120);
    return () => clearInterval(i);
  });

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
      <div ref={wrap} style={{ position: "relative", width: 300, maxWidth: "88vw", aspectRatio: "300 / 180", border: "3px solid var(--ink)", boxShadow: "5px 6px 0 var(--ink)", background: "#F5E9CF", touchAction: "none" }}>
        {res ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 10 }}>
            <div>
              <div dangerouslySetInnerHTML={{ __html: labelSvg({ palette, initial, seed: res.playId, w: 120, h: 50, title: initial }) }} style={{ width: 120, height: 50, margin: "0 auto 6px" }} />
              <p className="f-display" style={{ margin: 0, fontSize: 22, color: "#D7261E" }}>{res.prize ? (lang === "hi" ? res.prize.label_hi : res.prize.label_en) : lang === "hi" ? "Is baar nahi" : "Not this time"}</p>
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "repeating-linear-gradient(45deg,#A8AFAA 0 8px,#B9C0BB 8px 16px)" }}>
            <button className="plate red" onClick={start} disabled={busy}><span className="f-display">{busy ? "..." : lang === "hi" ? "Patti lo" : "Take a ticket"}</span></button>
          </div>
        )}
        {res && (
          <canvas ref={foil} width={300} height={180} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "grab" }}
            onPointerDown={(e) => { drawing.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); scratch(e); }}
            onPointerMove={scratch} onPointerUp={() => (drawing.current = false)} aria-label={lang === "hi" ? "Ghisne wali patti" : "Scratch card"} />
        )}
      </div>
      {res && !done && <button className="plate ghost small" onClick={reveal}>{lang === "hi" ? "Seedha dikhao" : "Reveal"}</button>}
    </div>
  );
}

/** Gullak toss: flick a coin 3 times. The server re-runs this simulation; skill only raises the tier ceiling. */
export function Toss({ play, onLanded, lang, seed, calm }: { play: PlayFn; onLanded: (r: PlayResult, el: HTMLElement | null) => void; lang: Lang; seed: number; calm: boolean }) {
  const [throws, setThrows] = useState<{ t: number; vx: number; vy: number; hit: boolean }[]>([]);
  const [t0, setT0] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const gk = useRef<HTMLDivElement>(null);
  const pts = useRef<{ x: number; y: number; t: number }[]>([]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (gk.current && t0 !== null) gk.current.style.transform = `translateX(${gullakX(performance.now() - t0, seed)}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [t0, seed]);

  async function finish(list: typeof throws) {
    setBusy(true);
    const r = await play({ toss: { throws: list.map(({ t, vx, vy }) => ({ t, vx, vy })) } });
    setBusy(false);
    if (r) onLanded(r, gk.current);
  }
  function up(e: React.PointerEvent) {
    if (t0 === null || throws.length >= TOSS.max || busy) return;
    const now = performance.now();
    const recent = pts.current.filter((p) => now - p.t <= 80);
    if (recent.length < 2) return;
    const a = recent[0], b = recent[recent.length - 1];
    const dt = Math.max(1, b.t - a.t) / 1000;
    const th = { t: Math.round(now - t0), vx: (b.x - a.x) / dt, vy: (a.y - b.y) / dt };
    const hit = judgeThrow(th, seed).hit;
    const list = [...throws, { ...th, hit }];
    setThrows(list);
    pts.current = [];
    if (list.length >= TOSS.max) finish(list);
    void e;
  }
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 300, maxWidth: "88vw", height: 320, border: "3px solid var(--ink)", background: "#E2CDA2", overflow: "hidden", touchAction: "none" }}
        onPointerDown={(e) => { if (t0 === null) setT0(performance.now()); pts.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }]; }}
        onPointerMove={(e) => pts.current.push({ x: e.clientX, y: e.clientY, t: performance.now() })}
        onPointerUp={up}>
        <div ref={gk} style={{ position: "absolute", top: 20, left: "calc(50% - 30px)", width: 60, height: 60 }}>
          <svg viewBox="0 0 60 60"><path d="M30 6 q-24 4 -24 28 q0 22 24 22 q24 0 24 -22 q0 -24 -24 -28z" fill="#B9502B" stroke="#1C1210" strokeWidth="3" /><rect x="20" y="10" width="20" height="5" fill="#1C1210" /></svg>
        </div>
        <div style={{ position: "absolute", bottom: 16, left: "calc(50% - 20px)", width: 40, height: 40, borderRadius: "50%", background: "#F4B400", border: "3px solid var(--ink)" }} />
        <p className="f-chalk" style={{ position: "absolute", bottom: 64, width: "100%", textAlign: "center", fontSize: 18 }}>
          {t0 === null ? (lang === "hi" ? "Sikka upar ki taraf jhatko" : "Flick the coin upward") : `${throws.filter((x) => x.hit).length} / ${throws.length}`}
        </p>
      </div>
      <p style={{ fontSize: 13 }}>{lang === "hi" ? "3 baar phenko. Nishaana inaam ki seedhi kholta hai, inaam server chunta hai." : "Three throws. Hits unlock higher prizes; the server still draws the prize."}</p>
      {calm && t0 === null && <button className="plate small" onClick={() => finish([])}>{lang === "hi" ? "Bina khel ke nateeja" : "Skip to result"}</button>}
    </div>
  );
}
