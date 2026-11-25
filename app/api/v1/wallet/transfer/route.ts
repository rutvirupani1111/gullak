import { route, ok } from "@/lib/http";
import { admin } from "@/lib/db";
import { device } from "@/lib/session";
import { sha256, token } from "@/lib/crypto";

// The old phone shows this token as a QR for 10 minutes. The new phone claims it once.
export const POST = route(async (req) => {
  const dev = (await device(true))!;
  const t = token(18);
  const exp = new Date(Date.now() + 10 * 60000);
  await admin((q) => q.query("insert into device_transfers (token_hash, from_device, expires_at) values ($1,$2,$3)", [sha256(t), dev, exp]));
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return ok({ token: t, exp: exp.toISOString(), url: `${site}/w/transfer?t=${t}` }, 201);
});
