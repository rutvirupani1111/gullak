// Hand-drawn SVG kit for the bazaar lane. Two ink plates: plate B is offset 1.5px right, 1px down.
import type { CSSProperties } from "react";
import { labelSvg, pal } from "@/lib/art";

export type KeeperT = { face: string; head: string; stache: string; specs: boolean; prop: string };

/** The shop's paper-puppet dukaandaar. Jointed: head, two arms on shoulder pivots, and a prop. */
export function Keeper({ k, apron, size = 160, wave = false, className = "", style }: { k: KeeperT; apron: string; size?: number; wave?: boolean; className?: string; style?: CSSProperties }) {
  const face = k.face === "long" ? { rx: 21, ry: 27 } : k.face === "square" ? { rx: 24, ry: 23 } : { rx: 24, ry: 25 };
  return (
    <svg viewBox="0 0 160 200" width={size} height={size * 1.25} className={className} style={style} aria-hidden="true">
      <g className="kp-body">
        {/* torso + apron */}
        <path d="M44 196 q-4 -62 36 -74 q40 12 36 74z" fill="#F5E9CF" stroke="#1C1210" strokeWidth="3" />
        <path d="M58 196 l4 -58 h36 l4 58z" fill={apron} stroke="#1C1210" strokeWidth="3" />
        <path d="M66 150 h28" stroke="#1C1210" strokeWidth="2" strokeDasharray="3 3" />
        {/* left arm holds the prop */}
        <g style={{ transformOrigin: "52px 132px" }} className="kp-arm-l">
          <path d="M52 132 q-20 18 -14 40" stroke="#1C1210" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M52 132 q-20 18 -14 40" stroke="#C98A5B" strokeWidth="7" strokeLinecap="round" fill="none" />
          <Prop kind={k.prop} />
        </g>
        {/* right arm waves */}
        <g style={{ transformOrigin: "108px 132px" }} className={wave ? "kp-wave" : ""}>
          <path d="M108 132 q22 -6 26 -30" stroke="#1C1210" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M108 132 q22 -6 26 -30" stroke="#C98A5B" strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="134" cy="98" r="7" fill="#C98A5B" stroke="#1C1210" strokeWidth="2.5" />
        </g>
        {/* head */}
        <g className="kp-head" style={{ transformOrigin: "80px 112px" }}>
          <path d="M72 116 h16 v10 h-16z" fill="#C98A5B" stroke="#1C1210" strokeWidth="2.5" />
          <ellipse cx="81.5" cy="88" rx={face.rx} ry={face.ry} fill="#D7261E" opacity=".35" />
          <ellipse cx="80" cy="87" rx={face.rx} ry={face.ry} fill="#C98A5B" stroke="#1C1210" strokeWidth="3" />
          <circle cx="71" cy="84" r="2.6" fill="#1C1210" />
          <circle cx="89" cy="84" r="2.6" fill="#1C1210" />
          {k.specs && (
            <g fill="none" stroke="#1C1210" strokeWidth="2">
              <circle cx="71" cy="84" r="7" />
              <circle cx="89" cy="84" r="7" />
              <path d="M78 84h4" />
            </g>
          )}
          <path d="M74 103 q6 4 12 0" stroke="#1C1210" strokeWidth="2.2" fill="none" />
          {k.stache === "thin" && <path d="M70 96 q10 -4 20 0" stroke="#1C1210" strokeWidth="3" fill="none" />}
          {k.stache === "handlebar" && <path d="M62 92 q4 8 12 3 q6 -3 6 -3 q0 0 6 3 q8 5 12 -3" stroke="#1C1210" strokeWidth="4" fill="none" strokeLinecap="round" />}
          <Head kind={k.head} />
        </g>
      </g>
    </svg>
  );
}
function Head({ kind }: { kind: string }) {
  switch (kind) {
    case "topi":
      return <path d="M56 66 q24 -16 48 0 l-3 -14 q-21 -8 -42 0z" fill="#F5E9CF" stroke="#1C1210" strokeWidth="3" />;
    case "pagdi":
      return (
        <g stroke="#1C1210" strokeWidth="3">
          <path d="M52 70 q28 -34 56 0 q-28 -10 -56 0z" fill="#FF7A1A" />
          <path d="M58 64 q22 -14 44 -2" fill="none" strokeWidth="2" />
          <path d="M104 64 q12 6 8 22" fill="none" />
        </g>
      );
    case "dupatta":
      return <path d="M50 96 q-4 -46 30 -50 q34 4 30 50 q-6 -30 -30 -32 q-24 2 -30 32z" fill="#E2207B" stroke="#1C1210" strokeWidth="3" />;
    case "cap":
      return <path d="M56 70 q24 -26 48 0z M100 68 l20 2 l-2 4 l-20 -2z" fill="#0E8A86" stroke="#1C1210" strokeWidth="3" />;
    case "bun":
      return <g fill="#1C1210"><path d="M56 78 q24 -36 48 0 q-24 -14 -48 0z" /><circle cx="80" cy="52" r="10" /></g>;
    default:
      return <path d="M58 74 q22 -26 44 0 q-22 -10 -44 0z" fill="#1C1210" />;
  }
}
function Prop({ kind }: { kind: string }) {
  const s = { stroke: "#1C1210", strokeWidth: 3 };
  switch (kind) {
    case "ladle":
      return <g {...s}><path d="M38 172 l-10 -34" fill="none" /><ellipse cx="27" cy="136" rx="9" ry="6" fill="#8E9B94" /></g>;
    case "steamer":
      return <g {...s}><rect x="16" y="160" width="40" height="14" fill="#B9502B" /><rect x="18" y="148" width="36" height="12" fill="#E2CDA2" /><path d="M28 140 q4 -6 0 -10 M44 140 q4 -6 0 -10" fill="none" strokeWidth="2" /></g>;
    case "tawa":
      return <g {...s}><ellipse cx="34" cy="172" rx="22" ry="7" fill="#1E2B24" /><path d="M56 172 h18" /></g>;
    case "scissors":
      return <g {...s} fill="none"><circle cx="30" cy="178" r="5" /><circle cx="44" cy="178" r="5" /><path d="M33 174 l14 -24 M41 174 l-14 -24" /></g>;
    case "ledger":
      return <g {...s}><rect x="18" y="156" width="34" height="24" fill="#D7261E" /><path d="M24 164 h22 M24 170 h16" strokeWidth="2" /></g>;
    default:
      return (
        <g {...s}>
          <path d="M22 160 h28 l-3 20 h-22z" fill="#8E9B94" />
          <path d="M50 164 q12 2 6 12" fill="none" />
          <path d="M22 162 q-10 -6 -12 -14" fill="none" />
          <path d="M30 150 q3 -5 0 -9 M40 150 q3 -5 0 -9" fill="none" strokeWidth="2" />
        </g>
      );
  }
}

/** Clay gullak with a coin slot. */
export function GullakArt({ size = 120, className = "", style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} style={style} aria-hidden="true">
      <ellipse cx="62" cy="70" rx="44" ry="40" fill="#D7261E" opacity=".3" />
      <path d="M60 18 q-12 0 -12 8 q-34 10 -34 44 q0 40 46 42 q46 -2 46 -42 q0 -34 -34 -44 q0 -8 -12 -8z" fill="#B9502B" stroke="#1C1210" strokeWidth="3" />
      <path d="M26 78 q34 16 68 0" stroke="#6E2C17" strokeWidth="3" fill="none" />
      <path d="M30 60 q30 10 60 0" stroke="#F4B400" strokeWidth="3" fill="none" strokeDasharray="6 5" />
      <rect x="47" y="24" width="26" height="6" rx="3" fill="#1C1210" />
      <path d="M36 44 q-6 10 -4 22" stroke="#F5E9CF" strokeWidth="4" strokeLinecap="round" opacity=".55" fill="none" />
      <path d="M44 106 h32 v6 h-32z" fill="#6E2C17" stroke="#1C1210" strokeWidth="2.5" />
    </svg>
  );
}

/** Bulb string. Each glow is a separate layer whose opacity animates, never a filter. */
export function Bulbs({ n = 12, lit, stagger = 60, delay = 200, className = "" }: { n?: number; lit: boolean; stagger?: number; delay?: number; className?: string }) {
  const w = 360;
  return (
    <svg viewBox={`0 0 ${w} 46`} width="100%" height="46" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d={`M0 6 Q ${w / 2} 40 ${w} 6`} stroke="#1C1210" strokeWidth="2" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const x = t * w;
        const y = 6 + 34 * 4 * t * (1 - t) * 0.5 + 6;
        const col = ["#F4B400", "#D7261E", "#13804F", "#E2207B"][i % 4];
        return (
          <g key={i}>
            <circle cx={x} cy={y + 6} r="13" fill="#FFE6A0" style={{ opacity: lit ? 0.85 : 0.08, transition: `opacity 260ms ease ${delay + i * stagger}ms` }} />
            <path d={`M${x - 2} ${y - 2}h4v4h-4z`} fill="#1C1210" />
            <ellipse cx={x} cy={y + 7} rx="5" ry="7" fill={col} stroke="#1C1210" strokeWidth="1.5" style={{ opacity: lit ? 1 : 0.45, transition: `opacity 200ms ease ${delay + i * stagger}ms` }} />
          </g>
        );
      })}
    </svg>
  );
}

export function Label({ palette, initial, seed, title, pattern, className = "", style }: { palette: string; initial: string; seed: string; title?: string; pattern?: number; className?: string; style?: CSSProperties }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: labelSvg({ palette, initial, seed, title, pattern }) }} />;
}

export function Marigolds({ n = 14 }: { n?: number }) {
  return (
    <svg viewBox={`0 0 ${n * 20} 24`} width="100%" height="24" aria-hidden="true" preserveAspectRatio="none">
      <path d={`M0 4 Q ${n * 10} 20 ${n * 20} 4`} stroke="#13804F" strokeWidth="2" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        return <circle key={i} cx={t * n * 20} cy={4 + 32 * t * (1 - t)} r="6" fill={i % 2 ? "#FF7A1A" : "#F4B400"} stroke="#1C1210" strokeWidth="1.2" />;
      })}
    </svg>
  );
}

export const apronOf = (palette: string) => pal(palette).b;
