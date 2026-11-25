"use client";
import { useEffect, useState } from "react";
import { GullakArt, Label } from "@/components/art";
import type { WalletCoupon } from "@/lib/server/wallet";
import { formatCode } from "@/lib/code";
import { CONSENT_VERSION, consentText } from "@/lib/consent";
import { idbCoupons, idbReplace, warmCouponPages } from "@/lib/idb";
import { useOfflineShell } from "./Offline";

function left(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Khatam";
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d ? `${d} din ${h} ghante` : `${h}h ${m}m`;
}

export default function Wallet({ initial }: { initial: WalletCoupon[] }) {
  const [coupons, setCoupons] = useState(initial);
  const [spilled, setSpilled] = useState(false);
  const [flip, setFlip] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [forgetAsk, setForgetAsk] = useState(false);
  useOfflineShell();
  useEffect(() => {
    // online, the server's list is the truth and the phone keeps a copy; offline, the phone's own copy is shown
    let gone = false;
    if (navigator.onLine) {
      idbReplace(initial).then(() => warmCouponPages(initial));
    } else {
      idbCoupons().then((local) => {
        if (gone) return;
        setOffline(true);
        if (local.length) setCoupons(local);
        if (local.some((c) => c.status === "issued" && new Date(c.expiresAt).getTime() > Date.now())) setSpilled(true);
      });
    }
    const goOff = () => setOffline(true);
    const goOn = () => setOffline(false);
    addEventListener("offline", goOff);
    addEventListener("online", goOn);
    return () => { gone = true; removeEventListener("offline", goOff); removeEventListener("online", goOn); };
  }, [initial]);
  useEffect(() => {
    // the gullak spills on its own the first time, so a new visitor sees what is inside without guessing
    const anyLive = initial.some((c) => c.status === "issued" && new Date(c.expiresAt).getTime() > Date.now());
    const sp = anyLive ? setTimeout(() => setSpilled(true), 650) : null;
    const i = setInterval(() => setNow(Date.now()), 30000);
    // shake to spill: two jolts above 18 m/s2 within 600 ms
    let lastJolt = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (mag > 18) {
        const t = Date.now();
        if (t - lastJolt < 600) setSpilled(true);
        lastJolt = t;
      }
    };
    addEventListener("devicemotion", onMotion);
    return () => { clearInterval(i); if (sp) clearTimeout(sp); removeEventListener("devicemotion", onMotion); };
  }, [initial]);

  const live = coupons.filter((c) => c.status === "issued" && new Date(c.expiresAt).getTime() > now);
  const past = coupons.filter((c) => !live.includes(c));
  const shops = [...new Map(coupons.map((c) => [c.shop.slug, c.shop])).values()];

  return (
    <main style={{ minHeight: "100dvh", background: "linear-gradient(#E9D9B5 0 62%, #7A4A26 62% 64%, #5b3519 64%)" }}>
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <a href={coupons[0] ? `/s/${coupons[0].shop.slug}` : "/"} className="plate small ghost">Wapas</a>
        <h1 className="f-display truck" style={{ fontSize: 40, color: "var(--haldi)", margin: "14px 0 0", textAlign: "center" }}>Meri gullak</h1>
        {offline && <p className="paper" style={{ padding: 10, textAlign: "center" }}>Offline: coupon sirf dikhane ke liye. Thappa network par hi lagega.</p>}
        <div style={{ display: "grid", placeItems: "center", marginTop: 8 }}>
          <button onClick={() => setSpilled(true)} aria-label="Hilao, coupon bahar nikalo" style={{ background: "none", border: 0, cursor: "pointer", viewTransitionName: "gullak", animation: spilled ? "wobble .45s var(--spring-soft)" : "wobble 2.4s ease-in-out infinite" } as React.CSSProperties}>
            <GullakArt size={170} />
          </button>
          <p style={{ fontWeight: 700, margin: 0 }}>{live.length} coupon andar · <button className="plate small" onClick={() => setSpilled((s) => !s)}>{spilled ? "Wapas daalo" : "Hilao"}</button></p>
          {spilled && live.length > 0 && <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 14 }}>Coupon ko chhuo: palatkar code aur mohar dikhegi. Phir <b>Counter par dikhao</b> dabao.<br /><span style={{ opacity: 0.75 }}>Tap a coupon to flip it, then press Counter par dikhao.</span></p>}
        </div>
        {coupons.length === 0 && (
          <div className="paper" style={{ padding: 18, maxWidth: 420, margin: "24px auto", textAlign: "center" }}>
            <p className="f-chalk" style={{ fontSize: 22, margin: 0 }}>Gullak khaali hai</p>
            <p>Kisi dukaan ka QR scan karo, dibba kholo aur khelo. Jeeta hua sikka yahan girega.</p>
            <a className="plate" href="/s/sharma-ji-ki-tapri">Demo dukaan par khelo</a>
          </div>
        )}
        {spilled && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 18, marginTop: 20 }}>
            {[...live, ...past].map((c, i) => {
              const soon = new Date(c.expiresAt).getTime() - now < 86400000 && c.status === "issued";
              const isLive = live.includes(c);
              return (
                <div key={c.id} style={{ perspective: 900, aspectRatio: "260 / 300", maxWidth: 320, width: "100%", justifySelf: "center", ["--r" as string]: `${((i % 3) - 1) * 9}deg`, animation: `spillOut .55s var(--spring-soft) ${i * 70}ms both` }}>
                  <button onClick={() => setFlip(flip === c.id ? null : c.id)} aria-label={`${c.label_hi}, palat kar dekho`}
                    style={{ position: "relative", width: "100%", height: "100%", border: 0, padding: 0, background: "none", transformStyle: "preserve-3d", transition: "transform 400ms var(--spring-snap)", transform: flip === c.id ? "rotateY(180deg)" : "none", opacity: isLive ? 1 : 0.6, cursor: "pointer" }}>
                    <div className="paper" style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", padding: 8, display: "grid", gridTemplateRows: "1fr auto" }}>
                      <Label palette={c.shop.palette} initial={c.shop.initial} seed={c.id} title={c.shop.initial} pattern={i % 8} />
                      <div style={{ paddingTop: 8, textAlign: "left" }}>
                        <b style={{ fontSize: 17 }}>{c.label_hi}</b>
                        <div style={{ fontSize: 13 }}>{c.shop.name}</div>
                        {soon && <span style={{ background: "var(--press-red)", color: "#fff", padding: "1px 6px", fontWeight: 800, fontSize: 12 }}>Kal khatam</span>}
                        {!isLive && <span style={{ border: "2px solid var(--press-red)", color: "var(--press-red)", padding: "0 6px", fontWeight: 800, fontSize: 12, transform: "rotate(-6deg)", display: "inline-block" }}>{c.status === "redeemed" ? "DIYA" : "KHATAM"}</span>}
                      </div>
                    </div>
                    <div className="paper" style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", padding: 12, display: "grid", justifyItems: "center", alignContent: "center", gap: 6 }}>
                      <b>{c.label_en}</b>
                      <span className="f-mono" style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>{formatCode(c.code)}</span>
                      <div className="mohar" style={{ width: 80, height: 80 }} dangerouslySetInnerHTML={{ __html: c.mohar }} />
                      <span style={{ fontSize: 13 }}>{isLive ? `Bacha: ${left(c.expiresAt, now)}` : c.status === "redeemed" ? "Counter par diya gaya" : "Khatam"}</span>
                      {isLive && <a className="plate red small" href={`/w/${c.id}`} onClick={(e) => e.stopPropagation()}>Counter par dikhao</a>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {shops.length > 0 && (
          <div style={{ marginTop: 34, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {shops.map((s) => (
              <button key={s.slug} className="plate small ghost" onClick={() => setSheet(s.slug)}>{s.name}: agli baar yaad dilaayein?</button>
            ))}
            {!forgetAsk ? (
              <button className="plate small ghost" onClick={() => setForgetAsk(true)}>Mera data hatao</button>
            ) : (
              <span className="paper" role="group" aria-label="Pakka?" style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "6px 10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: 14 }}>Har dukaan se aapka number mit jayega. Coupon rahenge.</span>
                <button className="plate small red" onClick={async () => {
                  setForgetAsk(false);
                  try {
                    const r = await fetch("/api/v1/wallet/forget", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
                    const d = await r.json();
                    setMsg(d.removed ? `Hata diya. ${d.removed} dukaan se aapka number mita diya gaya.` : "Aapka koi number save nahi tha. Kuch hataane ko nahi.");
                  } catch {
                    setMsg("Network nahi mila. Kuch nahi hata. Dobara try karo.");
                  }
                }}>Haan, hatao</button>
                <button className="plate small ghost" onClick={() => setForgetAsk(false)}>Rehne do</button>
              </span>
            )}
          </div>
        )}
        {msg && <p className="paper" role="status" style={{ padding: 12, maxWidth: 480, margin: "14px auto" }}>{msg}</p>}
        {coupons.length > 0 && (
          <p className="kraftp" style={{ textAlign: "center", margin: "22px auto 0", maxWidth: 420, padding: "8px 12px", fontSize: 14 }}>
            Naya phone liya? <a className="tap" href="/w/transfer" style={{ fontWeight: 800, color: "var(--press-red)" }}>Gullak naye phone mein le jao</a>
            <span style={{ display: "block", opacity: 0.8 }}>New phone? Move your gullak with one QR.</span>
          </p>
        )}
      </div>
      {sheet && <Inland shop={shops.find((s) => s.slug === sheet)!} onClose={(m) => { setSheet(null); if (m) setMsg(m); }} />}
    </main>
  );
}

function Inland({ shop, onClose }: { shop: { slug: string; name: string }; onClose: (m?: string) => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const text = consentText(shop.name, "hi");
  return (
    <div role="dialog" aria-modal="true" aria-label="Yaad dilaayein" style={{ position: "fixed", inset: 0, background: "rgba(28,18,16,.55)", display: "grid", alignItems: "end", zIndex: 60 }} onClick={() => onClose()}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!/^[6-9][0-9]{9}$/.test(phone)) return setErr("10 ankon ka mobile number daalo (6 se 9 se shuru).");
        if (!agree) return setErr("Haan kehne ke liye dabba tick karo.");
        setBusy(true);
        const r = await fetch("/api/v1/wallet/opt-in", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shopSlug: shop.slug, phone, firstName: name || undefined, consent: { version: CONSENT_VERSION, lang: "hi", checked: true } }) });
        setBusy(false);
        if (!r.ok) return setErr((await r.json()).message_hi);
        onClose(`${shop.name} aapko WhatsApp par yaad dilayega. "Mera data hatao" se kabhi bhi band.`);
      }}
        style={{ background: "#BFD7E8", border: "3px solid var(--ink)", borderBottom: 0, padding: "18px 16px 26px", maxWidth: 520, width: "100%", margin: "0 auto", boxSizing: "border-box", animation: "rise .45s var(--spring-soft)", backgroundImage: "repeating-linear-gradient(-45deg, transparent 0 12px, rgba(215,38,30,.12) 12px 16px, transparent 16px 28px, rgba(14,138,134,.12) 28px 32px)" }}>
        <p className="f-chalk" style={{ fontSize: 24, margin: "0 0 4px" }}>Agli baar yaad dilaayein?</p>
        <p style={{ margin: "0 0 12px", fontSize: 14 }}>Antardeshiya patra · {shop.name}</p>
        <label className="field">Naam (zaroori nahi)<input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="given-name" /></label>
        <label className="field" style={{ marginTop: 10 }}>Mobile (+91)<input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel-national" /></label>
        <label style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-start", fontSize: 14 }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 24, height: 24, flex: "none" }} /> {text}
        </label>
        {err && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="plate red" disabled={busy}>{busy ? "..." : "Haan, bhejo"}</button>
          <button type="button" className="plate ghost" onClick={() => onClose()}>Rehne do</button>
        </div>
      </form>
    </div>
  );
}
