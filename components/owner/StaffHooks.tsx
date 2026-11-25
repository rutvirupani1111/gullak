"use client";
// O7: wooden key hooks, one brass key tag per staff member. PINs are set here and never shown again.
import { useState } from "react";
import { api } from "./Small";

type St = { id: string; name: string; active: boolean; locked_until: string | null; today: number };

export default function StaffHooks({ shopId, slug, initial }: { shopId: string; slug: string; initial: St[] }) {
  const [staff, setStaff] = useState(initial);
  const [f, setF] = useState({ name: "", pin: "" });
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);

  function flash(text: string, undo?: () => void) {
    setToast({ text, undo });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 6000);
  }
  async function toggle(s: St) {
    const next = !s.active;
    setStaff((x) => x.map((y) => (y.id === s.id ? { ...y, active: next } : y)));
    const r = await api(`/api/v1/staff/${s.id}`, "PATCH", { active: next });
    if (!r.ok) {
      setStaff((x) => x.map((y) => (y.id === s.id ? s : y)));
      return flash(r.d.message_hi);
    }
    flash(next ? `${s.name} ki chaabi wapas khoonti par.` : `${s.name} ki chaabi utaar li. Counter se bahar.`, async () => {
      setStaff((x) => x.map((y) => (y.id === s.id ? { ...y, active: s.active } : y)));
      await api(`/api/v1/staff/${s.id}`, "PATCH", { active: s.active });
    });
  }

  return (
    <main className="wrap" style={{ padding: "18px 16px 100px" }}>
      <h1 className="f-display" style={{ fontSize: "clamp(30px, 7vw, 44px)", margin: 0 }}>Chaabi ke khoonte</h1>
      <p style={{ margin: "4px 0 0" }}>Har staff ka apna 4 ank ka PIN. Counter par <a href="/counter" onClick={() => { try { localStorage.setItem("gk.counter.slug", slug); } catch {} }}>/counter</a> kholo aur PIN daalo.</p>

      {/* the board of hooks */}
      <div style={{ marginTop: 20, background: "repeating-linear-gradient(90deg,#8A5A32 0 46px,#7A4A26 46px 48px)", border: "3px solid var(--ink)", boxShadow: "6px 7px 0 var(--ink)", padding: "26px 14px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "26px 14px" }}>
        {staff.length === 0 && (
          <p style={{ gridColumn: "1 / -1", color: "var(--newsprint)", margin: 0, fontWeight: 600 }}>Khoonte khaali hain. Neeche pehle staff ka naam aur PIN daalo: unki chaabi yahan latkegi.</p>
        )}
        {staff.map((s, i) => {
          const locked = s.locked_until && new Date(s.locked_until) > new Date();
          return (
            <div key={s.id} style={{ display: "grid", justifyItems: "center", animation: `rise .4s var(--spring-soft) ${i * 50}ms both` }}>
              <svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><circle cx="20" cy="8" r="6" fill="#C8962E" stroke="#1C1210" strokeWidth="2" /><path d="M20 12 v14" stroke="#1C1210" strokeWidth="3" /></svg>
              <div style={{ opacity: s.active ? 1 : 0.4, transform: s.active ? "rotate(-3deg)" : "rotate(8deg) translateY(10px)", transition: "transform .45s var(--spring-soft), opacity .3s", transformOrigin: "50% 0" }}>
                <svg viewBox="0 0 120 92" width="132" height="100" aria-hidden="true">
                  <path d="M60 2 l14 14 h40 v70 h-108 v-70 h40z" fill="#E0B04A" stroke="#1C1210" strokeWidth="3" />
                  <circle cx="60" cy="14" r="5" fill="#8A5A32" stroke="#1C1210" strokeWidth="2" />
                  <path d="M16 30 h88" stroke="#1C1210" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="60" y="58" textAnchor="middle" fontSize="19" fontWeight="800" fill="#1C1210" style={{ fontFamily: "var(--f-serif)" }}>{s.name.slice(0, 11)}</text>
                  <text x="60" y="78" textAnchor="middle" fontSize="12" fill="#1C1210" style={{ fontFamily: "var(--f-mono)" }}>aaj {s.today} thappe</text>
                </svg>
              </div>
              {locked && <span style={{ background: "var(--press-red)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "2px 6px" }}>15 min band</span>}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button className="plate small" onClick={() => { setPinFor(s.id); setNewPin(""); }}>PIN badlo</button>
                <button className="plate small ghost" onClick={() => toggle(s)}>{s.active ? "Utaaro" : "Wapas"}</button>
              </div>
              {pinFor === s.id && (
                <form style={{ display: "flex", gap: 6, marginTop: 8 }} onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await api(`/api/v1/staff/${s.id}`, "PATCH", { pin: newPin });
                  if (!r.ok) return flash(r.d.message_hi);
                  setPinFor(null);
                  setStaff((x) => x.map((y) => (y.id === s.id ? { ...y, locked_until: null } : y)));
                  flash(`${s.name} ka naya PIN laga. Purane session band.`);
                }}>
                  <input aria-label="Naya PIN" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" required value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="f-mono" style={{ width: 74, minHeight: 44, fontSize: 20, textAlign: "center", border: "2px solid var(--ink)", background: "#FBF4E2" }} />
                  <button className="plate small paan">Lagao</button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <form className="paper" style={{ padding: 16, marginTop: 26, display: "grid", gap: 12, maxWidth: 460 }} onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        const r = await api(`/api/v1/shops/${shopId}/staff`, "POST", f);
        setBusy(false);
        if (!r.ok) return setErr(r.d.message_hi);
        setStaff([...staff, { ...r.d, locked_until: null, today: 0 }]);
        setF({ name: "", pin: "" });
        flash(`${r.d.name} ki chaabi khoonti par lag gayi.`);
      }}>
        <h2 className="f-serif" style={{ margin: 0 }}>Nayi chaabi</h2>
        <label className="field">Naam<input required maxLength={30} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ramesh" /></label>
        <label className="field">4 ank ka PIN<input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} className="f-mono" /></label>
        {err && <p role="alert" style={{ color: "var(--press-red)", fontWeight: 700, margin: 0 }}>{err}</p>}
        <button className="plate red" disabled={busy}>{busy ? "..." : "Khoonti par lagao"}</button>
      </form>

      {toast && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 60, maxWidth: 520, margin: "0 auto", background: "var(--ink)", color: "var(--newsprint)", border: "2px solid var(--haldi)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, animation: "rise .35s var(--spring-soft) both" }}>
          <span style={{ flex: 1 }}>{toast.text}</span>
          {toast.undo && <button className="plate small" onClick={() => { toast.undo!(); setToast(null); }}>Wapas lo</button>}
        </div>
      )}
    </main>
  );
}
