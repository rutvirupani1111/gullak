import { z } from "zod";
import { route, body, ok } from "@/lib/http";
import { requireStaff } from "@/lib/session";
import { undo } from "@/lib/server/counter";

const S = z.object({ redemptionId: z.uuid() });
export const POST = route(async (req) => {
  const b = await body(req, S);
  const st = await requireStaff();
  return ok(await undo(st, b.redemptionId));
});
