"use client";
import { useEffect, useRef, useState } from "react";
import { Keeper, Label, Bulbs } from "@/components/art";
import { pal } from "@/lib/art";
import { api, Help } from "./Small";

type D = {
  shop: { id: string; slug: string; name: string; name_local: string | null; address: string; city: string; palette: string; initial: string; keeper: { face: string; head: string; stache: string; specs: boolean; prop: string }; is_demo: boolean };
  campaigns: { id: string; name: string; title_hi: string; status: string; game: string; starts_at: string; ends_at: string }[];
  today: { scans: number; plays: number; wins: number; redeemed: number };
  staff: { id: string; name: string }[];
  alert: { staff_name: string; n: number } | null;
  progress: { plays: number; stamps: number; live: number; tuned: number };
};
const ST: Record<string, string> = { live: "Chalu", paused: "Ruka", draft: "Kaccha", ended: "Khatam" };
const GAME: Record<string, string> = { chakri: "Chakri", patti: "Lottery patti", toss: "Gullak toss" };
type Step = { key: string; done: boolean; title: string; hi: string; en: string; href: string; cta: string; onGo?: () => void };

export default function Home({ d }: { d: D }) {
  const [camps, setCamps] = useState(d.campaigns);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [local, setLocal] = useState<{ poster: boolean; hisaab: boolean; hide: boolean }>({ poster: false, hisaab: false, hide: false });
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const p = pal(d.shop.palette);
  const slug = d.shop.slug;
  const base = `/dukaan/${slug}`;
  useEffect(() => {
    try {
      setLocal({ poster: !!localStorage.getItem("gk.poster." + slug), hisaab: !!localStorage.getItem("gk.hisaab." + slug), hide: !!localStorage.getItem("gk.guide.hide." + slug) });
    } catch {}
  }, [slug]);

  function flash(text: string, undo?: () => void) {
    setToast({ text, undo });
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 6000);
  }
  /** Optimistic: the matchbox on the shelf changes at once; the server hears it now; Wapas lo puts it back. */
  async function act(id: string, action: "publish" | "pause" | "end", quiet = false) {
    const prev = camps;
    const was = camps.find((c) => c.id === id)!.status;
    const wasLive = camps.find((c) => c.status === "live" && c.id !== id)?.id ?? null;
    setCamps((cs) => cs.map((c) => (c.id === id ? { ...c, status: action === "publish" ? "live" : action === "pause" ? "paused" : "ended" } : action === "publish" && c.status === "live" ? { ...c, status: "paused" } : c)));
    const r = await api(`/api/v1/campaigns/${id}/status`, "POST", { action });
    if (!r.ok) {
      setCamps(prev);
      return flash(r.d.message_hi || "Save nahi hua. Dobara try karo.");
    }
    if (quiet) return;
    const undo = async () => {
      // put the shelf back the way it was: the other live game first, then this one
      if (wasLive) await act(wasLive, "publish", true);
      else if (was !== "live" && action === "publish") await act(id, "pause", true);
      else if (was === "live" && action === "pause") await act(id, "publish", true);
      flash("Pehle jaisa kar diya.");
    };
    flash(action === "publish" ? "Khel chalu. Grahak ab yahi khel dekhenge." : "Khel ruk gaya. Grahak ko 'Agla khel jald' dikhega.", undo);
  }

  const live = camps.find((c) => c.status === "live");
  const firstCamp = live ?? camps.find((c) => c.status !== "ended");
  const rememberCounter = () => { try { localStorage.setItem("gk.counter.slug", slug); } catch {} };
  const steps: Step[] = d.shop.is_demo
    ? [
        { key: "play", done: d.progress.plays > 0, title: "Grahak bano", hi: "Apni dukaan ka dibba kholo aur ek baar khelo.", en: "Open your shop as a customer and play once.", href: `/s/${slug}`, cta: "Dibba kholo" },
        { key: "stamp", done: d.progress.stamps > 0, title: "Counter par thappa lagao", hi: "Jeeta hua coupon counter screen par stamp karo. Ramesh ka PIN 1234.", en: "Stamp the coupon you won on the counter screen. Ramesh's PIN is 1234.", href: "/counter", cta: "Counter kholo", onGo: rememberCounter },
        { key: "tune", done: d.progress.tuned > 0, title: "Inaam ke odds badlo", hi: "Chalu khel kholo, kisi inaam ka stock ya odds badlo.", en: "Open the live game and change a prize's stock or odds.", href: firstCamp ? `${base}/khel/${firstCamp.id}` : `${base}/khel/new`, cta: "Inaam kholo" },
        { key: "see", done: local.hisaab, title: "Hisaab dekho", hi: "Calendar par aaj ka din chhuo: aapka khel wahan gina gaya.", en: "Tap today on the calendar: your game is counted there.", href: `${base}/hisaab`, cta: "Calendar kholo" },
      ]
    : [
        { key: "live", done: d.progress.live > 0, title: "Inaam rakho, khel chalu karo", hi: "Khel kholo, inaam aur stock bharo, phir 'Chalu karo' dabao.", en: "Open your game, fill in prizes and stock, then press 'Chalu karo' (start).", href: firstCamp ? `${base}/khel/${firstCamp.id}` : `${base}/khel/new`, cta: "Khel kholo" },
        { key: "staff", done: d.staff.length > 0, title: "Staff ka PIN banao", hi: "Counter wale ka naam aur 4 ank ka PIN daalo.", en: "Add the counter person's name and a 4-digit PIN.", href: `${base}/staff`, cta: "Staff jodo" },
        { key: "poster", done: local.poster, title: "QR poster print karo", hi: "Poster ka PDF lo aur counter par chipkao.", en: "Download the poster PDF and stick it on your counter.", href: `${base}/poster`, cta: "Poster banao" },
        { key: "play", done: d.progress.plays > 0, title: "Khud ek baar khelo", hi: "Apne phone se QR scan karke dekho ki grahak ko kya dikhega.", en: "Scan the QR with your own phone to see what customers see.", href: `/s/${slug}`, cta: "Grahak ki tarah kholo" },
      ];
  const next = steps.find((s) => !s.done);
  const doneN = steps.filter((s) => s.done).length;

  return (
    <main>
      <section style={{ background: "#2A1A12", color: "var(--newsprint)", paddingBottom: 26 }}>
        <Bulbs lit />
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 20, alignItems: "end" }}>
          <div>
            <h1 className="f-display truck" style={{ fontSize: "clamp(34px, 8vw, 54px)", color: p.a, ["--sh" as string]: p.b, margin: "0 0 6px", lineHeight: 1 }}>{d.shop.name_local || d.shop.name}</h1>
            <p style={{ margin: 0 }}>{d.shop.address}, {d.shop.city}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <a className="plate" href={`/s/${slug}`}>Grahak ki tarah kholo</a>
              <a className="plate ghost" href="/counter" onClick={rememberCounter}>Counter screen</a>
              <a className="plate ghost" href={`/counter/live?shop=${slug}`}>Live QR</a>
            </div>
          </div>
          {/* the counter board, chalked with today's numbers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 8 }}>
            <div className="chalkboard" style={{ padding: 14 }}>
              <p className="f-chalk" style={{ margin: "0 0 6px", fontSize: 20 }}>Aaj ka hisaab <span style={{ fontSize: 14, opacity: 0.8 }}>(today)</span></p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, textAlign: "center" }}>
                {([["Scan", d.today.scans, "QR khula"], ["Khel", d.today.plays, "khele"], ["Jeete", d.today.wins, "inaam"], ["Thappe", d.today.redeemed, "diye"]] as const).map(([l, n, s]) => (
                  <div key={l}><div className="f-chalk" style={{ fontSize: 30, color: "#F4B400" }}>{n}</div><div className="f-chalk" style={{ fontSize: 15 }}>{l}</div><div style={{ fontSize: 11, opacity: 0.7 }}>{s}</div></div>
                ))}
              </div>
            </div>
            <Keeper k={d.shop.keeper} apron={p.b} size={96} />
          </div>
        </div>
      </section>

      <div className="wrap" style={{ padding: "22px 16px 90px" }}>
        {d.alert && <p className="paper" style={{ padding: 12, borderColor: "var(--press-red)" }}><b>Dhyan dein:</b> {d.alert.staff_name} ne aaj {d.alert.n} thappe lagaye, roz se 3 guna zyada. <a href={`${base}/chowkidar`}>Register dekho</a></p>}

        {/* what to do next: every tick is read from the database (or this phone), never assumed */}
        {next && !local.hide ? (
          <section aria-labelledby="next-h" className="paper" style={{ padding: "14px 14px 16px", marginBottom: 26 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h2 id="next-h" className="f-serif" style={{ margin: 0, fontSize: 24 }}>Aage kya karein? <span style={{ fontSize: 15, fontWeight: 500 }}>What to do next</span></h2>
              <span className="f-mono" style={{ fontWeight: 700 }}>{doneN} / {steps.length}</span>
            </div>
            <p style={{ margin: "4px 0 12px", fontSize: 15 }}>{d.shop.is_demo ? "Yeh demo 4 kadam mein samajh aata hai. Har kadam asli hai, aur ho jaane par yahan tick lagta hai." : "Dukaan 4 kadam mein taiyaar. Har kadam ho jaane par yahan apne aap tick lagta hai."}</p>
            <ol className="guide">
              {steps.map((s) => (
                <li key={s.key} data-done={s.done ? "1" : undefined} data-next={s === next ? "1" : undefined}>
                  <div>
                    <b style={{ fontSize: 17 }}>{s.title}</b>
                    <p>{s.hi}</p>
                    <p style={{ fontSize: 14, opacity: 0.75 }}>{s.en}</p>
                    {s === next && <a className="plate red small" href={s.href} onClick={s.onGo} style={{ marginTop: 8 }}>{s.cta}</a>}
                    {s.done && <p style={{ fontWeight: 800, color: "var(--paan)" }}>Ho gaya</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <p style={{ margin: "0 0 18px", fontSize: 14 }}>
            {next ? <button className="plate small ghost" onClick={() => { try { localStorage.removeItem("gk.guide.hide." + slug); } catch {} setLocal({ ...local, hide: false }); }}>Aage kya karein? dikhao</button> : <><b style={{ color: "var(--paan)" }}>Sab set hai.</b> Dukaan taiyaar hai: grahak QR scan karke khel sakte hain.</>}
          </p>
        )}

        <h2 className="f-serif" style={{ fontSize: 26, margin: "4px 0 0" }}>Shelf par khel <span style={{ fontSize: 15, fontWeight: 500 }}>Your games</span></h2>
        <Help hi={<>Har matchbox ek khel hai. Ek samay par ek hi khel chalu rehta hai. Matchbox chhuo: inaam, odds aur samay wahan badlo.</>} en={<>Each matchbox is one game. Only one runs at a time. Tap a matchbox to change its prizes, odds and hours.</>} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 22, marginTop: 14, paddingBottom: 12, borderBottom: "14px solid #7A4A26", boxShadow: "0 8px 0 var(--ink)" }}>
          {camps.map((c, i) => (
            <div key={c.id} style={{ animation: `rise .4s var(--spring-soft) ${i * 60}ms both` }}>
              <a href={`${base}/khel/${c.id}`} style={{ display: "block", aspectRatio: "180/110", border: "3px solid var(--ink)", boxShadow: "5px 6px 0 var(--ink)", opacity: c.status === "ended" ? 0.55 : 1, transition: "opacity .3s, transform .4s var(--spring-soft)", transform: c.status === "live" ? "translateY(-4px)" : "none" }} aria-label={`${c.name}: inaam aur odds`}>
                <Label palette={d.shop.palette} initial={d.shop.initial} seed={c.id} title={GAME[c.game]} pattern={i * 3} />
              </a>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 6 }}>
                <div><b>{c.name}</b><div style={{ fontSize: 13 }}>{GAME[c.game]} · <span style={{ fontWeight: 800, color: c.status === "live" ? "var(--paan)" : undefined }}>{ST[c.status]}</span></div></div>
                {c.status !== "live" && c.status !== "ended" && <button className="plate small paan" onClick={() => act(c.id, "publish")}>Chalu karo</button>}
                {c.status === "live" && <button className="plate small ghost" onClick={() => act(c.id, "pause")}>Roko</button>}
              </div>
            </div>
          ))}
          <a href={`${base}/khel/new`} className="kraftp" style={{ display: "grid", placeItems: "center", aspectRatio: "180/110", border: "3px dashed var(--ink)", textDecoration: "none", fontWeight: 800, textAlign: "center", padding: 10 }}>
            <span><span className="f-display" style={{ fontSize: 34, display: "block" }}>+</span>Naya khel banao<br /><small style={{ fontWeight: 500 }}>New game</small></span>
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16, marginTop: 34 }}>
          {([["hisaab", "Hisaab", "Calendar", "Har din ki bheed, khel aur thappe.", "Daily crowd, games and stamps."], ["wapas-bulao", "Purane grahak", "Chitthi ka thaila", "Jo kaafi din se nahi aaye, unhe WhatsApp par bulao.", "Invite back regulars who stopped coming."], ["poster", "Poster", "Painter ka bench", "QR poster banao aur print karo.", "Make and print your QR poster."], ["staff", "Staff", "Chaabi ke khoonte", `${d.staff.length} staff. PIN jodo ya badlo.`, "Add staff or change a PIN."]] as const).map(([h, t, art, s, en]) => (
            <a key={h} href={`${base}/${h}`} className="kraftp" style={{ padding: 16, textDecoration: "none", boxShadow: "4px 5px 0 var(--ink)" }}>
              <b className="f-serif" style={{ fontSize: 21 }}>{t}</b> <span style={{ fontSize: 13, opacity: 0.7 }}>{art}</span>
              <p style={{ margin: "4px 0 0" }}>{s}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.75 }}>{en}</p>
            </a>
          ))}
        </div>
        {next && !local.hide && (
          <p style={{ marginTop: 22, fontSize: 13 }}><button style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", minHeight: 44, padding: 0 }} onClick={() => { try { localStorage.setItem("gk.guide.hide." + slug, "1"); } catch {} setLocal({ ...local, hide: true }); }}>"Aage kya karein" chhupao</button></p>
        )}
      </div>

      {toast && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 60, maxWidth: 520, margin: "0 auto", background: "var(--ink)", color: "var(--newsprint)", border: "2px solid var(--haldi)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, animation: "rise .35s var(--spring-soft) both" }}>
          <span style={{ flex: 1 }}>{toast.text}</span>
          {toast.undo && <button className="plate small" onClick={() => { const u = toast.undo!; setToast(null); u(); }}>Wapas lo</button>}
        </div>
      )}
    </main>
  );
}
