import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { deviceRO } from "@/lib/session";
import { walletFor } from "@/lib/server/wallet";
import ShowCoupon from "@/components/customer/ShowCoupon";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ couponId: string }> }) {
  const { couponId } = await params;
  const dev = await deviceRO();
  const c = dev ? (await walletFor(dev)).find((x) => x.id === couponId) : null;
  if (!c) notFound();
  const qr = await QRCode.toString(`GK1:${c.shop.slug}:${c.code}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return <ShowCoupon c={c} qr={qr} />;
}
