export default function NotFound() {
  return (
    <main style={{ minHeight: "80dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="paper" style={{ padding: 24, maxWidth: 420, textAlign: "center" }}>
        <p className="f-display" style={{ fontSize: 40, margin: 0, color: "var(--press-red)" }}>Gali band hai</p>
        <p>Yeh panna nahi mila. This page was not found.</p>
        <a className="plate" href="/">Bazaar par wapas</a>
      </div>
    </main>
  );
}
