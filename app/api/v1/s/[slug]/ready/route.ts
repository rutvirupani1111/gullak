import { z } from "zod";
import { route, body, ok, clientIp } from "@/lib/http";
import { device } from "@/lib/session";
import { ready } from "@/lib/server/game";

const S = z.object({ lqt: z.string().max(20).optional(), giftToken: z.string().max(80).optional(), comebackToken: z.string().max(80).optional() });
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const { slug } = await params;
  const b = await body(req, S);
  const dev = (await device(true))!;
  return ok(await ready(slug, dev, await clientIp(), b));
});
