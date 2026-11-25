import { z } from "zod";
import { randomBytes } from "node:crypto";
import { route, body, ok, fail, clientIp } from "@/lib/http";
import { admin } from "@/lib/db";
import { scryptHash } from "@/lib/crypto";
import { startOwnerSession } from "@/lib/session";
import { takeToken } from "@/lib/server/game";
import { COMMON } from "@/lib/consent";

const S = z.object({ name: z.string().trim().min(2).max(60), login: z.string().trim().min(5).max(80), password: z.string().min(8).max(200) });
const B32 = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
export const POST = route(async (req) => {
  const b = await body(req, S);
  if ((await takeToken("signup:" + (await clientIp()), 5, 5 / 3600)) < 0) return fail(429, "rate_limited", "Ek ghante mein 5 se zyada account nahi.", "No more than 5 sign-ups an hour.");
  if (COMMON.has(b.password.toLowerCase())) return fail(400, "weak_password", "Yeh password bahut aam hai. Koi aur chuno.", "That password is too common. Pick another.");
  const isEmail = b.login.includes("@");
  const phone = isEmail ? null : b.login.replace(/[^0-9]/g, "").slice(-10);
  if (!isEmail && (!phone || phone.length !== 10)) return fail(400, "invalid", "Email ya 10 ankon ka phone daalo.", "Enter an email or a 10-digit phone.");
  const codes = Array.from({ length: 8 }, () => Array.from(randomBytes(10), (x) => B32[x % B32.length]).join(""));
  const id = await admin(async (q) => {
    const o = await q.one<{ id: string }>(
      "insert into owners (email, phone, password_hash, name) values ($1,$2,$3,$4) on conflict do nothing returning id",
      [isEmail ? b.login.toLowerCase() : null, phone, scryptHash(b.password), b.name],
    );
    if (!o) return null;
    for (const c of codes) await q.query("insert into owner_recovery_codes (owner_id, code_hash) values ($1,$2)", [o.id, scryptHash(c)]);
    return o.id;
  });
  if (!id) return fail(409, "exists", "Is email/phone se account pehle se hai. Login karo.", "An account already uses this. Sign in instead.");
  await startOwnerSession(id);
  return ok({ codes }, 201);
});
