import { z } from "zod";
import { route, body, ok, clientIp } from "@/lib/http";
import { device } from "@/lib/session";
import { play } from "@/lib/server/game";

const S = z.object({
  idempotencyKey: z.uuid(), nonce: z.string().max(120), pow: z.string().max(40),
  lqt: z.string().max(20).optional(), giftToken: z.string().max(80).optional(), comebackToken: z.string().max(80).optional(),
  toss: z.object({ throws: z.array(z.object({ t: z.number(), vx: z.number(), vy: z.number() })).max(6) }).optional(),
  // used for the geofence check only, then dropped: it is never written anywhere
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), acc: z.number().min(0).max(100000).optional() }).optional(),
});
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const { slug } = await params;
  const b = await body(req, S);
  const dev = (await device(true))!;
  return ok(await play(slug, dev, await clientIp(), b));
});
