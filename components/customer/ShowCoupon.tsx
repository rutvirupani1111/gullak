"use client";
import { useEffect, useState } from "react";
import type { WalletCoupon } from "@/lib/server/wallet";
import { formatCode } from "@/lib/code";
import { useOfflineShell } from "./Offline";

/** Counter par dikhao: paper white, max contrast, wake lock on. Deliberately no decoration. */
export default function ShowCoupon({ c, qr }: { c: WalletCoupon; qr: string }) {
  // the clock starts on the phone, not on the server, so the first paint and the live countdown agree
  const [now, setNow] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  useOfflineShell();
  useEffect(() => {
    setOffline(!navigator.onLine);
    const off = () => setOffline(true), on = () => setOffline(false);
    addEventListener("offline", off);
    addEventListener("online", on);
    return () => { removeEventListener("offline", off); removeEventListener("online", on); };
  }, []);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(i); lock?.release().catch(() => {}); };
  }, []);
  const ms = now === null ? 0 : Math.max(0, new Date(c.expiresAt).getTime() - now);
  const dd = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  const clock = now === null ? "--:--:--" : `${dd ? `${dd} din ` : ""}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <main style={{ minHeight: "100dvh", background: "#fff", color: "#000", display: "grid", justifyItems: "center", alignContent: "start", padding: "16px 16px 30px", gap: 10, textAlign: "center" }}>
      <a href="/w" className="plate small ghost" style={{ justifySelf: "start" }}>Gullak</a>
      <h1 style={{ margin: 0, fontSize: 22 }}>{c.shop.name}</h1>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{c.label_hi}</p>
      <div style={{ width: "min(70vw, 360px)", aspectRatio: "1" }} dangerouslySetInnerHTML={{ __html: qr }} />
      <p className="f-mono" style={{ fontSize: "clamp(34px, 11vw, 56px)", fontWeight: 700, margin: 0, letterSpacing: 3 }}>{formatCode(c.code)}</p>
      <div dangerouslySetInnerHTML={{ __html: c.mohar }} style={{ width: 96, height: 96 }} />
      <p style={{ margin: 0, fontWeight: 700 }}>{c.status === "issued" ? `Bacha samay ${clock}` : c.status === "redeemed" ? "Yeh coupon diya ja chuka hai" : "Khatam"}</p>
      {c.minBill > 0 && <p style={{ margin: 0 }}>Kam se kam bill ₹{c.minBill / 100}</p>}
      {offline && <p style={{ margin: 0, fontSize: 14, fontWeight: 700, border: "2px solid #000", padding: "4px 10px" }}>Offline: dikhane ke liye theek hai. Thappa network aane par lagega.</p>}
      <p style={{ fontSize: 13, maxWidth: 320 }}>Staff mohar ka design apni screen se milayenge. Show this at the counter; staff match the seal.</p>
    </main>
  );
}
