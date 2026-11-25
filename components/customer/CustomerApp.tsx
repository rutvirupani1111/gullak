"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bulbs, GullakArt, Keeper, Label, type KeeperT } from "@/components/art";
import { sha256, utf8, leadingZeroBits, b64ToBytes } from "@/lib/sha256";
import { pal, textOn } from "@/lib/art";
import { minuteLabel } from "@/lib/time";
import { Chakri, Patti, Toss, type PlayResult } from "./Games";

type Shop = { slug: string; name: string; name_local: string | null; address: string; city: string; palette: string; initial: string; keeper: KeeperT; is_demo: boolean; pub: string; kv: number; language: string };
type Prize = { id: string; label_hi: string; label_en: string; kind: string; tier: number; remaining: number | null; total: number | null; pct: number };
type Ready = {
  eligible: boolean; reason?: string; nextPlayAt?: string; visitN: number; bonus?: string;
  campaign: { id: string; game: "chakri" | "patti" | "toss"; title_hi: string; title_en: string; period: string; open_minute: number; close_minute: number; live_qr_required: boolean } | null;
  prizes: Prize[]; layout: { prizeId: string; pct: number }[]; challenge: { nonce: string; bits: number; exp: number } | null; tossSeed: number;
};
type Lang = "hi" | "hinglish" | "en";
const LANGS: [Lang, string][] = [["hi", "हिं"], ["hinglish", "Hinglish"], ["en", "EN"]];

const T = {
  open: { hi: "डिब्बा खोलो", hinglish: "Dibba kholo", en: "Open the box" },
  noDl: { hi: "कोई डाउनलोड नहीं। कोई नंबर नहीं।", hinglish: "Koi download nahi. Koi number nahi.", en: "No download. No number needed." },
  prizes: { hi: "आज के इनाम", hinglish: "Aaj ke inaam", en: "Today's prizes" },
  play: { hi: "खेलो", hinglish: "Khelo", en: "Play" },
  getting: { hi: "तैयारी...", hinglish: "Taiyaari...", en: "Getting ready..." },
  sealed: { hi: "नतीजा सर्वर पहले ही तय और सील कर चुका है।", hinglish: "Nateeja server pehle hi tay aur seal kar chuka hai.", en: "The server has already decided and sealed the result." },
  played: { hi: "आज खेल लिया। कल फिर आना।", hinglish: "Aaj khel liya. Kal phir aana.", en: "You have played today. Come back tomorrow." },
  net: { hi: "नेटवर्क नहीं मिला। दोबारा कोशिश हो रही है।", hinglish: "Network nahi mila. Dobara try kar rahe hain.", en: "No network. Trying again." },
  lose: { hi: "इस बार नहीं। कल फिर आना।", hinglish: "Is baar nahi. Kal phir aana.", en: "Not this time. Come back tomorrow." },
  still: { hi: "फिर भी: ", hinglish: "Phir bhi: ", en: "Still yours: " },
  won: { hi: "सिक्का गुल्लक में चला गया। काउंटर पर दिखाओ।", hinglish: "Sikka gullak mein chala gaya. Counter par dikhao.", en: "The coin went into your gullak. Show it at the counter." },
  wallet: { hi: "गुल्लक खोलो", hinglish: "Gullak kholo", en: "Open my gullak" },
  rules: { hi: "नियम और असली odds", hinglish: "Niyam aur asli odds", en: "Rules and real odds" },
  left: { hi: "बचे", hinglish: "bache", en: "left" },
  always: { hi: "हमेशा मिलता है", hinglish: "hamesha milta hai", en: "never runs out" },
  liveQr: { hi: "काउंटर वाले फ़ोन का QR स्कैन करो।", hinglish: "Counter wale phone ka QR scan karo.", en: "Scan the QR on the counter phone." },
  rate: { hi: "इस नेटवर्क से बहुत खेल हो गए। थोड़ी देर बाद आना।", hinglish: "Is network se bahut khel ho gaye. Thodi der baad aana.", en: "Too many plays from this network. Come back a little later." },
  unverified: { hi: "मोहर यहाँ जाँच नहीं पाए। काउंटर पर जाँच होगी।", hinglish: "Mohar jaanch nahi paaye. Counter par dikhao, wahan jaanch hogi.", en: "Could not check the seal here. Staff will check it at the counter." },
  fake: { hi: "मोहर मेल नहीं खा रही। यह नतीजा नकली हो सकता है।", hinglish: "Mohar mel nahi kha rahi. Yeh nateeja nakli ho sakta hai.", en: "The seal does not match. This result may be fake." },
  bonusCb: { hi: "आपके लिए बोनस खेल!", hinglish: "Aapke liye bonus khel!", en: "A bonus game for you!" },
  bonusGift: { hi: "दोस्त का लिफ़ाफ़ा: एक बोनस खेल", hinglish: "Dost ka lifafa: ek bonus khel", en: "A friend's gift slip: one bonus game" },
  gift: { hi: "दोस्त को भेजो", hinglish: "Dost ko bhejo", en: "Send one to a friend" },
  giftNote: { hi: "दोस्त को एक खेल मिलेगा, पर सिर्फ़ इसी दुकान पर।", hinglish: "Dost ko ek khel milega, par sirf isi dukaan par.", en: "Your friend gets one game, only at this shop." },
  bulbsOff: { hi: "दुकान अभी बंद है", hinglish: "Dukaan abhi band hai", en: "The shop is shut for now" },
  show: { hi: "काउंटर पर दिखाओ", hinglish: "Counter par dikhao", en: "Show at the counter" },
  step1: { hi: "बिल देते समय यह कूपन काउंटर पर दिखाओ।", hinglish: "Bill dete waqt yeh coupon counter par dikhao.", en: "Show this coupon at the counter when you pay." },
  step2: { hi: "स्टाफ ठप्पा लगाएगा, इनाम आपका।", hinglish: "Staff thappa lagayega, inaam aapka.", en: "Staff stamp it, and the prize is yours." },
  howto: { hi: "1. डिब्बा खोलो  2. खेलो  3. जीता कूपन काउंटर पर दिखाओ", hinglish: "1. Dibba kholo  2. Khelo  3. Jeeta coupon counter par dikhao", en: "1. Open the box  2. Play  3. Show the coupon you win at the counter" },
};

async function solvePow(nonce: string, bits: number, signal: { stop: boolean }): Promise<string> {
  let x = 0;
  while (!signal.stop) {
    const end = x + 1500;
    for (; x < end; x++) if (leadingZeroBits(sha256(utf8(nonce + x.toString(36)))) >= bits) return x.toString(36);
    await new Promise((r) => setTimeout(r, 0));
  }
  return "";
}

function canonical(o: Record<string, unknown>) {
  return JSON.stringify(Object.keys(o).sort().reduce<Record<string, unknown>>((a, k) => ((a[k] = o[k]), a), {}));
}
async function verifySig(pubB64: string, payload: Record<string, unknown>, sigB64: string): Promise<boolean | null> {
  try {
    const key = await crypto.subtle.importKey("raw", b64ToBytes(pubB64) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, b64ToBytes(sigB64) as BufferSource, utf8(canonical(payload)) as BufferSource);
  } catch {
    return null; // this browser cannot check Ed25519; staff check the seal at the counter.
  }
}

export default function CustomerApp({ shop, query }: { shop: Shop; query: { lqt?: string; cb?: string; src?: string; khula?: string } }) {
  const [lang, setLang] = useState<Lang>(shop.language === "en" ? "en" : "hinglish");
  const [box, setBox] = useState<"closed" | "opening" | "open">(query.khula ? "open" : "closed");
  const [giftMsg, setGiftMsg] = useState<string | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [netErr, setNetErr] = useState(false);
  const [pow, setPow] = useState<string | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [phase, setPhase] = useState<"counter" | "game" | "done">("counter");
  const [count, setCount] = useState(0);
  const [verified, setVerified] = useState<boolean | null>(true);
  const [err, setErr] = useState<string | null>(null);
  const [calm, setCalm] = useState(false);
  const [dusk, setDusk] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const opened = useRef(!!query.khula);
  const btn = useRef<HTMLButtonElement>(null);
  const gullakRef = useRef<HTMLButtonElement>(null);
  const powSig = useRef({ stop: false });
  const p = pal(shop.palette);
  const t = (k: keyof typeof T) => T[k][lang];
  const glang = lang === "en" ? "en" : "hi";
  const msg = (d: { message_hi?: string; message_en?: string }) => (lang === "en" ? d.message_en : d.message_hi) ?? "";

  useEffect(() => {
    try {
      const l = localStorage.getItem("gk.lang");
      if (l === "en" || l === "hi" || l === "hinglish") setLang(l);
      setRepeat(!!localStorage.getItem("gk.seen." + shop.slug));
      setCount(JSON.parse(localStorage.getItem("gk.coupons") || "[]").filter((c: { status: string }) => c.status === "issued").length);
    } catch {}
    setCalm(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const h = new Date(Date.now() + 330 * 60000).getUTCHours();
    setDusk(h >= 18 || h < 6);
    try {
      navigator.sendBeacon?.(`/api/v1/s/${shop.slug}/scan`, new Blob([JSON.stringify({ src: query.lqt ? "live" : query.cb ? "comeback" : query.src === "poster" ? "poster" : "direct", lqt: query.lqt })], { type: "application/json" }));
    } catch {}
    fetch("/api/v1/wallet").then((r) => r.json()).then((w) => {
      setCount(w.coupons.filter((c: { status: string }) => c.status === "issued").length);
      try { localStorage.setItem("gk.coupons", JSON.stringify(w.coupons)); } catch {}
    }).catch(() => {});
  }, [shop.slug, query.lqt, query.cb, query.src]);

  const giftTok = () => {
    try { return localStorage.getItem("gk.gift." + shop.slug) ?? undefined; } catch { return undefined; }
  };
  const loadReady = useCallback(async (attempt = 0): Promise<void> => {
    try {
      const r = await fetch(`/api/v1/s/${shop.slug}/ready`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lqt: query.lqt, comebackToken: query.cb, giftToken: giftTok() }) });
      if (!r.ok) throw new Error(String(r.status));
      const d: Ready = await r.json();
      setNetErr(false);
      setReady(d);
      if (d.visitN >= 2) try { localStorage.setItem("gk.seen." + shop.slug, "1"); } catch {}
      if (d.challenge) {
        powSig.current = { stop: false };
        solvePow(d.challenge.nonce, d.challenge.bits, powSig.current).then((x) => x && setPow(x));
      }
    } catch {
      setNetErr(true);
      const wait = [1000, 2000, 4000][Math.min(attempt, 2)];
      setTimeout(() => loadReady(attempt + 1), wait);
    }
  }, [shop.slug, query.lqt, query.cb]); // eslint-disable-line react-hooks/exhaustive-deps

  // arriving from the lane with the box already open: straight to the counter
  useEffect(() => {
    if (query.khula) loadReady();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = useCallback(() => {
    if (opened.current) {
      setBox("open"); // a second input skips to the end
      return;
    }
    opened.current = true;
    loadReady();
    setBox("opening");
    try { navigator.vibrate?.(30); } catch {}
    sparks();
    const dur = calm ? 250 : repeat ? 400 : 1400;
    setTimeout(() => setBox("open"), dur);
  }, [calm, repeat, loadReady]);

  // any input opens the box, and the page never traps scrolling once it is open
  useEffect(() => {
    if (box === "open") return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    btn.current?.focus({ preventScroll: true });
    let y0 = 0;
    const onWheel = (e: WheelEvent) => e.deltaY > 4 && open();
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "Enter", "End"].includes(e.key)) {
        e.preventDefault();
        open();
      }
    };
    const ts = (e: TouchEvent) => (y0 = e.touches[0].clientY);
    const tm = (e: TouchEvent) => y0 - e.touches[0].clientY > 24 && open();
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("keydown", onKey);
    addEventListener("touchstart", ts, { passive: true });
    addEventListener("touchmove", tm, { passive: true });
    return () => {
      root.style.overflow = prev;
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", ts);
      removeEventListener("touchmove", tm);
    };
  }, [box, open]);

  useEffect(() => {
    const replay = () => {
      opened.current = false;
      scrollTo({ top: 0 });
      setBox("closed");
    };
    addEventListener("gk-replay-box", replay);
    return () => removeEventListener("gk-replay-box", replay);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  function sparks() {
    if (calm) return;
    const c = canvasRef.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const parts = Array.from({ length: 18 }, () => ({ x: 20, y: 20, vx: 1 + Math.random() * 4, vy: -3 + Math.random() * 6, l: 1 }));
    const t0 = performance.now();
    const step = (now: number) => {
      g.clearRect(0, 0, 120, 40);
      for (const s of parts) {
        s.x += s.vx; s.y += s.vy; s.vy += 0.2; s.l = 1 - (now - t0) / 300;
        g.fillStyle = `rgba(255,${120 + Math.random() * 100},26,${Math.max(0, s.l)})`;
        g.fillRect(s.x, s.y, 2.5, 2.5);
      }
      if (now - t0 < 300) requestAnimationFrame(step);
      else g.clearRect(0, 0, 120, 40);
    };
    requestAnimationFrame(step);
  }

  const play = useCallback(
    async (extra?: { toss?: { throws: { t: number; vx: number; vy: number }[] } }): Promise<PlayResult | null> => {
      if (!ready?.challenge || !pow) return null;
      let key = sessionStorage.getItem("gk.idem." + ready.campaign!.id);
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem("gk.idem." + ready.campaign!.id, key);
      }
      const bodyStr = JSON.stringify({ idempotencyKey: key, nonce: ready.challenge.nonce, pow, lqt: query.lqt, comebackToken: query.cb, giftToken: ready.bonus === "gift" ? giftTok() : undefined, ...extra });
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const r = await fetch(`/api/v1/s/${shop.slug}/play`, { method: "POST", headers: { "content-type": "application/json" }, body: bodyStr });
          const d = await r.json();
          if (!r.ok) {
            setErr(msg(d));
            sessionStorage.removeItem("gk.idem." + ready.campaign!.id);
            return null;
          }
          if (d.payload && d.sig) {
            const ok = await verifySig(shop.pub, d.payload, d.sig);
            if (ok === false) {
              setErr(t("fake"));
              return null;
            }
            setVerified(ok);
          }
          sessionStorage.removeItem("gk.idem." + ready.campaign!.id);
          if (ready.bonus === "gift") try { localStorage.removeItem("gk.gift." + shop.slug); } catch {}
          setResult(d);
          return d;
        } catch {
          await new Promise((res) => setTimeout(res, 800 * (attempt + 1))); // same key, same result
        }
      }
      setErr(t("net"));
      return null;
    },
    [ready, pow, shop.slug, shop.pub, query.lqt, query.cb, lang],
  );

  const landed = useCallback(
    (res: PlayResult, fromEl: HTMLElement | null) => {
      setPhase("done");
      if (!res.couponId) return;
      fetch("/api/v1/wallet").then((r) => r.json()).then((w) => { try { localStorage.setItem("gk.coupons", JSON.stringify(w.coupons)); } catch {} }).catch(() => {});
      const target = gullakRef.current;
      if (!fromEl || !target || calm) {
        setCount((c) => c + 1);
        return;
      }
      const a = fromEl.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const coin = document.createElement("div");
      coin.className = "gk-coin";
      coin.style.cssText = `position:fixed;left:${a.left + a.width / 2 - 22}px;top:${a.top + a.height / 2 - 22}px;width:44px;height:44px;z-index:90;pointer-events:none`;
      coin.innerHTML = `<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#F4B400" stroke="#1C1210" stroke-width="3" stroke-dasharray="3 2"/><circle cx="22" cy="22" r="14" fill="#F4B400" stroke="#1C1210" stroke-width="1.5"/><text x="22" y="28" text-anchor="middle" font-size="16" font-family="var(--f-display)">${shop.initial}</text></svg>`;
      document.body.appendChild(coin);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + 10 - (a.top + a.height / 2);
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 12; i++) {
        const s = i / 12;
        const x = dx * s;
        const y = dy * s - 160 * 4 * s * (1 - s);
        frames.push({ transform: `translate(${x}px,${y}px) rotate(${540 * s}deg) scale(${1 - s * 0.45})`, opacity: s > 0.93 ? 0 : 1 });
      }
      coin.animate(frames, { duration: 650, easing: "cubic-bezier(.3,.1,.4,1)" }).onfinish = () => {
        coin.remove();
        setCount((c) => c + 1);
        try { navigator.vibrate?.(30); } catch {}
        target.animate([{ transform: "rotate(0)" }, { transform: "rotate(8deg)" }, { transform: "rotate(-6deg)" }, { transform: "rotate(3deg)" }, { transform: "rotate(0)" }], { duration: 450 });
      };
    },
    [calm, shop.initial],
  );

  const prizeName = (pz: { label_hi: string; label_en: string }) => (lang === "en" ? pz.label_en : pz.label_hi);

  async function sendGift() {
    setGiftMsg(null);
    try {
      const r = await fetch("/api/v1/gift", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shopSlug: shop.slug }) });
      const d = await r.json();
      if (!r.ok) return setGiftMsg(msg(d));
      const text = (lang === "en" ? "A free game for you at " : "Aapke liye ek muft khel, ") + shop.name + ": " + d.url;
      if (navigator.share) {
        try { await navigator.share({ title: shop.name, text, url: d.url }); setGiftMsg(t("giftNote")); return; } catch {}
      }
      location.href = "https://wa.me/?text=" + encodeURIComponent(text);
    } catch {
      setGiftMsg(t("net"));
    }
  }
  const c = ready?.campaign;
  const closedTag = ready && !ready.eligible && (ready.reason === "closed_hours" || ready.reason === "ended" || ready.reason === "paused");
  const opening = box === "opening";

  return (
    <main className={dusk ? "dusk" : ""} style={{ minHeight: "100dvh", background: dusk ? "#2A1A12" : "var(--bg)", color: dusk ? "#F5E9CF" : "var(--fg)" }}>
      {shop.is_demo && (
        <div className="demo-ribbon"><div>Demo dukaan: yeh asli dukaan nahi hai</div></div>
      )}
      <header className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, paddingBottom: 6 }}>
        <button className="plate small ghost" aria-label="Matchbox dobara kholo" onClick={() => dispatchEvent(new Event("gk-replay-box"))} style={{ "--pb": p.a } as React.CSSProperties}>
          <span className="f-display" style={{ fontSize: 20, color: textOn(p.a) }}>{shop.initial}</span>
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGS.map(([l, label]) => (
            <button key={l} className={"plate small " + (lang === l ? "" : "ghost")} aria-pressed={lang === l} onClick={() => { setLang(l); try { localStorage.setItem("gk.lang", l); } catch {} }}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* C2: inside the tray. The counter, the chalkboard and the dukaandaar. */}
      <section className="wrap" style={{ paddingBottom: 120 }}>
        <div style={{ position: "relative", maxWidth: 520, margin: "0 auto" }}>
          <Bulbs lit={box !== "closed" && !!ready && ready.reason !== "closed_hours"} />
          <h1 className="f-display truck" style={{ fontSize: "clamp(30px, 9vw, 46px)", lineHeight: 1, margin: "6px 0 2px", color: p.a, ["--sh" as string]: p.b, textAlign: "center" }}>
            {lang === "hi" && shop.name_local ? shop.name_local : shop.name}
          </h1>
          <p className="f-serif" style={{ textAlign: "center", margin: 0, color: dusk ? "#E2CDA2" : "var(--fg)", fontWeight: 500 }}>
            {c ? (lang === "hi" ? c.title_hi : c.title_en) : " "}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) clamp(96px, 30vw, 128px)", gap: 10, alignItems: "end", marginTop: 14 }}>
            <div className="chalkboard" style={{ padding: "12px 14px", minHeight: 210, animation: box === "open" ? "rise .5s var(--spring-soft) both" : undefined }}>
              <div className="f-chalk" style={{ fontSize: 22, borderBottom: "1px dashed rgba(237,230,211,.5)", marginBottom: 6 }}>{t("prizes")}</div>
              {!ready && Array.from({ length: 4 }, (_, i) => <div key={i} className="skel" style={{ height: 18, margin: "10px 0", width: `${80 - i * 12}%`, background: "rgba(237,230,211,.18)" }} />)}
              {ready?.prizes.map((pz, i) => (
                <div key={pz.id} className="f-chalk" style={{ padding: "4px 0", opacity: pz.remaining === 0 ? 0.4 : 1, animation: box === "open" ? `rise .4s var(--spring-soft) ${120 + i * 70}ms both` : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 18, lineHeight: 1.15 }}>
                    <span style={{ textDecoration: pz.remaining === 0 ? "line-through" : undefined, minWidth: 0 }}>{prizeName(pz)}</span>
                    <span style={{ whiteSpace: "nowrap", color: "#F4B400" }}>{pz.pct}%</span>
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.75 }}>{pz.remaining !== null ? `${pz.remaining} ${t("left")}` : t("always")}</div>
                </div>
              ))}
            </div>
            <Keeper k={shop.keeper} apron={p.b} size={128} wave={box === "open"} className="keeper-in" style={{ width: "100%", height: "auto" }} />
          </div>
          <div style={{ height: 22, background: "#7A4A26", border: "2.5px solid var(--ink)", marginTop: -2, boxShadow: "0 6px 0 var(--ink)" }} />

          <div style={{ marginTop: 22, minHeight: 330 }}>
            {netErr && <p className="paper" style={{ padding: 12 }}>{t("net")}</p>}
            {err && <p className="paper" role="alert" style={{ padding: 12, borderColor: "var(--press-red)" }}>{err}</p>}
            {ready && !ready.eligible && ready.reason === "already_played" && (
              <AlreadyPlayed at={ready.nextPlayAt!} t={t} onGift={sendGift} giftMsg={giftMsg} />
            )}
            {ready && !ready.eligible && ready.reason === "live_qr_required" && <p className="paper" style={{ padding: 14, fontWeight: 700 }}>{t("liveQr")}</p>}
            {ready && !ready.eligible && ready.reason === "rate_limited" && <p className="paper" style={{ padding: 14 }}>{t("rate")}</p>}
            {ready?.eligible && c && phase === "counter" && (
              <div style={{ textAlign: "center" }} className="rise">
                {ready.bonus && <p className="f-chalk" style={{ fontSize: 22, color: dusk ? "#FFE6A0" : undefined }}>{ready.bonus === "comeback" ? t("bonusCb") : t("bonusGift")}</p>}
                <button className="plate red" style={{ fontSize: 24, minWidth: 220, minHeight: 64 }} disabled={!pow} onClick={() => setPhase("game")}>
                  <span className="f-display">{pow ? t("play") : t("getting")}</span>
                </button>
                <p style={{ fontSize: 13, marginTop: 10, color: dusk ? "#E2CDA2" : undefined }}>{t("sealed")}</p>
              </div>
            )}
            {ready?.eligible && c && phase !== "counter" && (
              <div className="rise">
                {c.game === "chakri" && <Chakri prizes={ready.prizes} layout={ready.layout} play={play} onLanded={landed} lang={glang} calm={calm} palette={shop.palette} initial={shop.initial} />}
                {c.game === "patti" && <Patti play={play} onLanded={landed} lang={glang} palette={shop.palette} initial={shop.initial} />}
                {c.game === "toss" && <Toss play={play} onLanded={landed} lang={glang} seed={ready.tossSeed} calm={calm} />}
              </div>
            )}
            {phase === "done" && result && (
              <div className="paper rise" style={{ padding: 16, marginTop: 16, textAlign: "center" }}>
                {result.outcome === "win" ? (
                  <>
                    <p className="f-display" style={{ fontSize: 28, margin: 0, color: "var(--press-red)" }}>{prizeName(result.prize!)}</p>
                    <p style={{ margin: "6px 0 12px" }}>{t("won")}</p>
                  </>
                ) : (
                  <>
                    <p className="f-chalk" style={{ fontSize: 24, margin: 0 }}>{t("lose")}</p>
                    {result.prize && <p style={{ margin: "6px 0 12px" }}>{t("still")}<b>{prizeName(result.prize)}</b></p>}
                  </>
                )}
                {verified === null && <p style={{ fontSize: 13 }}>{t("unverified")}</p>}
                {result.couponId && (
                  <ol className="next-steps" style={{ textAlign: "left", margin: "4px auto 14px", maxWidth: 320, paddingLeft: 22, fontSize: 15 }}>
                    <li>{t("step1")}</li>
                    <li>{t("step2")}</li>
                  </ol>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  {result.couponId && <a className="plate red" href={`/w/${result.couponId}`}>{t("show")}</a>}
                  <a className={"plate" + (result.couponId ? " ghost" : "")} href="/w">{t("wallet")}</a>
                  <button className="plate ghost" onClick={sendGift}>{t("gift")}</button>
                </div>
                {giftMsg && <p role="status" style={{ fontSize: 14, margin: "10px 0 0" }}>{giftMsg}</p>}
              </div>
            )}
            {closedTag && <ClosedTag reason={ready!.reason!} open={c?.open_minute ?? 0} lang={glang} />}
          </div>
          <p style={{ textAlign: "center", marginTop: 24 }}>
            <a href={`/s/${shop.slug}/niyam`} style={{ color: dusk ? "#E2CDA2" : "var(--fg)", fontWeight: 600, padding: "12px 4px", display: "inline-block" }}>{t("rules")}</a>
          </p>
          <p style={{ textAlign: "center", fontSize: 13, color: dusk ? "#E2CDA2" : undefined }}>{shop.address}, {shop.city}</p>
        </div>
      </section>

      {/* docked gullak, on every customer screen */}
      <button ref={gullakRef} aria-label={`${t("wallet")} (${count})`} onClick={() => (location.href = "/w")}
        style={{ position: "fixed", right: 14, bottom: 14, width: 64, height: 64, background: "none", border: 0, padding: 0, zIndex: 50, viewTransitionName: "gullak" } as React.CSSProperties}>
        <GullakArt size={64} />
        <span className="f-mono" style={{ position: "absolute", top: -4, right: -4, minWidth: 24, height: 24, borderRadius: 12, background: "var(--press-red)", color: "#fff", border: "2px solid var(--ink)", fontWeight: 700, fontSize: 13, display: "grid", placeItems: "center" }}>{count}</span>
      </button>

      {/* C1: the matchbox overlay */}
      {box !== "open" && (
        <div role="dialog" aria-modal="true" aria-label={shop.name} onClick={open}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: dusk ? "#2A1A12" : "#E9D9B5", perspective: 1400,
            transition: opening ? `opacity ${calm ? 250 : 400}ms ease ${calm ? 0 : repeat ? 0 : 1000}ms` : undefined, opacity: opening ? 0 : 1 }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.18 }} className="halftone" />
          <div style={{ textAlign: "center", position: "relative", width: "min(88vw, 420px)" }}>
            <h1 className="f-display truck" style={{ fontSize: "clamp(32px, 10vw, 50px)", margin: "0 0 14px", color: p.a, ["--sh" as string]: p.b, lineHeight: 1 }}>
              {shop.name_local ?? shop.name}
            </h1>
            <div style={{ position: "relative", width: "100%", aspectRatio: "5 / 3" }}>
              {/* tray */}
              <div style={{ position: "absolute", inset: "6% 4%", background: "#E2CDA2", border: "3px solid var(--ink)",
                transform: opening && !calm ? "translateY(-62%)" : repeat ? "translateY(-22%)" : "none", transition: `transform ${repeat ? 400 : 900}ms var(--ease-hero)` }}>
                <div style={{ position: "absolute", inset: 8, border: "2px dashed #6E2C17", display: "grid", placeItems: "center" }}>
                  <span className="f-chalk" style={{ fontSize: 20 }}>{repeat ? `Visit ${Math.max(2, ready?.visitN ?? 2)}` : "Inaam andar hai"}</span>
                </div>
              </div>
              {/* sleeve */}
              <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", border: "3px solid var(--ink)", background: dusk ? "#6E2C17" : p.b, boxShadow: "6px 7px 0 var(--ink)",
                transform: opening && !calm ? "rotateX(18deg) translateY(30%) scale(.96)" : "none", transition: "transform 900ms var(--ease-hero)" }}>
                <Label palette={shop.palette} initial={shop.initial} seed={shop.slug} title={shop.initial} style={{ position: "absolute", inset: "9% 7% 9% 13%" }} />
                {/* striker strip */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "7%", background: "repeating-linear-gradient(0deg,#6E2C17 0 3px,#3a1a0c 3px 6px)", borderRight: "2px solid var(--ink)" }} />
                <canvas ref={canvasRef} width={120} height={40} style={{ position: "absolute", left: "2%", top: "40%", width: 120, height: 40, pointerEvents: "none" }} />
              </div>
            </div>
            <p style={{ margin: "16px 0 4px", fontWeight: 600, color: dusk ? "#E2CDA2" : "var(--ink)" }}>{shop.address}, {shop.city}</p>
            <p style={{ margin: "0 0 6px", fontSize: 14, color: dusk ? "#E2CDA2" : "var(--ink)" }}>{t("noDl")}</p>
            <p className="f-chalk" style={{ margin: "0 0 16px", fontSize: 17, color: dusk ? "#FFE6A0" : "var(--clay-deep)" }}>{t("howto")}</p>
            <button ref={btn} className="plate red" style={{ fontSize: 22, minHeight: 58, minWidth: 200 }} onClick={(e) => { e.stopPropagation(); open(); }}>
              <span className="f-display">{t("open")}</span>
            </button>
          </div>
        </div>
      )}
      <style>{`
        .keeper-in .kp-head { animation: ${box === "open" ? "kpLook .8s var(--spring-soft) both" : "none"}; }
        .kp-wave { animation: kpWave 1.1s ease-in-out .2s both; }
        @keyframes kpLook { from { transform: rotate(-8deg) } to { transform: rotate(0) } }
        @keyframes kpWave { 0% { transform: rotate(0) } 25% { transform: rotate(-24deg) } 50% { transform: rotate(-6deg) } 75% { transform: rotate(-20deg) } 100% { transform: rotate(0) } }
      `}</style>
    </main>
  );
}

function AlreadyPlayed({ at, t, onGift, giftMsg }: { at: string; t: (k: keyof typeof T) => string; onGift: () => void; giftMsg: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = Math.max(0, new Date(at).getTime() - now);
  const hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000), ss = Math.floor((ms % 60000) / 1000);
  return (
    <div className="chalkboard" style={{ padding: 16, textAlign: "center" }}>
      <p className="f-chalk" style={{ fontSize: 22, margin: 0 }}>{t("played")}</p>
      <p className="f-mono" style={{ fontSize: 30, margin: "8px 0", color: "#F4B400" }}>{String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <a className="plate" href="/w">{t("wallet")}</a>
        <button className="plate ghost" onClick={onGift}>{t("gift")}</button>
      </div>
      {giftMsg && <p role="status" style={{ fontSize: 14, margin: "10px 0 0" }}>{giftMsg}</p>}
    </div>
  );
}

function ClosedTag({ reason, open, lang }: { reason: string; open: number; lang: "hi" | "en" }) {
  const msg = reason === "closed_hours" ? (lang === "hi" ? `Aaj ${minuteLabel(open)} se` : `Opens at ${minuteLabel(open)}`) : lang === "hi" ? "Agla khel jald" : "Next game soon";
  return (
    <div style={{ display: "grid", placeItems: "center", padding: 20 }}>
      <svg viewBox="0 0 220 150" width="220" height="150" aria-hidden="true">
        <path d="M110 4 q-30 20 -10 44" stroke="#6E2C17" strokeWidth="2" fill="none" />
        <path d="M40 48 h140 l20 50 l-20 50 h-140z" fill="#E2CDA2" stroke="#1C1210" strokeWidth="3" transform="rotate(-4 110 98)" />
        <circle cx="176" cy="96" r="6" fill="#F5E9CF" stroke="#1C1210" strokeWidth="2" />
      </svg>
      <p className="f-chalk" style={{ fontSize: 26, marginTop: -100, transform: "rotate(-4deg)", color: "#1C1210" }}>{msg}</p>
      <p style={{ marginTop: 50, fontWeight: 600 }}>{lang === "hi" ? "Dibba abhi band hai." : "The box is shut for now."}</p>
    </div>
  );
}
