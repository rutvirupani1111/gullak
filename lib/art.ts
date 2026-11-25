// Shared art generators. Pure functions, used by the server (counter lookup) and the client (wallet),
// so the matchbox labels and the mohar seal render as the identical SVG string in both places.
import { sha256, utf8 } from "./sha256";

export const PALETTES: Record<string, { a: string; b: string; name: string }> = {
  "haldi-press-red": { a: "#F4B400", b: "#D7261E", name: "Haldi + Laal" },
  "rani-haldi": { a: "#E2207B", b: "#F4B400", name: "Rani + Haldi" },
  "paan-kesar": { a: "#13804F", b: "#FF7A1A", name: "Paan + Kesar" },
  "mor-haldi": { a: "#0E8A86", b: "#F4B400", name: "Mor + Haldi" },
  "press-red-mor": { a: "#D7261E", b: "#0E8A86", name: "Laal + Mor" },
  "kesar-chalk": { a: "#FF7A1A", b: "#1E2B24", name: "Kesar + Chalk" },
  "clay-newsprint": { a: "#B9502B", b: "#F5E9CF", name: "Mitti + Kagaz" },
  "rani-paan": { a: "#E2207B", b: "#13804F", name: "Rani + Paan" },
};
export const pal = (k: string) => PALETTES[k] ?? PALETTES["haldi-press-red"];

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** Text colour on an ink: ink or newsprint, whichever clears 4.5:1. */
export function textOn(bg: string) {
  const L = lum(bg);
  const dark = (L + 0.05) / (lum("#1C1210") + 0.05);
  return dark >= 4.5 ? "#1C1210" : "#F5E9CF";
}

export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const PATTERNS = ["paisley", "rangoli", "sunburst", "tiger", "kite", "rays", "star", "lotus"] as const;

/** Pattern body for a matchbox label of width w and height h. Returns SVG markup (no wrapper). */
export function patternSvg(kind: number, w: number, h: number, a: string, b: string) {
  const cx = w / 2, cy = h / 2;
  let s = "";
  switch (kind % 8) {
    case 0: // paisley
      for (let i = 0; i < 6; i++) {
        const x = (i % 3) * (w / 3) + w / 6, y = i < 3 ? h * 0.22 : h * 0.8;
        s += `<path d="M${x} ${y - 9}c9 0 12 10 4 16c-6 4-14 0-12-6c1-4 6-4 6-1" fill="none" stroke="${b}" stroke-width="2.2"/>`;
      }
      break;
    case 1: // rangoli grid
      for (let x = 10; x < w; x += 20) for (let y = 10; y < h; y += 20) s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${b}"/>`;
      break;
    case 2: // sunburst
      for (let i = 0; i < 24; i++) {
        const t = (i / 24) * Math.PI * 2;
        if (i % 2) continue;
        const t2 = t + Math.PI / 24;
        s += `<path d="M${cx} ${cy}L${cx + Math.cos(t) * w} ${cy + Math.sin(t) * w}L${cx + Math.cos(t2) * w} ${cy + Math.sin(t2) * w}Z" fill="${b}" opacity=".55"/>`;
      }
      break;
    case 3: // tiger stripe
      for (let x = -20; x < w + 20; x += 16) s += `<path d="M${x} 0q8 ${h / 2} -4 ${h}" stroke="${b}" stroke-width="5" fill="none"/>`;
      break;
    case 4: // kite
      for (let i = 0; i < 5; i++) {
        const x = 16 + i * ((w - 32) / 4), y = i % 2 ? h * 0.3 : h * 0.72;
        s += `<path d="M${x} ${y - 10}l7 10l-7 10l-7-10z" fill="${b}"/><path d="M${x} ${y + 10}q4 8 -2 14" stroke="${b}" fill="none"/>`;
      }
      break;
    case 5: // cinema rays
      for (let i = 0; i < 9; i++) s += `<path d="M${cx} ${h + 10}L${(i / 8) * w - 10} -5L${(i / 8) * w + 8} -5Z" fill="${b}" opacity="${i % 2 ? 0.25 : 0.5}"/>`;
      break;
    case 6: // firecracker star
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 ? 0.8 : 0.2) * w, y = (i < 2 ? 0.28 : 0.74) * h;
        let d = "";
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 4 : 11, t = (k / 10) * Math.PI * 2 - Math.PI / 2;
          d += (k ? "L" : "M") + (x + Math.cos(t) * r).toFixed(1) + " " + (y + Math.sin(t) * r).toFixed(1);
        }
        s += `<path d="${d}Z" fill="${b}"/>`;
      }
      break;
    default: // lotus border
      for (let x = 0; x < w; x += 18) {
        s += `<path d="M${x} 10q9 -12 18 0q-9 8 -18 0z" fill="${b}"/><path d="M${x} ${h - 10}q9 12 18 0q-9 -8 -18 0z" fill="${b}"/>`;
      }
  }
  return `<rect width="${w}" height="${h}" fill="${a}"/>${s}`;
}

/** A full matchbox-label cover as an SVG string. */
export function labelSvg(opts: { palette: string; initial: string; seed: string; title?: string; w?: number; h?: number; pattern?: number }) {
  const { a, b } = pal(opts.palette);
  const w = opts.w ?? 180, h = opts.h ?? 110;
  const kind = opts.pattern ?? hashSeed(opts.seed) % 8;
  const ink = textOn(b);
  const title = (opts.title ?? "").replace(/[<&>]/g, "");
  const words = title || opts.initial;
  // the panel grows with the words and the lettering shrinks to fit; a long festival name breaks onto two lines
  // at the space nearest its middle, so it never runs off the label and never shrinks to a whisper
  let lines = [words];
  if ([...words].length > 15 && words.includes(" ")) {
    const mid = words.length / 2;
    let cut = -1;
    for (let i = 0; i < words.length; i++) if (words[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
    lines = [words.slice(0, cut), words.slice(cut + 1)];
  }
  const longest = Math.max(...lines.map((l) => [...l].length));
  const fs = Math.max(10, Math.min(lines.length > 1 ? 18 : 22, Math.floor((w - 36) / Math.max(1, longest * 0.58))));
  const pw = Math.min(w - 24, Math.max(100, Math.ceil(longest * fs * 0.58) + 22));
  const lh = fs * 1.08;
  const ph = lines.length > 1 ? Math.min(h - 24, Math.ceil(lh * 2 + 14)) : Math.max(28, Math.min(40, fs + 18));
  const y0 = h / 2 - ((lines.length - 1) * lh) / 2 + fs * 0.36;
  const txt = lines.map((l, i) => `<text x="${w / 2 + 1.5}" y="${y0 + i * lh + 1}" text-anchor="middle" font-family="var(--f-display)" font-size="${fs}" fill="#1C1210" opacity=".35">${l}</text><text x="${w / 2}" y="${y0 + i * lh}" text-anchor="middle" font-family="var(--f-display)" font-size="${fs}" fill="${ink}">${l}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" aria-hidden="true">
${patternSvg(kind, w, h, a, b)}
<rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="none" stroke="#1C1210" stroke-width="2.5"/>
<rect x="${(w - pw) / 2}" y="${h / 2 - ph / 2}" width="${pw}" height="${ph}" fill="${b}" stroke="#1C1210" stroke-width="2.5"/>
${txt}
</svg>`;
}

const DASHES = ["", "4 3", "1 3", "8 4", "2 2 6 2", "12 3", "3 6", "1 1"];

/** The mohar: a seal glyph derived from the coupon signature. Same input, same string, everywhere. */
export function moharSvg(sigB64: string, palette: string, initial: string) {
  const h = sha256(utf8(sigB64));
  const { a, b } = pal(palette);
  const petals = 5 + (h[0] % 8);
  const rings = 1 + (h[1] % 3);
  const dash = DASHES[h[2] % 8];
  const rot = (h[3] / 255) * 360;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="mohar">`;
  s += `<circle cx="48" cy="48" r="46" fill="${a}" stroke="#1C1210" stroke-width="2"/>`;
  s += `<g transform="rotate(${rot.toFixed(1)} 48 48)">`;
  for (let i = 0; i < petals; i++) {
    const t = (i / petals) * 360;
    s += `<path transform="rotate(${t.toFixed(2)} 48 48)" d="M48 8q7 12 0 22q-7-10 0-22z" fill="${b}" stroke="#1C1210" stroke-width="1"/>`;
  }
  for (let r = 0; r < rings; r++) s += `<circle cx="48" cy="48" r="${30 - r * 5}" fill="none" stroke="#1C1210" stroke-width="1.6" stroke-dasharray="${dash}"/>`;
  for (let i = 0; i < 8; i++) {
    const bit = (h[4 + (i >> 2)] >> (i % 4) * 2) & 3;
    if (!bit) continue;
    const t = (i / 8) * Math.PI * 2;
    s += `<circle cx="${(48 + Math.cos(t) * 38).toFixed(1)}" cy="${(48 + Math.sin(t) * 38).toFixed(1)}" r="${1 + bit}" fill="#1C1210"/>`;
  }
  s += `</g><circle cx="48" cy="48" r="15" fill="#F5E9CF" stroke="#1C1210" stroke-width="2"/>`;
  s += `<text x="48" y="55" text-anchor="middle" font-family="var(--f-display)" font-size="20" fill="#1C1210">${initial.replace(/[<&>]/g, "")}</text></svg>`;
  return s;
}

export const rupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
