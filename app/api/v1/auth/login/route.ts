import { z } from "zod";
import { route, body, ok, fail, clientIp } from "@/lib/http";
import { admin } from "@/lib/db";
import { scryptVerify } from "@/lib/crypto";
import { startOwnerSession } from "@/lib/session";
import { takeToken } from "@/lib/server/game";

const S = z.object({ login: z.string().trim().min(3).max(80), password: z.string().min(1).max(200) });
export const POST = route(async (req) => {
  const b = await body(req, S);
  if ((await takeToken("login:" + (await clientIp()), 10, 10 / 900)) < 0) return fail(429, "rate_limited", "Thodi der baad try karo.", "Try again in a few minutes.");
  const phone = b.login.replace(/[^0-9]/g, "").slice(-10);
  const o = await admin((q) => q.one("select id, password_hash from owners where email = $1 or (phone = $2 and $2 <> '')", [b.login.toLowerCase(), phone]));
  if (!o || !scryptVerify(b.password, o.password_hash)) return fail(401, "bad_login", "Email/phone ya password galat hai.", "Wrong email/phone or password.");
  await startOwnerSession(o.id);
  return ok({ ok: true });
});
