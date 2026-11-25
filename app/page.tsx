import type { Metadata } from "next";
import { admin, withShop } from "@/lib/db";
import { availablePrizes, currentCampaign, layoutOf } from "@/lib/server/game";
import { pal } from "@/lib/art";
import { Bulbs, GullakArt } from "@/components/art";
import { Sky } from "@/components/lane/Sky";
import { Stall, type StallKind } from "@/components/lane/Stall";
import LaneMatchbox from "@/components/lane/LaneMatchbox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Gullak: dukaan ka khel, counter ka thappa",
  description: "QR scan-play-win for chai tapris and small shops. A sealed 10-second game, a coupon in a clay gullak on the phone, one stamp at the counter.",
};

const DEMO = "sharma-ji-ki-tapri";

async function demoTray() {
  try {
    const shop = await admin((q) => q.one("select id, slug, palette, initial, name from shops where slug = $1", [DEMO]));
    if (!shop) return null;
    const prizes = await withShop(shop.id, async (q) => {
      const c = await currentCampaign(q, shop.id);
      if (!c) return [];
      const list = await availablePrizes(q, c);
      const layout = layoutOf(list);
      return list
        .map((p) => ({ label: p.label_hi as string, pct: layout.find((l) => l.prizeId === p.id)?.pct ?? 0, remaining: p.remaining as number | null }))
        .filter((p) => p.pct > 0)
        .sort((a, b) => a.pct - b.pct);
    });
    return { shop, prizes };
  } catch {
    return null;
  }
}

type Step = { kind: StallKind; name: string; palette: string; keeper: { face: string; head: string; stache: string; specs: boolean; prop: string }; no: string; who: string; title: string; body: string };
const STEPS: Step[] = [
  { kind: "tapri", name: "Sharma Tapri", palette: "haldi-press-red", keeper: { face: "round", head: "topi", stache: "handlebar", specs: false, prop: "kettle" }, no: "01", who: "Grahak ke liye", title: "Dibba kholo",
    body: "Tapri ka QR scan karo. Matchbox khulta hai, andar aaj ke inaam aur unke asli odds. 10 second ka khel, aur nateeja server pehle hi tay karke seal kar chuka hota hai." },
  { kind: "momo", name: "Tenzin Momos", palette: "mor-haldi", keeper: { face: "long", head: "cap", stache: "thin", specs: false, prop: "steamer" }, no: "02", who: "Gullak", title: "Sikka gullak mein",
    body: "Jeeta hua coupon ek pital ka sikka banta hai aur phone ki mitti ki gullak mein girta hai. Koi app nahi, koi number nahi. Network chala jaaye, tab bhi coupon gullak mein rehta hai." },
  { kind: "kirana", name: "Gupta Kirana", palette: "paan-kesar", keeper: { face: "square", head: "none", stache: "thin", specs: true, prop: "ledger" }, no: "03", who: "Counter", title: "Ek thappa",
    body: "Staff 4 ank ka PIN daalta hai, code ya QR padhta hai, mohar milata hai, aur rubber stamp dabaye rakhta hai. Galti se laga to 10 second mein wapas. Doosri baar scan karo to purana thappa dikhta hai." },
  { kind: "salon", name: "Rani Salon", palette: "rani-haldi", keeper: { face: "round", head: "bun", stache: "none", specs: false, prop: "scissors" }, no: "04", who: "Malik ke liye", title: "Tarazu aur calendar",
    body: "Inaam ke jar, odds ka tarazu jo rupaye aur din mein bolta hai, deewar ka calendar, aur purane grahakon ke liye WhatsApp chitthi jo aap khud bhejte ho. Sab apne phone se." },
];

export default async function Lane() {
  const tray = await demoTray();
  const demoPal = pal(tray?.shop.palette ?? "haldi-press-red");
  return (
    <main className="lane">
      {/* the top of the lane at dusk */}
      <header className="lane-hero">
        <div className="lane-sky"><Sky /></div>
        <div className="lane-bulbs"><Bulbs lit n={14} stagger={70} delay={300} /></div>
        <div className="wrap lane-title">
          <p className="f-serif" style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#1C1210" }}>गुल्लक</p>
          <h1 className="f-display truck" style={{ fontSize: "clamp(64px, 19vw, 132px)", lineHeight: 0.92, margin: "0 0 6px", color: "#F5E9CF", ["--sh" as string]: "#D7261E" }}>Gullak</h1>
          <p className="f-serif" style={{ margin: 0, fontSize: "clamp(20px, 5.4vw, 28px)", fontWeight: 700, color: "#1C1210" }}>Dukaan ka khel, counter ka thappa.</p>
          {/* a handbill pasted on the wall: the words sit on paper, never on the busy rooftops */}
          <div className="handbill">
            <p style={{ margin: 0, fontWeight: 600 }}>
              Grahak QR scan karta hai, 10 second khelta hai, aur jeeta hua coupon phone ki gullak mein rakhta hai. Staff counter par ek thappa lagata hai.
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 14 }}>For chai tapris and small shops: a sealed 10-second game, a coupon kept in a clay gullak on the phone, one stamp at the counter.</p>
            <div className="lane-actions" style={{ marginTop: 12 }}>
              <a className="plate red" href="/demo" style={{ fontSize: 18 }}>Apna demo kholo</a>
              <a className="plate ghost" href="#step-tapri">Kaise chalta hai?</a>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 14 }}>
              <b>Demo mein:</b> aapki apni nakli dukaan, 4 kadam likhe hue. Grahak ban ke khelo, staff ban ke thappa lagao, odds badlo, hisaab dekho.
              <span style={{ display: "block", opacity: 0.8 }}>Your own pretend shop with 4 steps written out. No sign-up.</span>
            </p>
          </div>
        </div>
        <div className="lane-parapet">
          <GullakArt size={92} className="parapet-gullak" />
          <span className="parapet-coin" aria-hidden="true" />
        </div>
      </header>

      {/* four shopfronts stacked up the lane */}
      <div className="lane-road">
        {STEPS.map((s, i) => {
          const p = pal(s.palette);
          return (
            <section key={s.kind} className={"lane-step " + (i % 2 ? "flip" : "")} aria-labelledby={`step-${s.kind}`}>
              <div className="wrap lane-grid">
                <div className="lane-stall"><Stall kind={s.kind} name={s.name} a={p.a} b={p.b} keeper={s.keeper} pattern={i * 2 + 1} /></div>
                <div className="lane-copy">
                  <p className="lane-no"><span className="f-serif">{s.no}</span> {s.who}</p>
                  <h2 id={`step-${s.kind}`} className="f-display" style={{ fontSize: "clamp(34px, 9vw, 52px)", lineHeight: 1, margin: "4px 0 10px", color: p.b === "#F5E9CF" ? "var(--ink)" : p.b }}>{s.title}</h2>
                  <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>{s.body}</p>
                  {i === 0 && (
                    <div style={{ marginTop: 18, maxWidth: 420 }}>
                      <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Yeh asli demo hai. Dibba yahin kholo:</p>
                      <LaneMatchbox slug={DEMO} initial={tray?.shop.initial ?? "श"} palette={tray?.shop.palette ?? "haldi-press-red"} sleeve={demoPal.b} prizes={tray?.prizes ?? []} title={tray?.shop.name ?? "Sharma Ji Ki Tapri"} />
                    </div>
                  )}
                  {i === 1 && (
                    <div className="lane-actions">
                      <a className="plate" href="/w">Meri gullak kholo</a>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="lane-actions">
                      <a className="plate" href="/counter">Counter screen</a>
                      <p className="ticket"><b>Demo:</b> dukaan <span className="f-mono">sharma-ji-ki-tapri</span>, Ramesh ka PIN <span className="f-mono">1234</span></p>
                    </div>
                  )}
                  {i === 3 && (
                    <div className="lane-actions">
                      <a className="plate red" href="/demo">Bina login demo dukaan</a>
                      <a className="plate ghost" href="/signup">Apni dukaan banao</a>
                      <a className="plate ghost" href="/login">Login</a>
                      <p style={{ fontSize: 14, margin: "4px 0 0", width: "100%" }}>Demo dukaan sirf aapki hai: koi aur use nahi dekhta, aur 24 ghante baad mit jaati hai.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <footer className="lane-foot">
        <div className="wrap">
          <div className="ticket-strip">
            <span>Koi download nahi</span>
            <span>Koi number nahi</span>
            <span>Kuch kharidna zaroori nahi</span>
            <span>Asli odds, chhape hue</span>
          </div>
          <p style={{ fontSize: 13, margin: "14px 0 0", color: "#E2CDA2" }}>Gullak ek demo product hai. Sharma Ji Ki Tapri asli dukaan nahi hai. Yeh kanooni salah nahi hai.</p>
        </div>
      </footer>
    </main>
  );
}
