"use client";
// O4: the sign-painter's bench. The preview IS the export: one canvas painter draws the poster at
// print resolution, the bench shows it scaled down under a creased-paper overlay. A stall photo the
// owner drops in stays inside this canvas and is never uploaded.
import { useCallback, useEffect, useRef, useState } from "react";
import { pal } from "@/lib/art";
import { qrReader } from "@/lib/qrscan";
import { Help } from "./Small";

type Shop = { slug: string; name: string; name_local: string | null; address: string; city: string; palette: string; initial: string };
type Tpl = { id: string; label: string; w: number; h: number; pt: [number, number]; tent?: boolean; fixed?: boolean };
const TPL: Tpl[] = [
  { id: "a4", label: "A4 deewar poster", w: 1240, h: 1754, pt: [595.28, 841.89] },
  { id: "a5", label: "A5 counter card", w: 874, h: 1240, pt: [419.53, 595.28] },
  { id: "tent", label: "Table tent (modo)", w: 1754, h: 1240, pt: [841.89, 595.28], tent: true },
  { id: "sticker", label: "4x6 sticker", w: 600, h: 900, pt: [288, 432] },
  { id: "status", label: "WhatsApp status", w: 1080, h: 1920, pt: [540, 960], fixed: true },
];
const COPY: Record<string, { name: string; head: string; sub: string; foot: string; deva?: boolean }> = {
  hinglish: { name: "Hinglish", head: "Scan karo, khelo, jeeto", sub: "10 second ka khel. Inaam seedha aapki gullak mein.", foot: "Koi download nahi. Koi kharidaari zaroori nahi." },
  hi: { name: "हिंदी", head: "स्कैन करो, खेलो, जीतो", sub: "10 सेकंड का खेल। इनाम सीधा आपकी गुल्लक में।", foot: "कोई डाउनलोड नहीं। कुछ ख़रीदना ज़रूरी नहीं।", deva: true },
  en: { name: "English", head: "Scan, play, win", sub: "A 10 second game. The prize goes straight into your gullak.", foot: "No download. No purchase needed." },
  mr: { name: "मराठी", head: "स्कॅन करा, खेळा, जिंका", sub: "१० सेकंदांचा खेळ. बक्षीस थेट तुमच्या गुल्लकमध्ये.", foot: "डाउनलोड नको. खरेदी आवश्यक नाही.", deva: true },
  gu: { name: "ગુજરાતી", head: "સ્કેન કરો, રમો, જીતો", sub: "૧૦ સેકન્ડની રમત. ઇનામ સીધું તમારી ગુલ્લકમાં.", foot: "કોઈ ડાઉનલોડ નહીં. ખરીદી જરૂરી નથી." },
  ta: { name: "தமிழ்", head: "ஸ்கேன் செய், விளையாடு, வெல்", sub: "10 வினாடி விளையாட்டு. பரிசு நேராக உங்கள் உண்டியலில்.", foot: "டவுன்லோடு வேண்டாம். வாங்க வேண்டியதில்லை." },
  bn: { name: "বাংলা", head: "স্ক্যান করুন, খেলুন, জিতুন", sub: "১০ সেকেন্ডের খেলা। পুরস্কার সোজা আপনার গুল্লকে।", foot: "কোনো ডাউনলোড নয়। কেনাকাটা জরুরি নয়।" },
};
const STALLS: [string, string][] = [["tapri", "Tapri"], ["thela", "Thela"], ["kirana", "Kirana"], ["mithai", "Mithai thali"], ["salon", "Salon kursi"]];
const INK = "#1C1210", PAPER = "#F5E9CF";

function fam(v: string, fallback: string) {
  const f = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return `${f ? f + ", " : ""}${fallback}`;
}
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
function fitText(g: CanvasRenderingContext2D, text: string, font: (px: number) => string, max: number, start: number) {
  let px = start;
  g.font = font(px);
  while (g.measureText(text).width > max && px > 10) g.font = font((px -= 2));
  return px;
}
function wrap(g: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawStall(g: CanvasRenderingContext2D, kind: string, x: number, y: number, w: number, h: number, a: string, b: string) {
  g.save();
  g.translate(x, y);
  g.lineWidth = Math.max(3, w / 120);
  g.strokeStyle = INK;
  g.lineJoin = "round";
  const s = w / 400;
  g.scale(s, s);
  const H = h / s;
  const fillStroke = (fill: string) => { g.fillStyle = fill; g.fill(); g.stroke(); };
  // ground shadow
  g.fillStyle = "rgba(28,18,16,.18)";
  g.beginPath(); g.ellipse(200, H - 10, 180, 12, 0, 0, Math.PI * 2); g.fill();
  if (kind === "thela") {
    g.beginPath(); g.rect(40, H - 150, 320, 70); fillStroke(b);
    g.beginPath(); g.rect(60, H - 210, 280, 60); fillStroke(PAPER);
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(95 + i * 52, H - 180, 18, 0, Math.PI * 2); fillStroke(i % 2 ? "#F4B400" : "#FF7A1A"); }
    [110, 290].forEach((cx) => { g.beginPath(); g.arc(cx, H - 60, 42, 0, Math.PI * 2); fillStroke("#6E2C17"); g.beginPath(); g.arc(cx, H - 60, 8, 0, Math.PI * 2); fillStroke(PAPER); });
    g.beginPath(); g.moveTo(360, H - 140); g.lineTo(395, H - 175); g.stroke();
    g.beginPath(); g.moveTo(40, H - 210); g.lineTo(200, H - 290); g.lineTo(360, H - 210); g.closePath(); fillStroke(a);
  } else if (kind === "kirana") {
    g.beginPath(); g.rect(30, 30, 340, H - 60); fillStroke("#8A5A32");
    for (let r = 0; r < 3; r++) {
      const yy = 50 + r * ((H - 120) / 3);
      g.beginPath(); g.rect(44, yy + (H - 120) / 3 - 14, 312, 12); fillStroke("#6E2C17");
      for (let i = 0; i < 6; i++) { g.beginPath(); g.rect(54 + i * 50, yy + 20, 36, (H - 120) / 3 - 34); fillStroke([a, b, "#F4B400", "#13804F", PAPER, "#E2207B"][(i + r) % 6]); }
    }
    g.beginPath(); g.rect(10, H - 70, 380, 60); fillStroke(b);
  } else if (kind === "mithai") {
    g.beginPath(); g.ellipse(200, H - 70, 180, 50, 0, 0, Math.PI * 2); fillStroke("#C8962E");
    g.beginPath(); g.ellipse(200, H - 78, 150, 36, 0, 0, Math.PI * 2); fillStroke("#E0B04A");
    for (let i = 0; i < 9; i++) { const ang = (i / 9) * Math.PI * 2; g.beginPath(); g.arc(200 + Math.cos(ang) * 95, H - 82 + Math.sin(ang) * 20, 22, 0, Math.PI * 2); fillStroke(i % 3 === 0 ? "#FF7A1A" : i % 3 === 1 ? PAPER : "#F4B400"); }
    g.beginPath(); g.arc(200, H - 86, 26, 0, Math.PI * 2); fillStroke(b);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(150 + i * 50, H - 150); g.quadraticCurveTo(160 + i * 50, H - 190, 145 + i * 50, H - 220); g.stroke(); }
  } else if (kind === "salon") {
    g.beginPath(); g.rect(110, 20, 180, H - 200); fillStroke("#BFD7D2");
    g.beginPath(); g.moveTo(130, 50); g.lineTo(170, 30); g.stroke();
    g.beginPath(); g.rect(130, H - 170, 140, 60); fillStroke(b);
    g.beginPath(); g.rect(120, H - 230, 160, 70); fillStroke(a);
    g.beginPath(); g.rect(185, H - 110, 30, 60); fillStroke("#8E9B94");
    g.beginPath(); g.ellipse(200, H - 40, 70, 14, 0, 0, Math.PI * 2); fillStroke("#8E9B94");
  } else {
    // tapri: tin counter, kettle on a stove, glasses
    g.beginPath(); g.rect(30, H - 170, 340, 150); fillStroke(b);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(80 + i * 80, H - 170); g.lineTo(76 + i * 80, H - 20); g.globalAlpha = 0.3; g.stroke(); g.globalAlpha = 1; }
    g.beginPath(); g.rect(60, H - 210, 120, 40); fillStroke("#6E2C17");
    g.beginPath(); g.moveTo(80, H - 210); g.quadraticCurveTo(80, H - 300, 130, H - 300); g.quadraticCurveTo(180, H - 300, 170, H - 210); g.closePath(); fillStroke("#8E9B94");
    g.beginPath(); g.moveTo(170, H - 260); g.lineTo(205, H - 285); g.stroke();
    g.beginPath(); g.moveTo(100, H - 300); g.quadraticCurveTo(130, H - 330, 160, H - 300); g.stroke();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(110 + i * 15, H - 320); g.quadraticCurveTo(120 + i * 15, H - 345, 105 + i * 15, H - 370); g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1; }
    for (let i = 0; i < 4; i++) { const gx = 225 + i * 34; g.beginPath(); g.moveTo(gx, H - 225); g.lineTo(gx + 26, H - 225); g.lineTo(gx + 22, H - 175); g.lineTo(gx + 4, H - 175); g.closePath(); fillStroke("#F4E1B0"); g.beginPath(); g.rect(gx + 4, H - 205, 18, 28); g.fillStyle = "#B9502B"; g.fill(); }
    g.beginPath(); g.moveTo(10, H - 170); g.lineTo(390, H - 170); g.lineTo(370, H - 190); g.lineTo(30, H - 190); g.closePath(); fillStroke(a);
  }
  g.restore();
}

export default function PosterBench({ shop, qr, qrText, url }: { shop: Shop; qr: string; qrText: string; url: string }) {
  const [tpl, setTpl] = useState(TPL[0]);
  const [lang, setLang] = useState("hinglish");
  const [stall, setStall] = useState("tapri");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [check, setCheck] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // where the QR landed on the last painted canvas, so the PDF can lay crisp vector modules exactly over it
  const qrBoxes = useRef<{ W: number; boxes: { x: number; y: number; s: number; rot: boolean }[] }>({ W: 1, boxes: [] });
  const p = pal(shop.palette);

  const paint = useCallback(async (c: HTMLCanvasElement, scale: number) => {
    await document.fonts.ready;
    const W = Math.round(tpl.w * scale), H = Math.round(tpl.h * scale);
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    const qrImg = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(qr));
    const ph = photo ? await loadImg(photo) : null;
    const display = fam("--f-display", "sans-serif"), body = fam("--f-body", "'Nirmala UI', sans-serif"), mono = fam("--f-mono", "monospace"), serif = fam("--f-serif", "serif");
    const copy = COPY[lang];
    const boxes: { x: number; y: number; s: number; rot: boolean }[] = [];
    const panel = (pw: number, ph2: number) => {
      const u = pw / 100;
      g.fillStyle = PAPER; g.fillRect(0, 0, pw, ph2);
      // halftone wash
      g.fillStyle = p.a;
      for (let yy = 0; yy < ph2 * 0.3; yy += u * 1.6) for (let xx = 0; xx < pw; xx += u * 1.6) { const r = u * 0.55 * (1 - yy / (ph2 * 0.3)); if (r > 0.2) { g.beginPath(); g.arc(xx + ((yy / (u * 1.6)) % 2) * u * 0.8, yy, r, 0, Math.PI * 2); g.fill(); } }
      // banner with rays
      const bh = ph2 * 0.16;
      g.save(); g.beginPath(); g.rect(0, 0, pw, bh); g.clip();
      g.fillStyle = p.a; g.fillRect(0, 0, pw, bh);
      g.fillStyle = p.b; g.globalAlpha = 0.35;
      for (let i = 0; i < 18; i++) { const t0 = (i / 18) * Math.PI, t1 = t0 + Math.PI / 36; g.beginPath(); g.moveTo(pw / 2, bh * 1.4); g.lineTo(pw / 2 + Math.cos(Math.PI + t0) * pw, bh * 1.4 + Math.sin(Math.PI + t0) * pw); g.lineTo(pw / 2 + Math.cos(Math.PI + t1) * pw, bh * 1.4 + Math.sin(Math.PI + t1) * pw); g.fill(); }
      g.restore(); g.globalAlpha = 1;
      g.lineWidth = u * 0.6; g.strokeStyle = INK; g.strokeRect(u * 2, u * 2, pw - u * 4, ph2 - u * 4);
      g.beginPath(); g.moveTo(0, bh); g.lineTo(pw, bh); g.stroke();
      // shop name, truck-lettered
      const name = (copy.deva && shop.name_local) || shop.name;
      const npx = fitText(g, name, (px) => `${px}px ${display}`, pw * 0.86, bh * 0.62);
      g.textAlign = "center"; g.textBaseline = "middle";
      g.lineJoin = "round"; g.lineWidth = npx * 0.12;
      g.fillStyle = p.b; g.fillText(name, pw / 2 + npx * 0.06, bh * 0.55 + npx * 0.06);
      g.strokeStyle = INK; g.strokeText(name, pw / 2, bh * 0.55);
      g.fillStyle = p.a === "#F5E9CF" ? INK : PAPER; g.fillText(name, pw / 2, bh * 0.55);
      // headline
      let y = bh + u * 7;
      const hpx = fitText(g, copy.head, (px) => `${px}px ${display}`, pw * 0.88, u * 9);
      g.fillStyle = "#D7261E"; g.fillText(copy.head, pw / 2, y);
      y += hpx * 0.75;
      g.font = `600 ${u * 3.1}px ${body}`; g.fillStyle = INK;
      for (const line of wrap(g, copy.sub, pw * 0.8)) { g.fillText(line, pw / 2, y); y += u * 4; }
      // QR on a white plate, with the stall beside or below
      const qs = Math.min(pw * 0.5, ph2 * 0.34);
      const qx = pw / 2 - qs / 2, qy = y + u * 2;
      g.fillStyle = INK; g.fillRect(qx - u * 2 + u, qy - u * 2 + u, qs + u * 4, qs + u * 4);
      g.fillStyle = "#FFFFFF"; g.fillRect(qx - u * 2, qy - u * 2, qs + u * 4, qs + u * 4);
      g.strokeRect(qx - u * 2, qy - u * 2, qs + u * 4, qs + u * 4);
      g.imageSmoothingEnabled = false;
      g.drawImage(qrImg, qx, qy, qs, qs);
      g.imageSmoothingEnabled = true;
      {
        const m = g.getTransform();
        const a = m.transformPoint(new DOMPoint(qx, qy)), b = m.transformPoint(new DOMPoint(qx + qs, qy + qs));
        boxes.push({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), s: Math.abs(b.x - a.x), rot: a.x > b.x });
      }
      // marigold corners
      [[qx - u * 2, qy - u * 2], [qx + qs + u * 2, qy - u * 2], [qx - u * 2, qy + qs + u * 2], [qx + qs + u * 2, qy + qs + u * 2]].forEach(([cx, cy]) => {
        for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(cx + Math.cos(k * 0.785) * u * 1.4, cy + Math.sin(k * 0.785) * u * 1.4, u * 1.1, 0, Math.PI * 2); g.fillStyle = "#FF7A1A"; g.fill(); g.stroke(); }
        g.beginPath(); g.arc(cx, cy, u * 1, 0, Math.PI * 2); g.fillStyle = "#F4B400"; g.fill();
      });
      y = qy + qs + u * 6;
      g.font = `700 ${u * 3.4}px ${mono}`; g.fillStyle = INK; g.fillText(url, pw / 2, y);
      y += u * 4.4;
      g.font = `500 ${u * 2.6}px ${serif}`;
      g.fillText(`${shop.address}, ${shop.city}`.slice(0, 70), pw / 2, y);
      // stall art or the owner's photo fills the rest
      const top = y + u * 3, bottom = ph2 - u * 10, sh = bottom - top;
      if (sh > u * 12) {
        const sw = Math.min(pw * 0.7, sh * 1.6);
        if (ph) {
          const r = Math.max(sw / ph.width, sh / ph.height);
          g.save(); g.beginPath(); g.rect(pw / 2 - sw / 2, top, sw, sh); g.clip();
          g.drawImage(ph, pw / 2 - (ph.width * r) / 2, top + sh / 2 - (ph.height * r) / 2, ph.width * r, ph.height * r);
          g.restore(); g.lineWidth = u * 0.6; g.strokeRect(pw / 2 - sw / 2, top, sw, sh);
        } else drawStall(g, stall, pw / 2 - sw / 2, top, sw, sh, p.a, p.b);
      }
      // footer strip
      g.fillStyle = INK; g.fillRect(u * 2, ph2 - u * 8, pw - u * 4, u * 6);
      g.fillStyle = PAPER; g.font = `700 ${Math.min(u * 2.6, fitText(g, copy.foot, (px) => `700 ${px}px ${body}`, pw * 0.9, u * 2.6))}px ${body}`;
      g.fillText(copy.foot, pw / 2, ph2 - u * 5);
    };
    if (tpl.tent) {
      // two mirrored halves, folded along the middle, with fold and crop marks
      const half = H / 2;
      g.save(); g.translate(W, half); g.rotate(Math.PI); panel(W, half); g.restore();
      g.save(); g.translate(0, half); panel(W, half); g.restore();
      g.setLineDash([W / 80, W / 120]); g.strokeStyle = INK; g.lineWidth = Math.max(2, W / 600);
      g.beginPath(); g.moveTo(0, half); g.lineTo(W, half); g.stroke(); g.setLineDash([]);
      g.font = `600 ${W / 90}px ${body}`; g.fillStyle = INK; g.textAlign = "left"; g.fillText("yahan modo / fold here", W / 60, half - W / 140);
      const m = W / 50;
      [[0, 0], [W, 0], [0, H], [W, H]].forEach(([cx, cy]) => { g.beginPath(); g.moveTo(cx, cy + (cy ? -m : m)); g.lineTo(cx, cy); g.lineTo(cx + (cx ? -m : m), cy); g.stroke(); });
    } else panel(W, H);
    qrBoxes.current = { W, boxes };
  }, [tpl, lang, stall, photo, qr, shop, url, p.a, p.b]);

  useEffect(() => {
    if (canvas.current) paint(canvas.current, 0.5).catch(() => {});
  }, [paint]);

  /** Ticks "QR poster print karo" on the owner's home on this phone. */
  function markDone() {
    try { localStorage.setItem("gk.poster." + shop.slug, "1"); } catch {}
  }
  async function render() {
    const c = document.createElement("canvas");
    const lowMem = ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 2;
    await paint(c, tpl.fixed ? 1 : lowMem ? 1 : 2);
    return c;
  }
  async function selfTest(c: HTMLCanvasElement): Promise<boolean | null> {
    // decode the rendered poster exactly as a customer's camera would; a poster whose QR does not read is never handed out
    const raw = await qrReader(1400).read(c);
    return raw ? raw.includes(`/s/${shop.slug}`) : false;
  }
  async function png(share = false) {
    setBusy("png");
    const c = await render();
    const ok = await selfTest(c);
    setCheck(ok === null ? "Is browser mein QR khud jaanch nahi sakte. Print ke baad apne phone se ek baar scan karke dekho." : ok ? "QR jaanch liya: scan hota hai aur sahi dukaan kholta hai." : null);
    if (ok === false) { setBusy(null); return setCheck("QR padha nahi gaya. Photo chhoti karo ya doosra template chuno."); }
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    const file = new File([blob], `${shop.slug}-${tpl.id}.png`, { type: "image/png" });
    setBusy(null);
    markDone();
    if (share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: shop.name }); return; } catch { /* fall through to download */ }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function pdf() {
    setBusy("pdf");
    const [{ PDFDocument, rgb }, QR, c] = await Promise.all([import("pdf-lib"), import("qrcode"), render()]);
    const ok = await selfTest(c);
    if (!ok) { setBusy(null); return setCheck("QR padha nahi gaya. Photo chhoti karo ya doosra template chuno."); }
    setCheck("QR jaanch liya: scan hota hai aur sahi dukaan kholta hai.");
    const doc = await PDFDocument.create();
    doc.setTitle(`${shop.name}: Gullak poster`);
    doc.setAuthor(shop.name);
    doc.setCreator("Gullak");
    const img = await doc.embedPng(await new Promise<ArrayBuffer>((r) => c.toBlob((b) => b!.arrayBuffer().then(r), "image/png")));
    const page = doc.addPage(tpl.pt);
    page.drawImage(img, { x: 0, y: 0, width: tpl.pt[0], height: tpl.pt[1] });
    // the QR itself is vector: every dark run of modules is a filled rectangle, sharp at any print size
    const mtx = QR.create(qrText, { errorCorrectionLevel: "M" }).modules;
    const n = mtx.size;
    const k = tpl.pt[0] / qrBoxes.current.W;
    for (const bx of qrBoxes.current.boxes) {
      const x0 = bx.x * k, top = bx.y * k, s = bx.s * k, cell = s / n;
      page.drawRectangle({ x: x0, y: tpl.pt[1] - top - s, width: s, height: s, color: rgb(0.961, 0.914, 0.812) });
      for (let r = 0; r < n; r++) {
        let run = -1;
        for (let col = 0; col <= n; col++) {
          const dark = col < n && mtx.get(bx.rot ? n - 1 - r : r, bx.rot ? n - 1 - col : col);
          if (dark && run < 0) run = col;
          if (!dark && run >= 0) {
            page.drawRectangle({ x: x0 + run * cell, y: tpl.pt[1] - top - (r + 1) * cell, width: (col - run) * cell + 0.02, height: cell + 0.02, color: rgb(0.11, 0.071, 0.063) });
            run = -1;
          }
        }
      }
    }
    const bytes = await doc.save();
    markDone();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })); a.download = `${shop.slug}-${tpl.id}.pdf`; a.click();
    setBusy(null);
  }

  const ratio = tpl.w / tpl.h;
  return (
    <main style={{ background: "linear-gradient(#5b3519, #4a2a13)", minHeight: "calc(100dvh - 52px)" }}>
      <div className="wrap" style={{ padding: "18px 16px 60px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 22, alignItems: "start" }}>
        <section style={{ color: "var(--newsprint)", display: "grid", gap: 14 }}>
          <div>
            <h1 className="f-display" style={{ fontSize: "clamp(30px, 7vw, 44px)", margin: 0, color: "var(--haldi)" }}>Poster</h1>
            <p className="f-serif" style={{ margin: "2px 0 0", fontWeight: 700 }}>Painter ka bench</p>
            <Help hi="Is poster ka QR grahak scan karte hain. Kaagaz aur bhaasha chuno, PDF lo, print karke counter ke paas chipkao." en="Customers scan this poster's QR. Pick a paper size and language, download the PDF, print it and stick it near your counter." />
          </div>
          <Group label="1. Kaagaz">
            {TPL.map((t) => <button key={t.id} className={"plate small " + (tpl.id === t.id ? "" : "ghost")} aria-pressed={tpl.id === t.id} onClick={() => setTpl(t)}>{t.label}</button>)}
          </Group>
          <Group label="2. Bhaasha">
            {Object.entries(COPY).map(([k, v]) => <button key={k} className={"plate small " + (lang === k ? "" : "ghost")} aria-pressed={lang === k} onClick={() => setLang(k)}>{v.name}</button>)}
          </Group>
          <Group label="3. Tasveer">
            {STALLS.map(([k, l]) => <button key={k} className={"plate small " + (!photo && stall === k ? "" : "ghost")} aria-pressed={!photo && stall === k} onClick={() => { setPhoto(null); setStall(k); }}>{l}</button>)}
            <label className={"plate small " + (photo ? "" : "ghost")} style={{ cursor: "pointer" }}>
              Apni photo
              <input type="file" accept="image/*" style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
            </label>
          </Group>
          <p style={{ fontSize: 13, margin: 0 }}>Photo sirf is phone ke andar rehti hai. Kahin upload nahi hoti.</p>
          <p className="f-serif" style={{ fontWeight: 700, margin: 0 }}>4. Lo aur print karo</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="plate red" disabled={!!busy} onClick={() => pdf()}>{busy === "pdf" ? "Ban raha hai..." : "PDF lo"}</button>
            <button className="plate" disabled={!!busy} onClick={() => png()}>{busy === "png" ? "Ban raha hai..." : "PNG lo"}</button>
            <button className="plate paan" disabled={!!busy} onClick={() => png(true)}>WhatsApp status pe lagao</button>
          </div>
          {check && <p role="status" className="paper" style={{ padding: 10, margin: 0 }}>{check}</p>}
        </section>
        {/* the creased paper on the bench */}
        <section aria-label="Poster ka namoona" style={{ position: "relative", padding: "10px 0" }}>
          <div style={{ position: "relative", width: ratio >= 1 ? "100%" : `min(100%, ${Math.round(ratio * 620)}px)`, margin: "0 auto", aspectRatio: `${tpl.w} / ${tpl.h}`, boxShadow: "8px 10px 0 rgba(0,0,0,.45)", transform: "rotate(-1.2deg)" }}>
            <canvas ref={canvas} style={{ width: "100%", height: "100%", display: "block" }} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", mixBlendMode: "multiply" }} aria-hidden="true">
              <defs>
                <linearGradient id="cr1" x1="0" x2="1"><stop offset=".48" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#8a7a5a" stopOpacity=".35" /><stop offset=".53" stopColor="#fff" stopOpacity="0" /></linearGradient>
                <linearGradient id="cr2" y1="0" y2="1" x1="0" x2="0"><stop offset=".31" stopColor="#fff" stopOpacity="0" /><stop offset=".333" stopColor="#8a7a5a" stopOpacity=".3" /><stop offset=".36" stopColor="#fff" stopOpacity="0" /><stop offset=".64" stopColor="#fff" stopOpacity="0" /><stop offset=".666" stopColor="#8a7a5a" stopOpacity=".3" /><stop offset=".69" stopColor="#fff" stopOpacity="0" /></linearGradient>
              </defs>
              <rect width="100" height="100" fill="url(#cr1)" /><rect width="100" height="100" fill="url(#cr2)" />
            </svg>
          </div>
          {/* brushes and a paint tin on the bench */}
          <svg viewBox="0 0 300 60" width="100%" height="60" aria-hidden="true" style={{ display: "block", marginTop: 16 }}>
            <rect x="10" y="20" width="44" height="36" fill="#8E9B94" stroke={INK} strokeWidth="2.5" /><ellipse cx="32" cy="20" rx="22" ry="6" fill={p.a} stroke={INK} strokeWidth="2.5" />
            <path d="M80 50 L200 34" stroke="#C98A5B" strokeWidth="7" strokeLinecap="round" /><path d="M200 34 L226 30" stroke={INK} strokeWidth="9" strokeLinecap="round" />
            <path d="M90 58 L230 52" stroke="#C98A5B" strokeWidth="5" strokeLinecap="round" /><path d="M230 52 L250 51" stroke={p.b} strokeWidth="7" strokeLinecap="round" />
          </svg>
        </section>
      </div>
    </main>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="f-serif" style={{ fontWeight: 700, marginBottom: 6 }}>{label}</legend>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </fieldset>
  );
}
