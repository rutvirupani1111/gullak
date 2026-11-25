// The top of the lane at dusk: printed sunset bands, kites on their strings, far rooftops with
// water tanks and a tower, and the clay gullak on the parapet taking a coin.
const INK = "#1C1210";

export function Sky() {
  const bands = ["#F4B400", "#FF9A1F", "#FF7A1A", "#E2207B"];
  return (
    <svg className="sky" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" aria-hidden="true">
      <defs>
        {bands.map((c, i) => (
          <pattern key={c} id={`dots${i}`} width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="2.2" fill={c} />
          </pattern>
        ))}
      </defs>
      {/* stepped ink bands with halftone seams, like an offset-printed sunset */}
      {bands.map((c, i) => (
        <g key={c}>
          <rect x="0" y={i * 62} width="400" height="68" fill={c} />
          {i > 0 && <rect x="0" y={i * 62 - 10} width="400" height="12" fill={`url(#dots${i})`} />}
        </g>
      ))}
      <rect x="0" y="246" width="400" height="60" fill="#6E2C17" />

      {/* sun, with its second plate pressed off-register */}
      <circle cx="268" cy="190" r="58" fill="#E2207B" opacity=".55" transform="translate(3 2)" />
      <circle cx="268" cy="190" r="58" fill="#FFE6A0" />
      <path d="M210 196 h116 M214 206 h108 M220 216 h96" stroke="#FF7A1A" strokeWidth="4" />

      {/* kites and their strings, swaying */}
      <g className="kite" style={{ transformOrigin: "70px 70px" }}>
        <path d="M70 46 l18 24 l-18 24 l-18 -24z" fill="#D7261E" stroke={INK} strokeWidth="2.5" />
        <path d="M70 46 v48 M52 70 h36" stroke={INK} strokeWidth="1.5" />
        <path d="M70 94 l-6 10 h12z" fill="#13804F" stroke={INK} strokeWidth="1.5" />
        <path d="M70 70 q-40 80 -90 240" stroke={INK} strokeWidth="1" fill="none" opacity=".6" />
      </g>
      <g className="kite k2" style={{ transformOrigin: "176px 34px" }}>
        <path d="M176 18 l12 16 l-12 16 l-12 -16z" fill="#0E8A86" stroke={INK} strokeWidth="2" />
        <path d="M176 18 v32" stroke={INK} strokeWidth="1.2" />
        <path d="M176 34 q30 90 -20 270" stroke={INK} strokeWidth="1" fill="none" opacity=".5" />
      </g>
      <g className="kite k3" style={{ transformOrigin: "352px 58px" }}>
        <path d="M352 40 l15 18 l-15 18 l-15 -18z" fill="#F5E9CF" stroke={INK} strokeWidth="2.2" />
        <path d="M352 40 l15 18 l-15 18z" fill="#E2207B" />
        <path d="M352 58 q30 120 60 250" stroke={INK} strokeWidth="1" fill="none" opacity=".5" />
      </g>

      {/* far rooftops: water tanks, a dish, a mobile tower, a temple, a clothesline */}
      <g className="roofs">
        <path
          d="M0 300 V232 h34 v-14 h22 v14 h20 v-30 h40 v30 h16 v-46 l14 -16 l14 16 v46 h24 v-22 h52 v22 h18 v-40 h36 v40 h30 v-18 h46 v18 h34 v68z"
          fill="#6E2C17"
          stroke={INK}
          strokeWidth="2"
        />
        <rect x="80" y="186" width="22" height="18" rx="4" fill={INK} />
        <rect x="246" y="194" width="22" height="18" rx="4" fill={INK} />
        <path d="M352 214 a12 12 0 0 1 22 -8" fill="none" stroke={INK} strokeWidth="3" />
        <path d="M363 210 v-8" stroke={INK} strokeWidth="2" />
        <path d="M144 170 l-10 -40 l20 0z M144 130 v-14" fill={INK} stroke={INK} strokeWidth="2" />
        <path d="M300 192 l10 -70 l10 70 M303 172 h14 M306 150 h8 M300 192 l20 -40 M320 192 l-20 -40" stroke={INK} strokeWidth="1.6" fill="none" />
        <circle cx="310" cy="120" r="3" fill="#D7261E" className="blink" />
        <path d="M176 210 q40 10 80 0" stroke={INK} strokeWidth="1" fill="none" />
        {[188, 206, 226, 242].map((x, i) => (
          <rect key={x} x={x} y={209 + (i % 2) * 2} width="9" height="12" fill={["#F4B400", "#13804F", "#F5E9CF", "#0E8A86"][i]} stroke={INK} strokeWidth="1" />
        ))}
      </g>
    </svg>
  );
}
