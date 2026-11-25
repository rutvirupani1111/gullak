import { NextResponse } from "next/server";
import { route, clientIp, fail } from "@/lib/http";
import { setDemoCookie } from "@/lib/session";
import { buildDemo, randomSlugTail } from "@/lib/server/shop";
import { takeToken } from "@/lib/server/game";

export const maxDuration = 30;
// Every visitor gets a private sandbox copy of the demo shop, gone after 24 hours.
export const GET = route(async (req) => {
  if ((await takeToken("demo:" + (await clientIp()), 6, 6 / 3600)) < 0) return fail(429, "rate_limited", "Thodi der baad naya demo banao.", "Try a new demo a little later.");
  const shop = await buildDemo("demo-" + randomSlugTail(), true);
  await setDemoCookie(shop.id);
  return NextResponse.redirect(new URL(`/dukaan/${shop.slug}`, req.url), 303);
});
