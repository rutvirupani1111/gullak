import { ownerShop } from "@/lib/session";
import { withShop } from "@/lib/db";
const REASON: Record<string, string> = { already_played: "Doosri baar khelne ki koshish", subnet_velocity: "Ek hi network se bahut khel", pow_invalid: "Nakli request", nonce_reused: "Purani request dobara", live_qr_missing: "Bina live QR ke khel", staff_pin_lock: "Galat PIN 5 baar", geofence: "Dukaan se door", redeem_rate_unusual: "Staff ke thappe zyada" };
export default async function Page({ params }: { params: Promise<{ shop: string }> }) {
  const s = await ownerShop((await params).shop);
  const d = await withShop(s.id, async (q) => ({
    abuse: await q.query("select reason, created_at from abuse_log where shop_id = $1 order by created_at desc limit 60", [s.id]),
    red: await q.query("select r.created_at, r.staff_name, r.undone_at, co.code, p.label_hi from redemptions r join coupons co on co.id = r.coupon_id join prizes p on p.id = co.prize_id where r.shop_id = $1 order by r.created_at desc limit 40", [s.id]),
  }));
  const f = (t: string) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <main className="wrap" style={{ padding: "20px 16px 60px" }}>
      <h1 className="f-display" style={{ fontSize: 34, margin: "0 0 4px" }}>Chowkidar ka register</h1>
      <p className="paper" style={{ padding: 12, maxWidth: 640 }}>Incognito aur naye phone se kuch log 2 baar khel sakte hain (lagbhag 5 se 10 pratishat). Isliye bade inaam ke liye Live QR on rakhein.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginTop: 16 }}>
        <section className="paper" style={{ padding: 0, backgroundImage: "repeating-linear-gradient(#F5E9CF 0 31px, #b8c6d6 31px 32px)" }}>
          <h2 className="f-serif" style={{ margin: 0, padding: "10px 14px", borderBottom: "2px solid var(--press-red)" }}>Roki gayi koshishein</h2>
          {d.abuse.length === 0 && <p style={{ padding: "8px 14px", lineHeight: "32px" }}>Abhi tak sab theek. Jab koi doosri baar khelne ki koshish karega, woh yahan likha jayega.</p>}
          {d.abuse.map((a, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0 14px", lineHeight: "32px" }}><span>{REASON[a.reason] ?? a.reason}</span><span className="f-mono" style={{ fontSize: 13 }}>{f(a.created_at)}</span></div>)}
        </section>
        <section className="paper" style={{ padding: 0, backgroundImage: "repeating-linear-gradient(#F5E9CF 0 31px, #b8c6d6 31px 32px)" }}>
          <h2 className="f-serif" style={{ margin: 0, padding: "10px 14px", borderBottom: "2px solid var(--press-red)" }}>Thappe ka hisaab</h2>
          {d.red.length === 0 && <p style={{ padding: "8px 14px", lineHeight: "32px" }}>Abhi koi thappa nahi. Counter par pehla coupon stamp hote hi yahan dikhega.</p>}
          {d.red.map((r, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 14px", lineHeight: "32px", textDecoration: r.undone_at ? "line-through" : undefined }}><span className="f-mono">{r.code}</span><span>{r.label_hi}</span><span>{r.staff_name}{r.undone_at ? " (wapas)" : ""}</span><span className="f-mono" style={{ fontSize: 13 }}>{f(r.created_at)}</span></div>)}
        </section>
      </div>
    </main>
  );
}
