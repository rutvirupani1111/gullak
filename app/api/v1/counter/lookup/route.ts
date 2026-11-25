import { z } from "zod";
import { route, body, ok } from "@/lib/http";
import { requireStaff } from "@/lib/session";
import { lookup } from "@/lib/server/counter";

const S = z.object({ code: z.string().max(12).optional(), qr: z.string().max(80).optional() });
export const POST = route(async (req) => {
  const b = await body(req, S);
  const st = await requireStaff();
  return ok(await lookup(st, b));
});
