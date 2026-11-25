"use client";
import { useEffect, useRef, useState } from "react";
import { badBox, isValidCode, normalise, formatCode } from "@/lib/code";

type Look = { state: string; coupon?: { id: string; code: string; expiresAt: string }; prize?: { label_hi: string; label_en: string; minBill: number }; mohar?: string; visitN?: number; redeemedAtLabel?: string | null; redeemedBy?: string | null; otherSlug?: string; code?: string };

export default function Counter() {
  const [slug, setSlug] = useState("");
  const [me, setMe] = useState<{ name: string; shop: { slug: string; name: string }; count: number } | null>(null);
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    try { setSlug(localStorage.getItem("gk.counter.slug") || ""); } catch {}
    fetch("/api/v1/counter/shift").then(async (r) => {
      if (r.ok) { const d = await r.json(); setMe({ name: d.name, shop: d.shop, count: d.count }); }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  async function press(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      const r = await fetch("/api/v1/counter/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shopSlug: slug.trim().toLowerCase(), pin: next }) });
      const j = await r.json();
      setPin("");
      if (r.ok) {
        try { localStorage.setItem("gk.counter.slug", slug.trim().toLowerCase()); } catch {}
        setMe({ name: j.name, shop: j.shop, count: 0 });
        fetch("/api/v1/counter/shift").then((x) => x.json()).then((x) => setMe((m) => m && { ...m, count: x.count }));
      } else {
        setShake((s) => s + 1);
        setPinErr(j.error === "bad_pin" ? `PIN galat hai. ${j.attemptsLeft} koshish baaki.` : j.message_hi);
      }
    }
  }
  if (checking) return <main style={{ minHeight: "100dvh", background: "#5b3519" }} />;
  if (!me)
    return (
      <main style={{ minHeight: "100dvh", background: "#5b3519 repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 2px, transparent 2px 40px)", display: "grid", placeItems: "center", padding: 16 }}>
        <div style={{ width: "min(360px, 100%)" }}>
          <h1 className="f-display truck" style={{ color: "var(--haldi)", fontSize: 38, textAlign: "center", margin: "0 0 6px" }}>Counter</h1>
          <p style={{ color: "#F5E9CF", textAlign: "center", margin: "0 0 14px", lineHeight: 1.4 }}>Dukaan ke staff ke liye: grahak ka jeeta coupon yahan stamp hota hai.<br /><span style={{ fontSize: 14, color: "#E2CDA2" }}>For shop staff: this is where a customer&apos;s coupon gets stamped.</span></p>
          <label className="field" style={{ color: "#F5E9CF" }}>1. Dukaan ka web naam
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="sharma-ji-ki-tapri" autoCapitalize="none" />
          </label>
          <p style={{ color: "#F5E9CF", fontWeight: 600, margin: "16px 0 0" }}>2. Apna 4 ank ka PIN dabao</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "12px 0 18px" }}>
            {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 18, height: 18, borderRadius: 9, border: "2px solid #F4B400", background: i < pin.length ? "#F4B400" : "transparent" }} />)}
          </div>
          <div key={shake} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: 14, background: "linear-gradient(#C9A13B, #9C7A22)", border: "3px solid var(--ink)", boxShadow: "6px 7px 0 var(--ink)", animation: shake ? "shake3 .3s" : undefined }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "<"].map((k, i) => k === "" ? <span key={i} /> : (
              <button key={i} disabled={!slug} onClick={() => (k === "<" ? setPin((p) => p.slice(0, -1)) : press(k))} aria-label={k === "<" ? "Mitao" : k}
                className="f-mono" style={{ height: 64, fontSize: 26, fontWeight: 700, borderRadius: "50%", border: "3px solid var(--ink)", background: "radial-gradient(circle at 35% 30%, #FFF1B8, #D9A92A 60%, #8C6A16)", boxShadow: "0 4px 0 var(--ink)", cursor: "pointer" }}>{k === "<" ? "⌫" : k}</button>
            ))}
          </div>
          {pinErr && <p role="alert" className="paper" style={{ padding: 10, marginTop: 14 }}>{pinErr}</p>}
          <p style={{ color: "#E2CDA2", fontSize: 13, marginTop: 14 }}>Demo: dukaan <b>sharma-ji-ki-tapri</b>, Ramesh ka PIN <b>1234</b>.</p>
        </div>
      </main>
    );
  return <Thappa me={me} setCount={(n) => setMe({ ...me, count: n })} logout={async () => { await fetch("/api/v1/counter/logout", { method: "POST" }); setMe(null); }} />;
}

function Thappa({ me, setCount, logout }: { me: { name: string; shop: { slug: string; name: string }; count: number }; setCount: (n: number) => void; logout: () => void }) {
  const [boxes, setBoxes] = useState<string[]>(Array(7).fill(""));
  const [bad, setBad] = useState(-1);
  const [msg, setMsg] = useState<string | null>(null);
  const [look, setLook] = useState<Look | null>(null);
  const [hold, setHold] = useState(0);
  const [stamped, setStamped] = useState<{ id: string; at: number } | null>(null);
  const [offline, setOffline] = useState(false);
  const [scan, setScan] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const holdT = useRef<number | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const code = boxes.join("");

  function setChar(i: number, v: string) {
    const ch = normalise(v).slice(-1);
    const next = [...boxes];
    next[i] = ch;
    setBoxes(next);
    setBad(-1);
    setMsg(null);
    if (ch && i < 6) refs.current[i + 1]?.focus();
    if (next.join("").length === 7) check(next.join(""));
  }
  async function check(c: string, qr?: string) {
    if (!qr) {
      const b = badBox(c);
      if (b >= 0 || !isValidCode(c)) {
        setBad(b >= 0 ? b : 6);
        setMsg("Code galat lag raha hai. Dobara dekho.");
        return; // caught on the phone, no network call
      }
    }
    try {
      const r = await fetch("/api/v1/counter/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(qr ? { qr } : { code: c }) });
      const d = await r.json();
      setOffline(false);
      if (!r.ok) return setMsg(d.message_hi);
      setLook(d);
      setStamped(null);
    } catch {
      setOffline(true); // never guess: keep the typed code, change nothing
    }
  }
  function startHold() {
    if (!look?.coupon || look.state !== "issued") return;
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / 600);
      setHold(p);
      if (p >= 1) { holdT.current = null; commit(); return; }
      holdT.current = requestAnimationFrame(tick);
    };
    holdT.current = requestAnimationFrame(tick);
  }
  function endHold() {
    if (holdT.current) { cancelAnimationFrame(holdT.current); holdT.current = null; setHold(0); }
  }
  async function commit() {
    const id = look!.coupon!.id;
    setStamped({ id: "", at: Date.now() });
    try { navigator.vibrate?.([30, 40, 30]); } catch {}
    try {
      const r = await fetch("/api/v1/counter/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ couponId: id, idempotencyKey: crypto.randomUUID() }) });
      const d = await r.json();
      if (!r.ok) { setStamped(null); setHold(0); setMsg(d.message_hi); return; }
      setStamped({ id: d.redemptionId, at: Date.now() });
      setCount(me.count + 1);
    } catch {
      setStamped(null); setHold(0); setOffline(true);
    }
  }
  async function undo() {
    if (!stamped?.id) return;
    const r = await fetch("/api/v1/counter/undo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ redemptionId: stamped.id }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.message_hi);
    setStamped(null); setHold(0); setCount(Math.max(0, me.count - 1));
    setMsg("Thappa wapas le liya. Coupon phir se chalu hai.");
  }
  function reset() {
    setBoxes(Array(7).fill("")); setLook(null); setStamped(null); setHold(0); setMsg(null); setBad(-1);
    setTimeout(() => refs.current[0]?.focus(), 0);
  }
  useEffect(() => {
    if (!stamped?.id) return;
    const t = setTimeout(() => setStamped((s) => (s ? { ...s, id: "" } : s)), 10000);
    return () => clearTimeout(t);
  }, [stamped?.id]);
  useEffect(() => {
    if (!scan) return;
    let stream: MediaStream | null = null, stop = false;
    const BD = (window as unknown as { BarcodeDetector?: new (o: unknown) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!BD) { setMsg("Is phone par camera scan nahi chalta. Code type karo."); setScan(false); return; }
    const det = new BD({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(async (s) => {
      stream = s;
      if (!video.current) return;
      video.current.srcObject = s;
      await video.current.play();
      while (!stop) {
        const r = await det.detect(video.current).catch(() => []);
        if (r[0]) { setScan(false); check("", r[0].rawValue); break; }
        await new Promise((x) => setTimeout(x, 166));
      }
    }).catch(() => { setMsg("Camera nahi khula. Code type karo."); setScan(false); });
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [scan]);

  const exp = look?.coupon && new Date(look.coupon.expiresAt);
  return (
    <main style={{ minHeight: "100dvh", background: "#6E4423 repeating-linear-gradient(90deg, rgba(0,0,0,.09) 0 2px, transparent 2px 60px)", padding: "12px 16px 40px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#F5E9CF", gap: 8 }}>
        <div><b>{me.shop.name}</b><div style={{ fontSize: 13 }}>{me.name}</div></div>
        <div className="tin" style={{ padding: "4px 10px", fontWeight: 800 }}>Aaj {me.count} thappe</div>
        <button className="plate small ghost" onClick={logout}>Band</button>
      </header>
      <div style={{ maxWidth: 520, margin: "18px auto 0" }}>
        {!look && (
          <div className="rise">
            <p style={{ color: "#F5E9CF", textAlign: "center", margin: "0 0 12px", lineHeight: 1.4 }}>
              <b style={{ fontSize: 18 }}>Grahak ke phone par 7 akshar ka code daalo, ya QR scan karo.</b><br />
              <span style={{ fontSize: 14, color: "#E2CDA2" }}>Type the 7-letter code from the customer&apos;s phone, or scan their QR.</span>
            </p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              {boxes.map((b, i) => (
                <input key={i} ref={(el) => { refs.current[i] = el; }} value={b} aria-label={`Code akshar ${i + 1}`} maxLength={2} autoCapitalize="characters" autoComplete="off" autoFocus={i === 0}
                  onChange={(e) => setChar(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !b && i) refs.current[i - 1]?.focus(); }}
                  className="f-mono" style={{ width: "min(12vw, 52px)", height: 60, textAlign: "center", fontSize: 26, fontWeight: 700, border: `3px solid ${bad === i ? "var(--press-red)" : "var(--ink)"}`, background: bad === i ? "#FCD9D6" : "#F5E9CF", marginRight: i === 3 ? 10 : 0 }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
              <button className="plate" onClick={() => setScan(true)}>Scan karo</button>
              {code && <button className="plate ghost" onClick={reset}>Saaf karo</button>}
            </div>
            {scan && <video ref={video} playsInline muted style={{ width: "100%", marginTop: 12, border: "3px solid var(--ink)" }} />}
          </div>
        )}
        {offline && <p className="paper" role="alert" style={{ padding: 12, marginTop: 14 }}>Abhi check nahi ho raha. Coupon theek hai, network aane par dobara scan karo. <button className="plate small" onClick={() => check(code)}>Dobara</button></p>}
        {msg && <p className="paper" role="status" style={{ padding: 12, marginTop: 14 }}>{msg}</p>}
        {look && (
          <div className="rise" style={{ marginTop: 6 }}>
            {look.state === "not_found" && <Slip tone="#E2CDA2"><b>Yeh code is dukaan mein nahi mila.</b><p>Code not found. Customer se dobara dikhane ko kaho.</p></Slip>}
            {look.state === "wrong_shop" && <Slip tone="#E2CDA2"><b>Yeh coupon doosri dukaan ({look.otherSlug}) ka hai.</b><p>This coupon belongs to another shop.</p></Slip>}
            {look.coupon && (
              <Slip tone={look.state === "issued" ? "#F5E9CF" : "#D9D3C4"} torn={look.state === "expired"}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 96, height: 96, flex: "none" }} dangerouslySetInnerHTML={{ __html: look.mohar! }} />
                  <div>
                    <p className="f-display" style={{ fontSize: 26, margin: 0, color: "var(--press-red)" }}>{look.prize!.label_hi}</p>
                    <p style={{ margin: "2px 0" }}>{look.prize!.label_en}</p>
                    <p className="f-mono" style={{ margin: 0 }}>{formatCode(look.coupon.code)}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 14 }}>Visit {look.visitN} · {look.prize!.minBill ? `min bill ₹${look.prize!.minBill / 100} · ` : ""}khatam {exp!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, margin: "10px 0 0" }}>Customer ki screen ki mohar is se milao. Alag ho to coupon nakli hai.</p>
                {look.state === "redeemed" && !stamped && <Blot text={`Diya gaya ${look.redeemedAtLabel} aaj, ${look.redeemedBy ?? "staff"} ne`} />}
                {look.state === "expired" && <p style={{ fontWeight: 800, color: "var(--press-red)" }}>Khatam ho gaya. This coupon has expired.</p>}
                {look.state === "void" && <p style={{ fontWeight: 800, color: "var(--press-red)" }}>Radd. This coupon is void.</p>}
                {stamped && <Blot text="PAID / दिया" fresh />}
              </Slip>
            )}
            {look.state === "issued" && !stamped && (
              <div style={{ display: "grid", placeItems: "center", marginTop: 22 }}>
                <button onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!holdT.current) startHold(); } }} onKeyUp={endHold}
                  aria-label="Thappa lagane ke liye dabaye rakho" style={{ position: "relative", width: 150, height: 150, border: 0, background: "none", cursor: "pointer", touchAction: "none" }}>
                  <svg viewBox="0 0 150 150" width="150" height="150" style={{ position: "absolute", inset: 0 }}>
                    <circle cx="75" cy="75" r="68" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="8" />
                    <circle cx="75" cy="75" r="68" fill="none" stroke="#D7261E" strokeWidth="8" strokeDasharray={`${hold * 427} 427`} transform="rotate(-90 75 75)" style={{ transition: hold === 0 ? "stroke-dasharray 150ms" : undefined }} />
                  </svg>
                  <svg viewBox="0 0 100 120" width="96" height="116" style={{ position: "relative", transform: `translateY(${hold * 10}px) scale(${1 - hold * 0.06})` }}>
                    <path d="M38 6 h24 q6 0 6 6 v34 q0 6 -6 6 h-24 q-6 0 -6 -6 v-34 q0 -6 6 -6z" fill="#7A4A26" stroke="#1C1210" strokeWidth="3" />
                    <path d="M22 56 h56 l6 26 h-68z" fill="#4A2A14" stroke="#1C1210" strokeWidth="3" />
                    <rect x="14" y="82" width="72" height="16" fill="#D7261E" stroke="#1C1210" strokeWidth="3" />
                  </svg>
                </button>
                <p style={{ color: "#F5E9CF", fontWeight: 700 }}>Dabaye rakho: thappa</p>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <button className="plate" onClick={reset}>Agla coupon</button>
            </div>
          </div>
        )}
        {/* outside the rising slip: a transformed parent would pin this bar to the slip instead of the screen */}
        {stamped?.id && <UndoBar key={stamped.id} onUndo={undo} />}
      </div>
    </main>
  );
}
/** "Galti se lagaya?" for 10 seconds, with a tin strip that drains so staff can see the window closing. */
function UndoBar({ onUndo }: { onUndo: () => void }) {
  return (
    <div className="tin" role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 40, padding: "12px 12px 16px", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", maxWidth: 520, margin: "0 auto", animation: "rise .3s var(--spring-soft)", overflow: "hidden" }}>
      <span style={{ fontWeight: 700 }}>Galti se lagaya? <small style={{ fontWeight: 500 }}>Stamped by mistake?</small></span>
      <button className="plate red small" onClick={onUndo}>Wapas lo</button>
      <span aria-hidden="true" style={{ position: "absolute", left: 0, bottom: 0, height: 5, width: "100%", background: "var(--press-red)", transformOrigin: "0 50%", animation: "drain 10s linear forwards" }} />
    </div>
  );
}
function Slip({ children, tone, torn }: { children: React.ReactNode; tone: string; torn?: boolean }) {
  return (
    <div style={{ position: "relative", background: tone, border: "2px solid var(--ink)", boxShadow: "5px 6px 0 rgba(0,0,0,.5)", padding: 16, clipPath: torn ? "polygon(0 0, 88% 0, 100% 14%, 100% 100%, 0 100%)" : undefined, overflow: "hidden" }}>{children}</div>
  );
}
function Blot({ text, fresh }: { text: string; fresh?: boolean }) {
  return (
    <div aria-live="polite" style={{ position: "absolute", right: 10, bottom: 10, transform: "rotate(-12deg)", border: "4px double #D7261E", color: "#D7261E", padding: "6px 12px", fontWeight: 800, fontSize: fresh ? 26 : 15, background: "rgba(245,233,207,.6)", animation: fresh ? "blot .35s var(--spring-snap) both" : undefined, maxWidth: "70%" }}>
      {text}
      <style>{"@keyframes blot{from{transform:rotate(-12deg) scale(.4);opacity:0}to{transform:rotate(-12deg) scale(1);opacity:1}}"}</style>
    </div>
  );
}
