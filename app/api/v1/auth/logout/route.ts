import { cookies } from "next/headers";
import { route, ok } from "@/lib/http";
import { admin } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { C_OWNER } from "@/lib/session";
export const POST = route(async () => {
  const jar = await cookies();
  const t = jar.get(C_OWNER)?.value;
  if (t) await admin((q) => q.query("delete from owner_sessions where token_hash = $1", [sha256(t)]));
  jar.delete(C_OWNER);
  jar.delete("gk_demo");
  return ok({ ok: true });
});
