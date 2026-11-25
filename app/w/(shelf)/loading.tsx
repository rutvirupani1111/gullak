// The gullak shelf before the coupons are counted: the same wall, shelf and clay pot, no spinner.
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Gullak khul rahi hai" style={{ minHeight: "100dvh", background: "linear-gradient(#E9D9B5 0 62%, #7A4A26 62% 64%, #5b3519 64%)", display: "grid", justifyItems: "center", alignContent: "start", paddingTop: 70 }}>
      <div className="skel" style={{ width: 210, height: 40, background: "rgba(28,18,16,.15)" }} />
      <div style={{ width: 150, height: 150, borderRadius: "50%", marginTop: 26, background: "#B9502B", border: "3px solid #1C1210", opacity: 0.55 }} />
    </main>
  );
}
