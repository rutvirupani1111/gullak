import { z } from "zod";
import { route, body, ok } from "@/lib/http";
import { requireStaff } from "@/lib/session";
import { redeem } from "@/lib/server/counter";

const S = z.object({ couponId: z.uuid(), idempotencyKey: z.uuid() });
export const POST = route(async (req) => {
  const b = await body(req, S);
  const st = await requireStaff();
  return ok(await redeem(st, b.couponId, b.idempotencyKey));
});
