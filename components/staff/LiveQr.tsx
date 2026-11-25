"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function LiveQr({ shop }: { shop?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState(60);
  const [meta, setMeta] = useState<{ campaign: string; slug: string } | null>(null);
  useEffect(() => {
    let rot = 0;
    const load = async () => {
      const r = await fetch("/api/v1/counter/live" + (shop ? `?shop=${encodeURIComponent(shop)}` : ""));
      const d = await r.json();
      if (!r.ok) return setErr(d.message_hi);
      rot = new Date(d.rotatesAt).getTime();
      setMeta({ campaign: d.campaign, slug: d.slug });
      setSvg(await QRCode.toString(`${location.origin}/s/${d.slug}?lqt=${d.token}`, { type: "svg", margin: 1, color: { dark: "#1C1210", light: "#FFFFFF" } }));
    };
    load();
    const i = setInterval(() => {
      const s = Math.max(0, Math.round((rot - Date.now()) / 1000));
      setLeft(s);
      if (rot && Date.now() >= rot) load();
    }, 500);
    return () => clearInterval(i);
  }, [shop]);
  return (
    <main style={{ minHeight: "100dvh", background: "#fff", display: "grid", placeItems: "center", padding: 16, textAlign: "center" }}>
      {err ? (
        <div className="paper" style={{ padding: 18 }}><p>{err}</p><a className="plate" href="/counter">Counter par jao</a></div>
      ) : (
        <div>
          <p className="f-display" style={{ fontSize: 30, margin: 0, color: "var(--press-red)" }}>Yeh QR scan karo</p>
          <p style={{ margin: "4px 0 12px" }}>{meta?.campaign} · har 60 second mein badalta hai</p>
          <div style={{ width: "min(80vw, 420px)", aspectRatio: "1", margin: "0 auto", opacity: svg ? 1 : 0.2 }} dangerouslySetInnerHTML={{ __html: svg ?? "" }} />
          <div style={{ height: 8, background: "#eee", marginTop: 12, border: "2px solid var(--ink)" }}><div style={{ height: "100%", width: `${(left / 60) * 100}%`, background: "var(--haldi)", transition: "width .5s linear" }} /></div>
          <p className="f-mono">{left}s</p>
          <p style={{ fontSize: 14, maxWidth: 360, margin: "8px auto 0", lineHeight: 1.45 }}>
            Yeh screen counter wale phone par khuli rakho. Grahak isi QR se khelte hain, isliye poster ki photo kahin aur se kaam nahi karti.
            <span style={{ display: "block", opacity: 0.7 }}>Keep this open on the counter phone. Customers scan it to play, so a photo of the poster cannot be used from elsewhere.</span>
          </p>
          {shop && <a className="plate small ghost" href={`/dukaan/${shop}`} style={{ marginTop: 12 }}>Dukaan par wapas</a>}
        </div>
      )}
    </main>
  );
}
