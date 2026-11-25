"use client";
import { useState } from "react";
import { Label } from "@/components/art";
import { TEMPLATES } from "@/lib/templates";
import { api } from "./Small";
import { GameProp } from "./GameProp";

const GAMES = [
  ["chakri", "Chakri", "Ghoomta pahiya. Har hissa asli odds jitna bada."],
  ["patti", "Lottery patti", "Ungli se ghiso, inaam niklega."],
  ["toss", "Gullak toss", "Jhoolti gullak mein sikka daalo. Hunar se bade inaam khulte hain."],
] as const;

/** Naya khel: pick a festival matchbox off the shelf, load a game on the handcart, then set odds on the tarazu. */
export default function NewKhel({ shop, last }: { shop: { id: string; slug: string; palette: string; initial: string }; last: { id: string; name: string; game: string } | null }) {
  const [tpl, setTpl] = useState(TEMPLATES[0].key);
  const t = TEMPLATES.find((x) => x.key === tpl)!;
  const [game, setGame] = useState<string>(t.game);
  const [name, setName] = useState(t.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    const r = await api(`/api/v1/shops/${shop.id}/campaigns`, "POST", body);
    if (!r.ok) {
      setBusy(false);
      return setErr(r.d.message_hi ?? "Khel nahi bana. Dobara try karo.");
    }
    location.href = `/dukaan/${shop.slug}/khel/${r.d.id}`;
  }

  return (
    <main className="wrap" style={{ padding: "24px 16px 80px" }}>
      <h1 className="f-display" style={{ margin: "0 0 4px", fontSize: 34 }}>Naya khel</h1>
      <p style={{ margin: "0 0 18px" }}>Ek dibba chuno. Naam aur inaam ke idea bhar jaayenge. Odds aur stock aap tarazu par khud tay karoge. Khel tab tak kaccha rahega.</p>

      <h2 className="f-serif" style={{ fontSize: 22, margin: "0 0 10px" }}>Tyohaar ki shelf</h2>
      <div role="radiogroup" aria-label="Template" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(46%, 170px), 1fr))", gap: 16, paddingBottom: 14, borderBottom: "14px solid #7A4A26", boxShadow: "0 8px 0 var(--ink)" }}>
        {TEMPLATES.map((x, i) => (
          <button key={x.key} role="radio" aria-checked={tpl === x.key} onClick={() => { setTpl(x.key); setGame(x.game); setName(x.name); }}
            style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", transform: tpl === x.key ? "translateY(-8px) rotate(-1.5deg)" : "none", transition: "transform .35s var(--spring-snap)" }}>
            <div style={{ aspectRatio: "180/110", border: "3px solid var(--ink)", boxShadow: tpl === x.key ? `0 0 0 4px ${x.ink}, 5px 6px 0 var(--ink)` : "4px 5px 0 var(--ink)" }}>
              <Label palette={shop.palette} initial={shop.initial} seed={x.key + shop.slug} title={x.hi} pattern={i * 3 + 1} />
            </div>
            <b style={{ display: "block", marginTop: 8 }}>{x.name}</b>
            <span style={{ fontSize: 13 }}>{x.days} din · {x.prizes.length} inaam</span>
          </button>
        ))}
      </div>

      <h2 className="f-serif" style={{ fontSize: 22, margin: "30px 0 10px" }}>Khel ki gaadi</h2>
      <div role="radiogroup" aria-label="Game" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
        {GAMES.map(([g, l, s]) => (
          <button key={g} role="radio" aria-checked={game === g} onClick={() => setGame(g)} className="kraftp"
            style={{ padding: 12, textAlign: "left", cursor: "pointer", display: "grid", gridTemplateColumns: "72px 1fr", gap: 10, alignItems: "center", boxShadow: game === g ? "0 0 0 4px var(--haldi), 5px 6px 0 var(--ink)" : "3px 4px 0 var(--ink)", transform: game === g ? "translateY(-4px)" : "none", transition: "transform .4s var(--spring-soft)" }}>
            <GameProp game={g} size={72} />
            <span><b className="f-serif" style={{ fontSize: 19 }}>{l}</b><br /><span style={{ fontSize: 14 }}>{s}</span></span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginTop: 26 }}>
        <label className="field" style={{ flex: "1 1 240px" }}>Khel ka naam<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} /></label>
        <button className="plate red" disabled={busy || name.trim().length < 2} onClick={() => create({ name: name.trim(), template: tpl, game })}>{busy ? "..." : "Khel banao, tarazu par chalo"}</button>
      </div>
      {last && (
        <p style={{ marginTop: 18 }}>
          Ya pichhla khel dobara: <button className="plate small ghost" disabled={busy} onClick={() => create({ name: last.name + " (naya)", duplicateFrom: last.id })}>&ldquo;{last.name}&rdquo; duplicate karo</button>
        </p>
      )}
      {err && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700 }}>{err}</p>}
      <p style={{ fontSize: 13, marginTop: 20 }}>Khelne ke liye kuch kharidna zaroori nahi hoga. Yeh kanooni salah nahi hai.</p>
    </main>
  );
}
