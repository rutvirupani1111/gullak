import { cookies } from "next/headers";
import { route, ok } from "@/lib/http";
import { C_STAFF } from "@/lib/session";
export const POST = route(async () => {
  (await cookies()).delete(C_STAFF);
  return ok({ ok: true });
});
