"use client";
import { useState } from "react";
import { Keeper, Label } from "@/components/art";
import { PALETTES, pal } from "@/lib/art";

export async function api(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, d };
}

export function OwnerNavInner({ slug, name }: { slug: string; name: string }) {
  const links = [["", "Darwaza"], ["/hisaab", "Calendar"], ["/wapas-bulao", "Wapas bulao"], ["/poster", "Poster"], ["/staff", "Staff"], ["/chowkidar", "Chowkidar"]];
  return (
    <nav className="noprint" style={{ background: "var(--ink)", color: "var(--newsprint)", position: "sticky", top: 0, zIndex: 20 }}>
      <div className="wrap" style={{ display: "flex", gap: 6, alignItems: "center", overflowX: "auto", padding: "6px 16px" }}>
        <a href={`/dukaan/${slug}`} className="f-display" style={{ color: "var(--haldi)", fontSize: 20, textDecoration: "none", whiteSpace: "nowrap", marginRight: 6 }}>{name}</a>
        {links.map(([h, l]) => <a key={h} href={`/dukaan/${slug}${h}`} style={{ color: "var(--newsprint)", padding: "12px 8px", whiteSpace: "nowrap", fontWeight: 600, fontSize: 14 }}>{l}</a>)}
        <a href={`/s/${slug}`} style={{ color: "var(--haldi)", padding: "12px 8px", whiteSpace: "nowrap", fontWeight: 700, fontSize: 14 }}>Grahak ki nazar se</a>
        <button onClick={async () => { await api("/api/v1/auth/logout", "POST", {}); location.href = "/"; }} style={{ marginLeft: "auto", background: "none", color: "var(--newsprint)", border: "1px solid", padding: "8px 10px", minHeight: 40 }}>Bahar</button>
      </div>
    </nav>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" | "recover" }) {
  const [f, setF] = useState({ name: "", login: "", password: "", code: "" });
  const [err, setErr] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  if (codes)
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
        <div className="paper" style={{ padding: 20, maxWidth: 440 }}>
          <h1 className="f-display" style={{ margin: 0, fontSize: 30 }}>Recovery chitthi</h1>
          <p>Password bhool gaye to inme se ek code kaam aayega. Har code ek hi baar chalta hai. Inhe abhi likh lo ya print karo: yeh dobara nahi dikhenge.</p>
          <ol className="f-mono" style={{ columns: 2, fontSize: 17, lineHeight: 1.8 }}>{codes.map((c) => <li key={c}>{c.slice(0, 5)}-{c.slice(5)}</li>)}</ol>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="plate ghost noprint" onClick={() => print()}>Print karo</button>
            <a className="plate red noprint" href="/dukaan/setup">Aage: dukaan banao</a>
          </div>
        </div>
      </main>
    );
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <form className="paper" style={{ padding: 22, width: "min(400px, 100%)", boxSizing: "border-box", display: "grid", gap: 12 }} onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        const url = mode === "login" ? "/api/v1/auth/login" : mode === "signup" ? "/api/v1/auth/signup" : "/api/v1/auth/recover";
        const r = await api(url, "POST", mode === "signup" ? { name: f.name, login: f.login, password: f.password } : mode === "login" ? { login: f.login, password: f.password } : f);
        setBusy(false);
        if (!r.ok) return setErr(r.d.message_hi + (r.d.issues ? " (" + r.d.issues.map((i: { path: string[] }) => i.path.join(".")).join(", ") + ")" : ""));
        if (mode === "signup") setCodes(r.d.codes);
        else location.href = "/dukaan";
      }}>
        <h1 className="f-display" style={{ margin: 0, fontSize: 32, color: "var(--press-red)" }}>{mode === "login" ? "Dukaan mein aao" : mode === "signup" ? "Nayi dukaan, naya khel" : "Password wapas"}</h1>
        {mode === "signup" && <label className="field">Aapka naam<input value={f.name} onChange={set("name")} required autoComplete="name" /></label>}
        <label className="field">Email ya phone<input value={f.login} onChange={set("login")} required autoComplete="username" /></label>
        {mode === "recover" && <label className="field">Recovery code<input value={f.code} onChange={set("code")} required className="f-mono" /></label>}
        <label className="field">{mode === "recover" ? "Naya password" : "Password"} {mode !== "login" && <small>(kam se kam 8 akshar)</small>}<input type="password" value={f.password} onChange={set("password")} required minLength={mode === "login" ? 1 : 8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {err && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700, margin: 0 }}>{err}</p>}
        <button className="plate red" disabled={busy}>{busy ? "..." : mode === "login" ? "Andar chalo" : mode === "signup" ? "Account banao" : "Password badlo"}</button>
        <p style={{ margin: 0, fontSize: 14 }}>
          {mode === "login" ? <><a href="/signup">Naya account</a> · <a href="/recover">Password bhool gaye?</a></> : <a href="/login">Pehle se account hai? Login</a>} · <a href="/demo">Bina login demo</a>
        </p>
      </form>
    </main>
  );
}

const HEADS = ["topi", "pagdi", "dupatta", "cap", "bun", "none"];
const STACHES = ["handlebar", "thin", "none"];
const PROPS = ["kettle", "ladle", "steamer", "tawa", "scissors", "ledger"];
export function SetupForm() {
  const [s, setS] = useState({ name: "", name_local: "", address: "", city: "", language: "hi", palette: "haldi-press-red", initial: "", slug: "" });
  const [k, setK] = useState({ face: "round", head: "topi", stache: "handlebar", specs: false, prop: "kettle" });
  const [avail, setAvail] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slugOf = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const checkSlug = async (v: string) => { if (v.length < 3) return setAvail(null); const r = await api(`/api/v1/shops?slug=${encodeURIComponent(v)}`, "GET"); setAvail(r.d.available); };
  const p = pal(s.palette);
  return (
    <main className="wrap" style={{ padding: "24px 16px 60px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 24 }}>
      <form style={{ display: "grid", gap: 14 }} onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null);
        const r = await api("/api/v1/shops", "POST", { ...s, name_local: s.name_local || undefined, initial: s.initial || s.name.slice(0, 1).toUpperCase(), keeper: k });
        setBusy(false);
        if (!r.ok) return setErr(r.d.message_hi);
        location.href = `/dukaan/${r.d.slug}`;
      }}>
        <h1 className="f-display" style={{ margin: 0, fontSize: 34 }}>Dukaan banao</h1>
        <label className="field">Dukaan ka naam<input required value={s.name} onChange={(e) => { const v = e.target.value; setS({ ...s, name: v, slug: slugOf(v), initial: s.initial || v.slice(0, 1).toUpperCase() }); checkSlug(slugOf(v)); }} /></label>
        <label className="field">Hindi mein naam (zaroori nahi)<input value={s.name_local} onChange={(e) => setS({ ...s, name_local: e.target.value })} /></label>
        <label className="field">Pata<input required value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} /></label>
        <label className="field">Shehar<input required value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })} /></label>
        <label className="field">Web naam: gullak.vercel.app/s/<input required value={s.slug} pattern="[a-z0-9-]{3,40}" onChange={(e) => { setS({ ...s, slug: e.target.value }); checkSlug(e.target.value); }} />
          {avail !== null && <small style={{ color: avail ? "var(--paan)" : "var(--press-red)", fontWeight: 700 }}>{avail ? "Khaali hai" : "Pehle se liya hua"}</small>}</label>
        <fieldset style={{ border: 0, padding: 0 }}><legend style={{ fontWeight: 600 }}>Rang</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {Object.entries(PALETTES).map(([key, v]) => (
              <button type="button" key={key} aria-pressed={s.palette === key} aria-label={v.name} onClick={() => setS({ ...s, palette: key })}
                style={{ height: 48, border: s.palette === key ? "4px solid var(--ink)" : "2px solid var(--ink)", background: `linear-gradient(135deg, ${v.a} 50%, ${v.b} 50%)`, cursor: "pointer" }} />
            ))}
          </div>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, display: "grid", gap: 8 }}><legend style={{ fontWeight: 600 }}>Dukaandaar, 3 tap mein</legend>
          {[["Sar", HEADS, "head"], ["Moonchh", STACHES, "stache"], ["Haath mein", PROPS, "prop"]].map(([l, opts, key]) => (
            <div key={key as string} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ width: 80 }}>{l as string}</span>
              {(opts as string[]).map((o) => <button type="button" key={o} className={"plate small " + ((k as Record<string, unknown>)[key as string] === o ? "" : "ghost")} onClick={() => setK({ ...k, [key as string]: o })}>{o}</button>)}
            </div>
          ))}
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={k.specs} onChange={(e) => setK({ ...k, specs: e.target.checked })} style={{ width: 22, height: 22 }} /> Chashma</label>
        </fieldset>
        {err && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700 }}>{err}</p>}
        <button className="plate red" disabled={busy || avail === false}>{busy ? "..." : "Dukaan kholo"}</button>
      </form>
      <aside style={{ position: "sticky", top: 70, alignSelf: "start" }}>
        <div style={{ width: 300, maxWidth: "100%", margin: "0 auto", border: "10px solid var(--ink)", borderRadius: 26, background: "#E9D9B5", padding: 14, boxSizing: "border-box" }}>
          <p className="f-display truck" style={{ textAlign: "center", fontSize: 26, color: p.a, ["--sh" as string]: p.b, margin: "4px 0 10px" }}>{s.name_local || s.name || "Aapki dukaan"}</p>
          <div style={{ aspectRatio: "5/3", border: "3px solid var(--ink)", background: p.b, position: "relative", boxShadow: "5px 6px 0 var(--ink)" }}>
            <Label palette={s.palette} initial={s.initial || "?"} seed={s.slug || "x"} title={s.initial || "?"} style={{ position: "absolute", inset: "9% 7% 9% 13%" }} />
          </div>
          <div style={{ display: "grid", placeItems: "center", marginTop: 10 }}><Keeper k={k} apron={p.b} size={120} /></div>
        </div>
      </aside>
    </main>
  );
}
