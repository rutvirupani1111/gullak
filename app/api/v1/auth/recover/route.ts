import { z } from "zod";
import { route, body, ok, fail, clientIp } from "@/lib/http";
import { admin } from "@/lib/db";
import { scryptHash, scryptVerify } from "@/lib/crypto";
import { startOwnerSession } from "@/lib/session";
import { takeToken } from "@/lib/server/game";

const S = z.object({ login: z.string().trim().min(3).max(80), code: z.string().trim().min(10).max(14), password: z.string().min(8).max(200) });
export const POST = route(async (req) => {
  const b = await body(req, S);
  if ((await takeToken("recover:" + (await clientIp()), 5, 5 / 3600)) < 0) return fail(429, "rate_limited", "Thodi der baad try karo.", "Try again later.");
  const phone = b.login.replace(/[^0-9]/g, "").slice(-10);
  const id = await admin(async (q) => {
    const o = await q.one("select id from owners where email = $1 or (phone = $2 and $2 <> '')", [b.login.toLowerCase(), phone]);
    if (!o) return null;
    const codes = await q.query("select id, code_hash from owner_recovery_codes where owner_id = $1 and used_at is null", [o.id]);
    const hit = codes.find((c) => scryptVerify(b.code.toUpperCase().replace(/[^A-Z0-9]/g, ""), c.code_hash));
    if (!hit) return null;
    await q.query("update owner_recovery_codes set used_at = now() where id = $1", [hit.id]);
    await q.query("update owners set password_hash = $2 where id = $1", [o.id, scryptHash(b.password)]);
    await q.query("delete from owner_sessions where owner_id = $1", [o.id]);
    return o.id as string;
  });
  if (!id) return fail(401, "bad_code", "Code ya login galat hai.", "Wrong code or login.");
  await startOwnerSession(id);
  return ok({ ok: true });
});
