import { notFound } from "next/navigation";
import { admin, withShop } from "@/lib/db";
import { availablePrizes, currentCampaign, layoutOf } from "@/lib/server/game";
import { minuteLabel } from "@/lib/time";
import { rupees } from "@/lib/art";

export const dynamic = "force-dynamic";
export default async function Rules({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await admin((q) => q.one("select * from shops where slug = $1", [slug]));
  if (!shop) notFound();
  const d = await withShop(shop.id, async (q) => {
    const c = await currentCampaign(q, shop.id);
    if (!c) return null;
    const prizes = await availablePrizes(q, c);
    return { c, prizes, layout: layoutOf(prizes) };
  });
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <main style={{ minHeight: "100dvh", padding: "24px 16px", background: "var(--tin)" }}>
      <article className="paper" style={{ maxWidth: 680, margin: "0 auto", padding: "22px 20px", transform: "rotate(-.4deg)" }}>
        <p className="f-chalk" style={{ margin: 0 }}>Suchna / Official rules</p>
        <h1 className="f-display" style={{ fontSize: 34, margin: "4px 0 6px", color: "var(--press-red)" }}>{shop.name}</h1>
        <p style={{ margin: 0 }}>Aayojak / Organiser: {shop.name}, {shop.address}, {shop.city}</p>
        {shop.is_demo && <p style={{ fontWeight: 800 }}>Demo dukaan: yeh asli dukaan nahi hai.</p>}
        {!d ? <p>Abhi koi khel nahi chal raha. / No game is running right now.</p> : (
          <>
            <h2 className="f-serif" style={{ fontSize: 22 }}>{d.c.title_hi} / {d.c.title_en}</h2>
            <ul style={{ lineHeight: 1.6, paddingLeft: 18 }}>
              <li>Taareekh / Dates: {fmt(d.c.starts_at)} se {fmt(d.c.ends_at)} tak</li>
              <li>Samay / Hours: {d.c.open_minute === 0 && d.c.close_minute >= 1440 ? "poore din, raat 12 se raat 12 tak / all day" : `${minuteLabel(d.c.open_minute)} se ${minuteLabel(d.c.close_minute % 1440)} tak`} (Asia/Kolkata)</li>
              <li><b>Khelne ke liye kuch kharidna zaroori nahi.</b> No purchase is necessary to play.</li>
              <li>Ek phone, ek khel har {d.c.play_period === "day" ? "din" : d.c.play_period === "week" ? "hafte" : "campaign"} / One play per device per {d.c.play_period}. After you share your number, also one play per number.</li>
              {d.c.live_qr_required && <li>Counter ke phone ka QR scan karna zaroori hai / The live QR on the counter phone is required.</li>}
              {d.c.geofence_m ? <li>Sirf dukaan ke {d.c.geofence_m} m ke andar khel sakte hain. Khelo dabane par phone jagah poochhta hai; jagah sirf jaanch ke liye hai, save nahi hoti. / Play works only within {d.c.geofence_m} m of the shop. Your location is checked once and never stored.</li> : null}
              <li>Nateeja server tay karta hai aur dukaan ki chaabi se seal karta hai. The server draws every result and signs it with the shop key.</li>
              <li>Rozana inaam budget / Daily give-away budget: {rupees(d.c.daily_budget_paise)}</li>
            </ul>
            <h3 className="f-serif">Inaam aur asli odds / Prizes and live odds</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
              <thead><tr style={{ textAlign: "left", borderBottom: "2px solid var(--ink)" }}><th>Inaam</th><th>Odds</th><th>Bache / Total</th><th>Rozana max</th></tr></thead>
              <tbody>
                {d.prizes.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px dashed var(--ink)" }}>
                    <td style={{ padding: "6px 4px" }}>{p.label_hi} / {p.label_en}{p.min_bill_paise ? ` (min bill ${rupees(p.min_bill_paise)})` : ""}</td>
                    <td className="f-mono">{d.layout.find((l) => l.prizeId === p.id)?.pct ?? 0}%</td>
                    <td className="f-mono">{p.remaining === null ? "no limit" : `${p.remaining} / ${p.total_stock}`}</td>
                    <td className="f-mono">{p.daily_cap ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Jab koi inaam khatam ho jaata hai, baaki inaamon ke odds unke wazan ke hisaab se barabar badh jaate hain. When a prize runs out, the remaining odds are recomputed in proportion to the other prizes' weights.</p>
            <p>Coupon {d.prizes[0]?.expiry_days ?? 7} din mein khatam hota hai, ek baar counter par thappa lagta hai. Coupons expire after the stated days and are stamped once at the counter.</p>
          </>
        )}
        <h3 className="f-serif">Data</h3>
        <p>Hum aapka naam ya number nahi maangte. Phone number sirf tab, jab aap khud gullak mein &quot;Yaad dilaayein&quot; chunein. Gullak kholkar &quot;Mera data hatao&quot; se kabhi bhi hata sakte hain. IP address kabhi seedha save nahi hota.</p>
        <p><a href={`/s/${slug}`} className="plate small">Wapas dukaan par</a></p>
      </article>
    </main>
  );
}
