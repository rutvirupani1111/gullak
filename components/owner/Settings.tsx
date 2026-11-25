"use client";
import { useRef, useState } from "react";
import { Keeper, Label } from "@/components/art";
import { PALETTES, pal } from "@/lib/art";
import { api, Help } from "./Small";

type Shop = { id: string; slug: string; name: string; name_local: string | null; address: string; city: string; language: string; palette: string; initial: string; keeper: { face: string; head: string; stache: string; specs: boolean; prop: string }; is_demo: boolean };
type Key = { kv: number; created_at: string; retired_at: string | null };

const HEADS = ["topi", "pagdi", "dupatta", "cap", "bun", "none"];
const STACHES = ["handlebar", "thin", "none"];
const PROPS = ["kettle", "ladle", "steamer", "tawa", "scissors", "ledger"];
const FACES = ["round", "long", "square"];

/** Settings: every change saves on its own, shows at once, and can be taken back for 6 seconds. */
export default function Settings({ d }: { d: { shop: Shop; keys: Key[] } }) {
  const [s, setS] = useState(d.shop);
  const [keys, setKeys] = useState(d.keys);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const p = pal(s.palette);

  function say(msg: string, undo?: () => void) {
    setToast({ msg, undo });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 6000);
  }
  async function save(patch: Partial<Shop>, label: string) {
    const prev = s;
    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, prev[k as keyof Shop]])) as Partial<Shop>;
    setS({ ...s, ...patch });
    const r = await api(`/api/v1/shops/${s.id}`, "PATCH", patch);
    if (!r.ok) {
      setS(prev);
      return setErr(r.d.message_hi ?? "Save nahi hua.");
    }
    setErr(null);
    say(`${label} badla. Wapas lo?`, async () => {
      setS((cur) => ({ ...cur, ...before }));
      await api(`/api/v1/shops/${s.id}`, "PATCH", before);
      say(`${label} wapas pehle jaisa.`);
    });
  }

  return (
    <main className="wrap" style={{ padding: "24px 16px 90px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 28, alignItems: "start" }}>
      <section style={{ display: "grid", gap: 18 }}>
        <div>
          <h1 className="f-display" style={{ margin: 0, fontSize: 34 }}>Dukaan ki settings</h1>
          <Help hi="Naam, pata, rang aur dukaandaar yahan badlo. Grahak ko kya dikhega, woh phone wale namoone mein turant dikhta hai." en="Change your shop's name, address, colours and keeper here. The phone preview shows what customers will see." />
        </div>
        <form className="kraftp" style={{ padding: 16, display: "grid", gap: 12, boxShadow: "4px 5px 0 var(--ink)" }} onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save({ name: String(f.get("name")), name_local: String(f.get("name_local") || "") || null, address: String(f.get("address")), city: String(f.get("city")) }, "Naam aur pata");
        }}>
          <label className="field">Dukaan ka naam<input name="name" defaultValue={s.name} required minLength={2} /></label>
          <label className="field">Hindi mein naam<input name="name_local" defaultValue={s.name_local ?? ""} /></label>
          <label className="field">Pata<input name="address" defaultValue={s.address} required /></label>
          <label className="field">Shehar<input name="city" defaultValue={s.city} required /></label>
          <button className="plate" style={{ justifySelf: "start" }}>Naam aur pata save karo</button>
        </form>

        <fieldset className="kraftp" style={{ padding: 16, boxShadow: "4px 5px 0 var(--ink)" }}>
          <legend className="f-serif" style={{ fontWeight: 700, fontSize: 18, background: "var(--kraft)", padding: "0 6px", border: "2px solid var(--ink)" }}>Grahak ki bhasha</legend>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["hi", "हिंदी"], ["hinglish", "Hinglish"], ["en", "English"]].map(([k, l]) => (
              <button key={k} type="button" className={"plate small " + (s.language === k ? "" : "ghost")} aria-pressed={s.language === k} onClick={() => s.language !== k && save({ language: k }, "Bhasha")}>{l}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="kraftp" style={{ padding: 16, boxShadow: "4px 5px 0 var(--ink)" }}>
          <legend className="f-serif" style={{ fontWeight: 700, fontSize: 18, background: "var(--kraft)", padding: "0 6px", border: "2px solid var(--ink)" }}>Rang ki jodi</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {Object.entries(PALETTES).map(([key, v]) => (
              <button type="button" key={key} aria-pressed={s.palette === key} aria-label={v.name} onClick={() => s.palette !== key && save({ palette: key }, "Rang")}
                style={{ height: 52, border: "2.5px solid var(--ink)", background: v.a, position: "relative", cursor: "pointer", boxShadow: s.palette === key ? "0 0 0 3px var(--haldi), 3px 3px 0 var(--ink)" : "3px 3px 0 var(--ink)", transform: s.palette === key ? "translateY(-3px)" : "none", transition: "transform .3s var(--spring-snap)" }}>
                <span style={{ position: "absolute", right: 6, bottom: 6, width: 18, height: 18, borderRadius: 9, background: v.b, border: "2px solid var(--ink)" }} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="kraftp" style={{ padding: 16, display: "grid", gap: 8, boxShadow: "4px 5px 0 var(--ink)" }}>
          <legend className="f-serif" style={{ fontWeight: 700, fontSize: 18, background: "var(--kraft)", padding: "0 6px", border: "2px solid var(--ink)" }}>Dukaandaar</legend>
          {([["Chehra", FACES, "face"], ["Sar", HEADS, "head"], ["Moonchh", STACHES, "stache"], ["Haath mein", PROPS, "prop"]] as const).map(([l, opts, key]) => (
            <div key={key} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ width: 84, fontWeight: 600 }}>{l}</span>
              {opts.map((o) => (
                <button type="button" key={o} className={"plate small " + (s.keeper[key] === o ? "" : "ghost")} aria-pressed={s.keeper[key] === o} onClick={() => s.keeper[key] !== o && save({ keeper: { ...s.keeper, [key]: o } }, "Dukaandaar")}>{o}</button>
              ))}
            </div>
          ))}
        </fieldset>

        <fieldset className="kraftp" style={{ padding: 16, boxShadow: "4px 5px 0 var(--ink)" }}>
          <legend className="f-serif" style={{ fontWeight: 700, fontSize: 18, background: "var(--kraft)", padding: "0 6px", border: "2px solid var(--ink)" }}>Mohar ki chaabi</legend>
          <p style={{ marginTop: 0 }}>Har coupon is chaabi se seal hota hai. Chaabi badalne par purane coupon phir bhi chalenge.</p>
          <ul className="f-mono" style={{ paddingLeft: 18, fontSize: 14 }}>
            {keys.map((k) => <li key={k.kv}>Chaabi {k.kv}: {k.retired_at ? "purani, sirf jaanch ke liye" : "abhi chal rahi"}</li>)}
          </ul>
          <button type="button" className="plate small ghost" onClick={async () => {
            const r = await api(`/api/v1/shops/${s.id}/keys/rotate`, "POST", {});
            if (!r.ok) return setErr(r.d.message_hi);
            setKeys([{ kv: r.d.kv, created_at: new Date().toISOString(), retired_at: null }, ...keys.map((k) => ({ ...k, retired_at: k.retired_at ?? new Date().toISOString() }))]);
            say(`Nayi chaabi ${r.d.kv} lag gayi.`);
          }}>Nayi chaabi banao</button>
        </fieldset>

        {!s.is_demo && (
          <fieldset style={{ padding: 16, border: "2.5px dashed var(--press-red)" }}>
            <legend style={{ fontWeight: 800, color: "var(--press-red)" }}>Dukaan hatao</legend>
            <p style={{ marginTop: 0 }}>Saare khel, coupon, grahakon ke number aur chaabiyan hamesha ke liye mit jaayengi. Yeh wapas nahi hota. Pakka karne ke liye web naam likho: <b className="f-mono">{s.slug}</b></p>
            <label className="field">Web naam<input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="none" /></label>
            <button type="button" className="plate red" style={{ marginTop: 10 }} disabled={confirm !== s.slug} onClick={async () => {
              const r = await api(`/api/v1/shops/${s.id}`, "DELETE", { confirm });
              if (!r.ok) return setErr(r.d.message_hi);
              location.href = "/dukaan";
            }}>Hamesha ke liye hatao</button>
          </fieldset>
        )}
        {err && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700 }}>{err}</p>}
      </section>

      <aside style={{ position: "sticky", top: 70 }}>
        <div style={{ width: 300, maxWidth: "100%", margin: "0 auto", border: "10px solid var(--ink)", borderRadius: 26, background: "#2A1A12", padding: 14, boxSizing: "border-box" }}>
          <p className="f-display truck" style={{ textAlign: "center", fontSize: 26, color: p.a, ["--sh" as string]: p.b, margin: "4px 0 10px", lineHeight: 1 }}>{s.name_local || s.name}</p>
          <div style={{ aspectRatio: "5/3", border: "3px solid var(--ink)", background: p.b, position: "relative", boxShadow: "5px 6px 0 #000" }}>
            <Label palette={s.palette} initial={s.initial} seed={s.slug} title={s.initial} style={{ position: "absolute", inset: "9% 7% 9% 13%" }} />
          </div>
          <div style={{ display: "grid", placeItems: "center", marginTop: 10 }}><Keeper k={s.keeper} apron={p.b} size={120} /></div>
          <p style={{ color: "#E2CDA2", textAlign: "center", fontSize: 13, margin: "6px 0 0" }}>Grahak ko aisa dikhega</p>
        </div>
      </aside>

      {toast && (
        <div role="status" className="rise" style={{ position: "fixed", left: 16, right: 16, bottom: 16, margin: "0 auto", maxWidth: 460, zIndex: 60, background: "var(--ink)", color: "var(--newsprint)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, border: "2px solid var(--haldi)" }}>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          {toast.undo && <button className="plate small" onClick={() => { const u = toast.undo!; setToast(null); u(); }}>Wapas lo</button>}
        </div>
      )}
    </main>
  );
}
