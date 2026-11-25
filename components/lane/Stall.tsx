// L1: one shopfront on the lane, printed like a matchbox label. Four kinds share one frame:
// signboard, scalloped awning, back wall, the shop's own puppet, and a counter with a tin QR plate.
import { Keeper, type KeeperT } from "@/components/art";
import { patternSvg } from "@/lib/art";

const INK = "#1C1210";
const PAPER = "#F5E9CF";

export type StallKind = "tapri" | "momo" | "kirana" | "salon";

export function Stall({ kind, name, a, b, keeper, pattern }: { kind: StallKind; name: string; a: string; b: string; keeper: KeeperT; pattern: number }) {
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg viewBox="0 0 300 290" width="100%" height="100%" role="img" aria-label={name} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <pattern id={`ht-${kind}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" fill={INK} opacity=".18" />
        </pattern>
        <clipPath id={`sign-${kind}`}>
          <rect x="44" y="6" width="212" height="44" />
        </clipPath>
      </defs>

      {/* ground step and shadow */}
      <path d="M0 262 h300 l-10 26 h-280z" fill="#8E9B94" stroke={INK} strokeWidth="3" />
      <path d="M14 270 h60 M96 276 h48 M168 270 h70 M250 278 h30" stroke={INK} strokeWidth="1.5" opacity=".45" />

      {/* pillars and back wall */}
      <rect x="18" y="74" width="264" height="190" fill="#E2CDA2" stroke={INK} strokeWidth="3" />
      <rect x="18" y="74" width="264" height="190" fill={`url(#ht-${kind})`} />
      <rect x="18" y="74" width="16" height="190" fill={b} stroke={INK} strokeWidth="3" />
      <rect x="266" y="74" width="16" height="190" fill={b} stroke={INK} strokeWidth="3" />

      <Wall kind={kind} a={a} b={b} />

      {/* the dukaandaar stands behind the counter */}
      <g transform="translate(96 92)">
        <Keeper k={keeper} apron={b} size={108} />
      </g>

      {/* counter: wooden top, tin front with the QR plate */}
      <rect x="26" y="196" width="248" height="14" fill="#7A4A26" stroke={INK} strokeWidth="3" />
      <rect x="34" y="210" width="232" height="52" fill="#8A5A32" stroke={INK} strokeWidth="3" />
      <path d="M92 210 v52 M150 210 v52 M208 210 v52" stroke={INK} strokeWidth="1.5" opacity=".4" />
      <g transform="translate(126 214)">
        <rect x="2" y="2" width="44" height="44" fill={INK} />
        <rect width="44" height="44" fill={PAPER} stroke={INK} strokeWidth="2.5" />
        <QrGlyph />
      </g>
      <Counter kind={kind} a={a} b={b} />

      {/* awning: scalloped stripes, with the second ink plate pressed 1.5px off */}
      <g transform="translate(1.5 1)" opacity=".45" style={{ mixBlendMode: "multiply" }}>
        <path d="M8 52 h284 v28 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0 q-14 14 -28.4 0z" fill="#E2207B" />
      </g>
      {stripes.map((i) => (
        <path
          key={i}
          d={`M${8 + i * 28.4} 52 h28.4 v28 q-14.2 14 -28.4 0z`}
          fill={i % 2 ? PAPER : a}
          stroke={INK}
          strokeWidth="2.5"
        />
      ))}

      {/* signboard: a matchbox label with the shop name, truck-lettered */}
      <rect x="47" y="9" width="212" height="44" fill={INK} />
      <g clipPath={`url(#sign-${kind})`} dangerouslySetInnerHTML={{ __html: `<g transform="translate(44 6)">${patternSvg(pattern, 212, 44, a, b)}</g>` }} />
      <rect x="44" y="6" width="212" height="44" fill="none" stroke={INK} strokeWidth="3" />
      <rect x="66" y="13" width="168" height="30" fill={PAPER} stroke={INK} strokeWidth="2.5" />
      <text x="151.5" y="35" textAnchor="middle" fontSize="17" fill={b} style={{ fontFamily: "var(--f-display)" }}>{name}</text>
      <text x="150" y="34" textAnchor="middle" fontSize="17" fill={INK} stroke={PAPER} strokeWidth="0.6" style={{ fontFamily: "var(--f-display)", paintOrder: "stroke" }}>{name}</text>
    </svg>
  );
}

function QrGlyph() {
  // a fixed little QR-ish grid: three finder squares and a scatter of modules
  const cells = [5, 7, 9, 12, 14, 18, 19, 22, 25, 27, 30, 31, 33, 36, 38, 41, 43, 44, 47];
  return (
    <g>
      {[[5, 5], [27, 5], [5, 27]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="12" height="12" fill={INK} />
          <rect x={x + 2.5} y={y + 2.5} width="7" height="7" fill={PAPER} />
          <rect x={x + 4.5} y={y + 4.5} width="3" height="3" fill={INK} />
        </g>
      ))}
      {cells.map((c) => (
        <rect key={c} x={21 + (c % 6) * 3.4} y={21 + Math.floor(c / 6) * 2.6} width="3" height="2.4" fill={INK} />
      ))}
    </g>
  );
}

function Wall({ kind, a, b }: { kind: StallKind; a: string; b: string }) {
  if (kind === "kirana")
    return (
      <g stroke={INK} strokeWidth="2">
        {[100, 140].map((y, r) => (
          <g key={y}>
            <rect x="40" y={y + 24} width="220" height="6" fill="#6E2C17" />
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x={46 + i * 24} y={y + (i % 3) * 3} width="18" height={24 - (i % 3) * 3} fill={[a, b, "#13804F", PAPER, "#E2207B", "#0E8A86"][(i + r * 2) % 6]} />
            ))}
          </g>
        ))}
      </g>
    );
  if (kind === "salon")
    return (
      <g stroke={INK} strokeWidth="2.5">
        <ellipse cx="72" cy="128" rx="26" ry="36" fill="#BFD7D2" />
        <path d="M58 108 l14 -10" stroke="#F5E9CF" strokeWidth="3" />
        <ellipse cx="228" cy="128" rx="26" ry="36" fill="#BFD7D2" />
        <path d="M214 108 l14 -10" stroke="#F5E9CF" strokeWidth="3" />
        <rect x="140" y="84" width="20" height="8" fill={a} />
      </g>
    );
  if (kind === "momo")
    return (
      <g stroke={INK} strokeWidth="2">
        <path d="M42 96 h216" strokeDasharray="2 6" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${54 + i * 38} 96 v10 q0 10 8 10 q8 0 8 -10 v-10`} fill={i % 2 ? a : "#F4B400"} />
        ))}
        <rect x="200" y="128" width="54" height="36" fill={PAPER} />
        <text x="227" y="152" textAnchor="middle" fontSize="13" fontWeight="800" fill={b} stroke="none">MOMO</text>
      </g>
    );
  return (
    <g stroke={INK} strokeWidth="2">
      <rect x="44" y="96" width="50" height="34" fill={PAPER} />
      <text x="69" y="118" textAnchor="middle" fontSize="12" fontWeight="800" fill={b} stroke="none">CHAI</text>
      <path d="M200 112 h60" />
      {Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={`M${204 + i * 14} 98 h10 l-1.5 14 h-7z`} fill="#F4E1B0" />
      ))}
      <path d="M210 150 q10 -12 20 0" fill="none" opacity=".5" />
    </g>
  );
}

function Counter({ kind, a, b }: { kind: StallKind; a: string; b: string }) {
  if (kind === "tapri")
    return (
      <g stroke={INK} strokeWidth="2.5">
        <rect x="48" y="176" width="44" height="20" fill="#6E2C17" />
        <path d="M54 176 q0 -30 16 -30 q16 0 16 30z" fill="#8E9B94" />
        <path d="M86 160 l14 -10" />
        <path d="M62 140 q4 -10 0 -18 M72 138 q4 -10 0 -18" fill="none" strokeWidth="2" opacity=".55" className="steam" />
        {Array.from({ length: 3 }, (_, i) => (
          <g key={i}>
            <path d={`M${206 + i * 20} 178 h14 l-2 18 h-10z`} fill="#F4E1B0" />
            <rect x={208.5 + i * 20} y="184" width="9" height="11" fill="#B9502B" stroke="none" />
          </g>
        ))}
      </g>
    );
  if (kind === "momo")
    return (
      <g stroke={INK} strokeWidth="2.5">
        {[0, 1, 2].map((i) => (
          <rect key={i} x={54 + i * 3} y={180 - i * 14} width={50 - i * 6} height="14" fill={i === 2 ? "#E2CDA2" : "#B9502B"} />
        ))}
        <path d="M66 148 q4 -10 0 -18 M80 146 q4 -10 0 -18 M94 148 q4 -10 0 -18" fill="none" strokeWidth="2" opacity=".55" className="steam" />
        <ellipse cx="226" cy="190" rx="26" ry="6" fill="#F5E9CF" />
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${208 + i * 9} 188 q4 -10 8 0z`} fill="#FBF4E2" strokeWidth="1.5" />
        ))}
      </g>
    );
  if (kind === "kirana")
    return (
      <g stroke={INK} strokeWidth="2.5">
        <rect x="52" y="168" width="34" height="28" fill={a} />
        <rect x="58" y="160" width="22" height="8" fill="#6E2C17" />
        <path d="M206 196 l10 -26 h32 l10 26z" fill="#C8962E" />
        <path d="M232 170 v-22 M222 148 h20" />
      </g>
    );
  return (
    <g stroke={INK} strokeWidth="2.5">
      <rect x="50" y="170" width="20" height="26" fill={b} />
      <rect x="74" y="164" width="14" height="32" fill={a} />
      <path d="M216 196 q0 -24 18 -24 q18 0 18 24z" fill="#8E9B94" />
    </g>
  );
}
