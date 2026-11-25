"use client";
import { useEffect, useState } from "react";
import { GullakArt } from "@/components/art";

/** Moves a gullak to a new phone: the old phone shows a 10-minute QR, the new phone opens it once. */
export default function Transfer({ claimToken }: { claimToken: string | null }) {
  const [qr, setQr] = useState<string | null>(null);
  const [exp, setExp] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [moved, setMoved] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  async function make() {
    setState("busy");
    setMsg(null);
    try {
      const r = await fetch("/api/v1/wallet/transfer", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message_hi);
      const QR = (await import("qrcode")).default;
      setQr(await QR.toString(d.url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1C1210", light: "#FFFFFF" } }));
      setExp(new Date(d.exp).getTime());
      setState("idle");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error && e.message ? e.message : "Network nahi mila. Dobara try karo.");
    }
  }

  async function claim() {
    setState("busy");
    setMsg(null);
    try {
      const r = await fetch("/api/v1/wallet/transfer/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: claimToken }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message_hi);
      setMoved(d.moved);
      setState("done");
      try { localStorage.removeItem("gk.coupons"); } catch {}
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error && e.message ? e.message : "Network nahi mila. Dobara try karo.");
    }
  }

  const left = Math.max(0, exp - now);
  return (
    <main style={{ minHeight: "100dvh", padding: "20px 16px 40px", display: "grid", justifyItems: "center", alignContent: "start", gap: 14, background: "#2A1A12", color: "var(--newsprint)" }}>
      <a href="/w" className="plate small ghost" style={{ justifySelf: "start" }}>Gullak</a>
      <h1 className="f-display truck" style={{ margin: 0, fontSize: 34, color: "var(--haldi)", textAlign: "center", lineHeight: 1.05 }}>Gullak naye phone mein</h1>
      {claimToken ? (
        <div className="paper" style={{ padding: 18, width: "min(100%, 380px)", boxSizing: "border-box", textAlign: "center" }}>
          {state === "done" ? (
            <div className="rise" style={{ display: "grid", justifyItems: "center", gap: 8 }}>
              <GullakArt size={96} style={{ animation: "wobble .45s var(--spring-soft)" }} />
              <p className="f-serif" style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>{moved} sikke is phone mein aa gaye</p>
              <p style={{ margin: 0 }}>{moved} coupons moved to this phone. Purana phone ab yahi gullak dikhayega.</p>
              <a className="plate red" href="/w">Gullak kholo</a>
            </div>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>Purane phone ki gullak is phone mein laani hai? Saare coupon yahan aa jaayenge. Yeh QR sirf ek baar chalta hai.</p>
              <p style={{ fontSize: 14 }}>Move the old phone's gullak here. Every coupon comes along. The QR works once.</p>
              <button className="plate red" disabled={state === "busy"} onClick={claim}>{state === "busy" ? "..." : "Haan, yahan laao"}</button>
            </>
          )}
          {msg && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700 }}>{msg}</p>}
        </div>
      ) : (
        <div className="paper" style={{ padding: 18, width: "min(100%, 380px)", boxSizing: "border-box", textAlign: "center" }}>
          <p style={{ marginTop: 0 }}>Naya phone liya? Yahan QR banao aur naye phone ke camera se scan karo. Coupon wahan chale jaayenge.</p>
          <p style={{ fontSize: 14 }}>New phone? Make a QR here and scan it with the new phone's camera.</p>
          <div style={{ width: "min(70vw, 280px)", aspectRatio: "1", margin: "8px auto", display: "grid", placeItems: "center", background: qr && left > 0 ? "#fff" : "#E9D9B5", border: "2px dashed var(--ink)" }}>
            {qr && left > 0 ? <div style={{ width: "100%" }} dangerouslySetInnerHTML={{ __html: qr }} /> : <GullakArt size={110} />}
          </div>
          {qr && left > 0 && <p className="f-mono" style={{ fontWeight: 700 }}>{Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")} bache</p>}
          <button className="plate red" disabled={state === "busy"} onClick={make}>{state === "busy" ? "..." : qr ? "Naya QR banao" : "QR banao"}</button>
          {msg && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700 }}>{msg}</p>}
        </div>
      )}
    </main>
  );
}
