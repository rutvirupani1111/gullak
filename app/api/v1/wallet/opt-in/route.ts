import { z } from "zod";
import { route, body, ok, clientIp } from "@/lib/http";
import { HttpError, withShop } from "@/lib/db";
import { device } from "@/lib/session";
import { encPhone, ipHash, phoneHash, sha256 } from "@/lib/crypto";
import { shopBySlug } from "@/lib/server/game";
import { consentText, CONSENT_VERSION } from "@/lib/consent";

const S = z.object({
  shopSlug: z.string().max(40), phone: z.string().regex(/^[6-9][0-9]{9}$/), firstName: z.string().trim().max(30).optional(),
  consent: z.object({ version: z.string(), lang: z.enum(["hi", "en", "hinglish"]), checked: z.literal(true) }),
});
export const POST = route(async (req) => {
  const b = await body(req, S);
  const dev = await device(true);
  const shop = await shopBySlug(b.shopSlug);
  if (!shop) throw new HttpError(404, "not_found", "Dukaan nahi mili.", "Shop not found.");
  const e164 = "+91" + b.phone;
  const text = consentText(shop.name, b.consent.lang);
  const ip = await clientIp();
  await withShop(shop.id, async (q) => {
    const existing = await q.one("select id from customers where shop_id = $1 and phone_hash = $2", [shop.id, phoneHash(e164)]);
    const vals = [b.firstName || null, encPhone(e164), phoneHash(e164), CONSENT_VERSION, sha256(text), b.consent.lang, ipHash(ip)];
    if (existing) {
      await q.query("update customers set first_name = coalesce($2, first_name), phone_enc = $3, phone_hash = $4, wa_opt_in = true, consent_version = $5, consent_text_sha256 = $6, consent_at = now(), consent_lang = $7, consent_source = 'wallet_after_win', consent_ip_hash = $8, deleted_at = null, device_id = $9 where id = $1", [existing.id, ...vals, dev]);
    } else {
      await q.query("insert into customers (shop_id, device_id, first_name, phone_enc, phone_hash, wa_opt_in, consent_version, consent_text_sha256, consent_at, consent_lang, consent_source, consent_ip_hash) values ($1,$2,$3,$4,$5,true,$6,$7,now(),$8,'wallet_after_win',$9)", [shop.id, dev, ...vals]);
    }
    await q.query("insert into events (shop_id, device_id, kind) values ($1,$2,'opt_in')", [shop.id, dev]);
  });
  return ok({ ok: true }, 201);
});
