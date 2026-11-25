// Skeletons in the shape of the real scene: an empty shelf, a blank calendar sheet, an empty almirah,
// an empty postman's bag. Never a spinner. Each one holds the same boxes the page will fill, so nothing jumps.
const bar = (w: string, h = 16, extra: React.CSSProperties = {}) => <div className="skel" style={{ width: w, height: h, ...extra }} />;

export function HomeSkeleton() {
  return (
    <main aria-busy="true" aria-label="Dukaan khul rahi hai">
      <section style={{ background: "#2A1A12", padding: "26px 0 26px" }}>
        <div className="wrap" style={{ display: "grid", gap: 12 }}>
          {bar("62%", 44, { background: "rgba(245,233,207,.16)" })}
          {bar("44%", 16, { background: "rgba(245,233,207,.12)" })}
          <div className="chalkboard" style={{ height: 120, marginTop: 10, opacity: 0.8 }} />
        </div>
      </section>
      <div className="wrap" style={{ padding: "22px 16px" }}>
        <div className="paper" style={{ padding: 14, display: "grid", gap: 10 }}>
          {bar("50%", 24)}
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 64, border: "2px dashed rgba(28,18,16,.3)" }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 22, marginTop: 26, borderBottom: "14px solid #7A4A26", paddingBottom: 12 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skel" style={{ aspectRatio: "180/110", border: "3px solid rgba(28,18,16,.4)" }} />)}
        </div>
      </div>
    </main>
  );
}

export function CalendarSkeleton() {
  return (
    <main className="wrap" aria-busy="true" aria-label="Calendar khul raha hai" style={{ padding: "18px 16px 80px" }}>
      {bar("40%", 40)}
      <div style={{ maxWidth: 640, margin: "34px auto 0", border: "3px solid var(--ink)", boxShadow: "6px 8px 0 var(--ink)", background: "#FBF4E2" }}>
        <div style={{ background: "var(--press-red)", height: 54, borderBottom: "3px solid var(--ink)" }} />
        <div style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4 }}>
          {Array.from({ length: 35 }, (_, i) => <div key={i} style={{ aspectRatio: "1", minHeight: 44, border: "1.5px solid #C9B88F" }} />)}
        </div>
      </div>
    </main>
  );
}

export function AlmirahSkeleton() {
  return (
    <main className="wrap" aria-busy="true" aria-label="Inaam khul rahe hain" style={{ padding: "18px 16px 80px" }}>
      {bar("55%", 40, { marginTop: 40 })}
      <div style={{ marginTop: 16, background: "#2A1A12", border: "3px solid var(--ink)", height: 190 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 26, marginTop: 18 }}>
        <div style={{ background: "linear-gradient(90deg,#7d8a83,#9AA7A0 30%,#8E9B94 70%,#6f7c75)", border: "3px solid var(--ink)", padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 150, borderBottom: "6px solid #5d6862", display: "grid", placeItems: "center" }}><div style={{ width: 54, height: 78, border: "2.5px solid rgba(28,18,16,.5)", borderRadius: 8 }} /></div>)}
        </div>
        <div className="skel" style={{ width: "min(100%, 320px)", aspectRatio: "1", borderRadius: "50%", margin: "0 auto" }} />
      </div>
    </main>
  );
}

export function BagSkeleton() {
  return (
    <main className="wrap" aria-busy="true" aria-label="Chitthiyaan aa rahi hain" style={{ padding: "18px 16px 80px" }}>
      {bar("50%", 40)}
      {bar("80%", 16, { marginTop: 12 })}
      <svg viewBox="0 0 400 90" width="100%" height="90" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", marginTop: 40 }}>
        <path d="M10 88 Q 20 20 200 14 Q 380 20 390 88 Z" fill="#7B5A3A" stroke="#1C1210" strokeWidth="3" />
      </svg>
      <div style={{ background: "#7B5A3A", border: "3px solid var(--ink)", borderTop: 0, padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 150, background: "rgba(243,227,191,.5)", border: "2px solid rgba(28,18,16,.5)" }} />)}
      </div>
    </main>
  );
}

/** The painter's bench before the paper is laid: the template tins and a blank creased sheet. */
export function BenchSkeleton() {
  return (
    <main aria-busy="true" aria-label="Painter ka bench lag raha hai" style={{ background: "#5A3A1E", minHeight: "100dvh" }}>
      <div className="wrap" style={{ padding: "18px 16px 80px", display: "grid", gap: 12 }}>
        {bar("38%", 40, { background: "rgba(245,233,207,.18)" })}
        {bar("72%", 16, { background: "rgba(245,233,207,.12)" })}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[90, 120, 100, 80, 110].map((w, i) => <div key={i} style={{ width: w, height: 44, border: "2.5px solid rgba(28,18,16,.6)", background: "rgba(226,205,162,.35)" }} />)}</div>
        <div style={{ width: "min(100%, 420px)", aspectRatio: "1240 / 1754", margin: "18px auto 0", background: "#F3E7CC", border: "3px solid var(--ink)", boxShadow: "6px 8px 0 rgba(0,0,0,.45)", opacity: 0.85 }} />
      </div>
    </main>
  );
}

/** Wooden key hooks with no tags hung yet. */
export function HooksSkeleton() {
  return (
    <main className="wrap" aria-busy="true" aria-label="Chaabiyaan aa rahi hain" style={{ padding: "18px 16px 80px" }}>
      {bar("34%", 40)}
      {bar("80%", 16, { marginTop: 12 })}
      <div style={{ marginTop: 24, background: "#8B5E34", border: "3px solid var(--ink)", minHeight: 260, display: "flex", gap: 34, justifyContent: "center", alignItems: "start", paddingTop: 28 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ display: "grid", justifyItems: "center", gap: 6 }}><div style={{ width: 14, height: 14, borderRadius: 7, background: "#C9A227", border: "2px solid var(--ink)" }} /><div className="skel" style={{ width: 96, height: 70, background: "rgba(232,190,90,.4)", border: "2px solid rgba(28,18,16,.5)" }} /></div>)}
      </div>
    </main>
  );
}

/** A watchman's ruled register, still blank. Also used for settings, which is a ledger of the shop's own details. */
export function RegisterSkeleton({ label = "Register khul raha hai" }: { label?: string }) {
  return (
    <main className="wrap" aria-busy="true" aria-label={label} style={{ padding: "18px 16px 80px" }}>
      {bar("44%", 40)}
      {bar("76%", 16, { marginTop: 12 })}
      <div style={{ marginTop: 24, background: "#FBF4E2", border: "3px solid var(--ink)", boxShadow: "6px 8px 0 var(--ink)", backgroundImage: "repeating-linear-gradient(transparent 0 33px, rgba(14,138,134,.35) 33px 34px)", minHeight: 320, borderLeft: "26px solid #E9DBB8" }} />
    </main>
  );
}
