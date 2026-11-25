import { z } from "zod";
import { route, body, ok, fail, clientIp } from "@/lib/http";
import { withShop } from "@/lib/db";
import { scryptVerify } from "@/lib/crypto";
import { startStaffSession } from "@/lib/session";
import { shopBySlug, takeToken, logAbuse } from "@/lib/server/game";

const S = z.object({ shopSlug: z.string().max(40), pin: z.string().regex(/^[0-9]{4}$/) });
export const POST = route(async (req) => {
  const b = await body(req, S);
  const shop = await shopBySlug(b.shopSlug.trim().toLowerCase());
  if (!shop) return fail(404, "not_found", "Yeh dukaan nahi mili. Web naam dobara dekho.", "Shop not found. Check the web name.");
  const ip = await clientIp();
  if ((await takeToken("pin:" + shop.id + ":" + ip, 20, 20 / 3600)) < 0) return fail(429, "rate_limited", "Bahut koshish ho gayi. Ek ghante baad.", "Too many tries. Wait an hour.");
  const staff = await withShop(shop.id, (q) => q.query("select * from staff where shop_id = $1 and active", [shop.id]));
  const now = Date.now();
  for (const s of staff) {
    if (!scryptVerify(b.pin, s.pin_hash)) continue;
    if (s.locked_until && new Date(s.locked_until).getTime() > now) return fail(423, "locked", "15 minute baad try karo, ya malik se PIN badlwao.", "Try again in 15 minutes, or ask the owner to reset the PIN.", { lockedUntil: s.locked_until });
    await withShop(shop.id, (q) => q.query("update staff set failed_count = 0, locked_until = null where id = $1", [s.id]));
    await startStaffSession(s.id, shop.id);
    return ok({ name: s.name, shop: { slug: shop.slug, name: shop.name } });
  }
  // A wrong PIN counts against every active staff member of this shop (we cannot tell whose PIN it was).
  const r = await withShop(shop.id, (q) =>
    q.one<{ failed_count: number; locked_until: string | null }>(
      `update staff set failed_count = failed_count + 1, locked_until = case when failed_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end
       where shop_id = $1 and active returning failed_count, locked_until`, [shop.id]),
  );
  if (r && r.failed_count >= 5) {
    await logAbuse(shop.id, null, "staff_pin_lock", null, ip);
    return fail(423, "locked", "15 minute baad try karo, ya malik se PIN badlwao.", "Locked for 15 minutes, or ask the owner to reset the PIN.", { lockedUntil: r.locked_until });
  }
  return fail(401, "bad_pin", "PIN galat hai.", "Wrong PIN.", { attemptsLeft: Math.max(0, 5 - (r?.failed_count ?? 0)) });
});
