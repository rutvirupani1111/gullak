import { route, ok } from "@/lib/http";
import { device } from "@/lib/session";
import { walletFor } from "@/lib/server/wallet";

export const GET = route(async () => {
  const dev = await device(false);
  return ok({ coupons: dev ? await walletFor(dev) : [] });
});
