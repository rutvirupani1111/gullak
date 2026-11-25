import { redirect } from "next/navigation";
import { admin } from "@/lib/db";
import { owner } from "@/lib/session";
import { Label } from "@/components/art";

export const dynamic = "force-dynamic";
export default async function Page() {
  const o = await owner();
  if (!o) redirect("/login");
  const shops = await admin((q) => q.query("select slug, name, city, palette, initial from shops where owner_id = $1 order by created_at", [o.id]));
  if (!shops.length) redirect("/dukaan/setup");
  return (
    <main className="wrap" style={{ padding: "28px 16px" }}>
      <h1 className="f-display" style={{ fontSize: 36 }}>Namaste, {o.name}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 18 }}>
        {shops.map((s) => (
          <a key={s.slug} href={`/dukaan/${s.slug}`} className="paper" style={{ padding: 10, textDecoration: "none", color: "var(--ink)" }}>
            <Label palette={s.palette} initial={s.initial} seed={s.slug} title={s.initial} style={{ aspectRatio: "180/110" }} />
            <b style={{ display: "block", marginTop: 8 }}>{s.name}</b><span>{s.city}</span>
          </a>
        ))}
        <a href="/dukaan/setup" className="plate ghost" style={{ minHeight: 120 }}>+ Nayi dukaan</a>
      </div>
    </main>
  );
}
