// The three game props as they sit on the handcart (O3): a chakri, a lottery patti and a clay gullak.
const COLS = ["#F4B400", "#D7261E", "#13804F", "#E2207B", "#0E8A86", "#FF7A1A"];

export function GameProp({ game, size = 80 }: { game: string; size?: number }) {
  const h = Math.round(size * 0.75);
  if (game === "chakri")
    return (
      <svg viewBox="0 0 80 60" width={size} height={h} aria-hidden="true">
        <ellipse cx="41.5" cy="31" rx="27" ry="27" fill="#D7261E" opacity=".3" />
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            d={`M40 30 L${40 + 26 * Math.sin((i * Math.PI) / 4)} ${30 - 26 * Math.cos((i * Math.PI) / 4)} A26 26 0 0 1 ${40 + 26 * Math.sin(((i + 1) * Math.PI) / 4)} ${30 - 26 * Math.cos(((i + 1) * Math.PI) / 4)}Z`}
            fill={COLS[i % 6]}
            stroke="#1C1210"
            strokeWidth="1.5"
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={"p" + i} cx={40 + 23 * Math.sin((i * Math.PI) / 4)} cy={30 - 23 * Math.cos((i * Math.PI) / 4)} r="1.6" fill="#1C1210" />
        ))}
        <circle cx="40" cy="30" r="5" fill="#F5E9CF" stroke="#1C1210" strokeWidth="2" />
        <path d="M40 2 l4 7 h-8z" fill="#1C1210" />
      </svg>
    );
  if (game === "patti")
    return (
      <svg viewBox="0 0 80 60" width={size} height={h} aria-hidden="true">
        <rect x="8.5" y="11" width="68" height="40" fill="#D7261E" opacity=".3" />
        <rect x="6" y="9" width="68" height="40" fill="#F5E9CF" stroke="#1C1210" strokeWidth="2.5" />
        <path d="M6 17 h68" stroke="#E2207B" strokeWidth="3" />
        <rect x="14" y="22" width="52" height="20" fill="#A8AFAA" stroke="#1C1210" strokeWidth="1.5" />
        <path d="M18 36 q10 -10 18 0 t20 -4" stroke="#F5E9CF" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="66" cy="45" r="4" fill="#F4B400" stroke="#1C1210" strokeWidth="1.5" />
      </svg>
    );
  return (
    <svg viewBox="0 0 80 60" width={size} height={h} aria-hidden="true">
      <path d="M41.5 7 q-20 3 -20 24 q0 20 20 20 q20 0 20 -20 q0 -21 -20 -24z" fill="#D7261E" opacity=".3" />
      <path d="M40 6 q-20 3 -20 24 q0 20 20 20 q20 0 20 -20 q0 -21 -20 -24z" fill="#B9502B" stroke="#1C1210" strokeWidth="2.5" />
      <path d="M24 34 q16 8 32 0" stroke="#F4B400" strokeWidth="2" strokeDasharray="4 3" fill="none" />
      <rect x="32" y="10" width="16" height="4" rx="2" fill="#1C1210" />
      <circle cx="66" cy="16" r="7" fill="#F4B400" stroke="#1C1210" strokeWidth="2" />
      <path d="M60 26 q-6 -4 -10 -12" stroke="#1C1210" strokeWidth="1.5" strokeDasharray="2 3" fill="none" />
    </svg>
  );
}
