import QRCode from "qrcode";
import { headers } from "next/headers";
import { ownerShop } from "@/lib/session";
import { admin } from "@/lib/db";
import PosterBench from "@/components/owner/PosterBench";
export default async function Page({ params }: { params: Promise<{ shop: string }> }) {
  const s = await ownerShop((await params).shop);
  const shop = await admin((q) => q.one("select slug, name, name_local, address, city, palette, initial, keeper from shops where id = $1", [s.id]));
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL || `https://${h.get("host")}`;
  const url = `${site}/s/${shop!.slug}?src=poster`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1C1210", light: "#F5E9CF" } });
  return <PosterBench shop={JSON.parse(JSON.stringify(shop))} qr={qr} qrText={url} url={url.replace(/^https?:\/\//, "").replace("?src=poster", "")} />;
}
