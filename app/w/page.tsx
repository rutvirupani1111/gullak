import { deviceRO } from "@/lib/session";
import { walletFor } from "@/lib/server/wallet";
import Wallet from "@/components/customer/Wallet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meri gullak" };
export default async function Page() {
  const dev = await deviceRO();
  const coupons = dev ? await walletFor(dev) : [];
  return <Wallet initial={coupons} />;
}
