import "server-only";
import { randomInt, randomBytes, timingSafeEqual } from "node:crypto";
import { admin, HttpError, withShop, type Q, type Row } from "../db";
import { appHmac, canonical, hmac, ipHash, sha256, signWith, subnet } from "../crypto";
import { CROCKFORD, luhnChar } from "../code";
import { localDay, localParts, nextPlayAt, periodBucket } from "../time";
import { tierCapFor, tossHits, type Throw } from "../toss-sim";
import { leadingZeroBits, sha256 as sha256js, utf8 } from "../sha256";

export type Shop = Row & { id: string; slug: string; name: string; palette: string; initial: string };

export async function shopBySlug(slug: string): Promise<Shop | null> {
  const s = await admin((q) => q.one<Shop>("select * from shops where slug = $1", [slug]));
  return s ?? null;
}

/** The campaign customers land on: the live one, else the most recent. */
export async function currentCampaign(q: Q, shopId: string) {
  return q.one(
    `select * from campaigns where shop_id = $1 and status in ('live','paused','ended')
     order by (status = 'live' and now() between starts_at and ends_at) desc, (status = 'live') desc, starts_at desc limit 1`,
    [shopId],
  );
}

// ---------- rate buckets (token bucket per key, stored in Postgres) ----------
export async function takeToken(key: string, capacity: number, perSec: number, cost = 1): Promise<number> {
  const r = await admin((q) =>
    q.one<{ tokens: number }>(
      `insert into rate_buckets (key, tokens, updated_at) values ($1, $2::real - $4::real, now())
       on conflict (key) do update set tokens = least($2::real, rate_buckets.tokens + extract(epoch from now() - rate_buckets.updated_at)::real * $3::real) - $4::real, updated_at = now()
       returning tokens`,
      [key, capacity, perSec, cost],
    ),
  );
  return r!.tokens;
}
async function peekTokens(key: string, capacity: number, perSec: number): Promise<number> {
  const r = await admin((q) =>
    q.one<{ tokens: number }>(
      "select least($2::real, tokens + extract(epoch from now() - updated_at)::real * $3::real) as tokens from rate_buckets where key = $1",
      [key, capacity, perSec],
    ),
  );
  return r ? r.tokens : capacity;
}
const subnetKey = (ip: string) => appHmac("subnet:" + localDay() + ":" + subnet(ip)).toString("base64url").slice(0, 22);

export async function logAbuse(shopId: string | null, campaignId: string | null, reason: string, deviceId: string | null, ip: string, detail: Row = {}) {
  await admin((q) =>
    q.query("insert into abuse_log (shop_id, campaign_id, reason, device_id, ip_hash, detail) values ($1,$2,$3,$4,$5,$6)", [shopId, campaignId, reason, deviceId, ipHash(ip), detail]),
  ).catch(() => {});
}

// ---------- proof of work ----------
const PLAY_CAP = 12;
const PLAY_RATE = 12 / 3600;
export async function powBits(ip: string, campaignId: string): Promise<number | null> {
  const t = await peekTokens(`play:${campaignId}:${subnetKey(ip)}`, PLAY_CAP, PLAY_RATE);
  if (t >= 1) return 14;
  const over = Math.ceil(1 - t);
  if (over <= 3) return 17;
  if (over <= 6) return 20;
  return null;
}
export function makeChallenge(bits: number) {
  const exp = Date.now() + 5 * 60_000;
  const raw = `${randomBytes(9).toString("base64url")}.${exp}.${bits}`;
  return { nonce: `${raw}.${appHmac("pow:" + raw).toString("base64url").slice(0, 16)}`, bits, exp };
}
export async function checkPow(nonce: string, pow: string): Promise<"ok" | "pow_invalid" | "nonce_reused"> {
  const parts = nonce.split(".");
  if (parts.length !== 4) return "pow_invalid";
  const raw = parts.slice(0, 3).join(".");
  const mac = Buffer.from(appHmac("pow:" + raw).toString("base64url").slice(0, 16));
  if (mac.length !== parts[3].length || !timingSafeEqual(mac, Buffer.from(parts[3]))) return "pow_invalid";
  if (Number(parts[1]) < Date.now()) return "pow_invalid";
  if (leadingZeroBits(sha256js(utf8(nonce + pow))) < Number(parts[2])) return "pow_invalid";
  const fresh = await admin((q) => q.one("insert into pow_nonces (nonce) values ($1) on conflict do nothing returning nonce", [nonce]));
  return fresh ? "ok" : "nonce_reused";
}

// ---------- live QR ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(b: Buffer) {
  let bits = 0, val = 0, out = "";
  for (const byte of b) {
    val = (val << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}
export const liveToken = (secret: Buffer, window: number) => base32(hmac(secret, String(window))).slice(0, 10);
export function liveTokenValid(secret: Buffer, t: string | undefined | null) {
  if (!t) return false;
  const w = Math.floor(Date.now() / 60000);
  return t === liveToken(secret, w) || t === liveToken(secret, w - 1);
}

// ---------- availability & odds ----------
export async function availablePrizes(q: Q, c: Row, tierCap = 3, lock = false): Promise<(Row & { available: boolean })[]> {
  const day = localDay();
  const prizes = await q.query(
    `select p.*, coalesce(pd.issued, 0) as issued_today from prizes p
     left join prize_daily pd on pd.prize_id = p.id and pd.day = $2
     where p.campaign_id = $1 and p.active order by p.sort, p.id ${lock ? "for update of p" : ""}`,
    [c.id, day],
  );
  const spent = (await q.one<{ spent_paise: number }>("select spent_paise from campaign_daily where campaign_id = $1 and day = $2", [c.id, day]))?.spent_paise ?? 0;
  return prizes.map((p) => {
    const out =
      (p.remaining !== null && p.remaining <= 0) ||
      (p.daily_cap !== null && p.issued_today >= p.daily_cap) ||
      (p.cost_paise > 0 && spent + p.cost_paise > c.daily_budget_paise) ||
      p.tier > tierCap;
    return { ...p, available: !out };
  });
}
export function layoutOf(prizes: Row[]) {
  const live = prizes.filter((p) => p.available && p.weight > 0);
  const total = live.reduce((a, p) => a + p.weight, 0) || 1;
  return live.map((p) => ({ prizeId: p.id as string, pct: Math.round((p.weight / total) * 10000) / 100 }));
}

function eligibilityWindow(c: Row): string | null {
  const now = new Date();
  if (c.status === "ended" || new Date(c.ends_at) < now) return "ended";
  if (c.status === "paused" || c.status === "draft") return "paused";
  if (new Date(c.starts_at) > now) return "closed_hours";
  const m = localParts(now).minute;
  if (m < c.open_minute || m >= c.close_minute) return "closed_hours";
  return null;
}

// ---------- optional geofence: the browser location is checked against the shop and never stored ----------
export type Geo = { lat: number; lng: number; acc?: number };
function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** null: this campaign has no geofence. true or false: the phone is inside or outside it. A phone's own accuracy, up to 60 m, is forgiven. */
function geoCheck(c: Row, shop: Row, geo?: Geo): boolean | null {
  if (!c.geofence_m || shop.lat == null || shop.lng == null) return null;
  if (!geo) return false;
  return metresBetween({ lat: Number(shop.lat), lng: Number(shop.lng) }, geo) <= c.geofence_m + Math.min(60, Math.max(0, geo.acc ?? 0));
}

async function bonusBucket(q: Q, c: Row, deviceId: string, giftToken?: string, comebackToken?: string, lqt?: string, geoOk: boolean | null = null) {
  if (comebackToken) {
    const cb = await q.one(
      "select ct.* from comeback_tokens ct where ct.token_hash = $1 and ct.shop_id = $2 and ct.used_play_id is null and ct.expires_at > now()",
      [sha256(comebackToken), c.shop_id],
    );
    if (cb) return { bucket: "cb:" + cb.id, cb };
  }
  if (giftToken) {
    const g = await q.one(
      "select * from gift_slips where token_hash = $1 and shop_id = $2 and saved_by_device = $3 and used_play_id is null and expires_at > now()",
      [sha256(giftToken), c.shop_id, deviceId],
    );
    if (g) {
      const today = localDay();
      // a slip turns into a play only at the shop: a valid Live QR, or inside the geofence, or else a later day's poster scan
      const gate = c.live_qr_required ? liveTokenValid(c.live_secret, lqt) : geoOk !== null ? geoOk : localDay(new Date(g.created_at)) < today || liveTokenValid(c.live_secret, lqt);
      if (gate) return { bucket: "gift:" + g.id, gift: g };
    }
  }
  return null;
}

// ---------- /ready ----------
export async function ready(slug: string, deviceId: string, ip: string, input: { lqt?: string; giftToken?: string; comebackToken?: string }) {
  const shop = await shopBySlug(slug);
  if (!shop) throw new HttpError(404, "not_found", "Yeh dukaan nahi mili.", "This shop was not found.");
  const r = await takeToken(`ready:${subnetKey(ip)}`, 30, 0.5);
  return withShop(shop.id, async (q) => {
    const c = await currentCampaign(q, shop.id);
    const day = localDay();
    await q.query("insert into visits (shop_id, device_id, day) values ($1,$2,$3) on conflict do nothing", [shop.id, deviceId, day]);
    const visitN = Number((await q.one("select count(*)::int as n from visits where shop_id = $1 and device_id = $2", [shop.id, deviceId]))!.n);
    if (!c) return { eligible: false, reason: "ended", visitN, campaign: null, prizes: [], challenge: null };
    await q.query("insert into events (shop_id, campaign_id, device_id, kind) values ($1,$2,$3,'open')", [shop.id, c.id, deviceId]);
    const prizes = await availablePrizes(q, c);
    const layout = layoutOf(prizes);
    const pub = prizes.map((p) => ({
      id: p.id, label_hi: p.label_hi, label_en: p.label_en, kind: p.kind, tier: p.tier,
      remaining: p.remaining, total: p.total_stock, pct: layout.find((l) => l.prizeId === p.id)?.pct ?? 0,
    }));
    const campaign = { id: c.id, game: c.strict_skill ? "toss" : c.game, title_hi: c.title_hi, title_en: c.title_en, period: c.play_period, open_minute: c.open_minute, close_minute: c.close_minute, live_qr_required: c.live_qr_required, geofence_m: shop.lat != null && shop.lng != null ? ((c.geofence_m as number | null) ?? null) : null };
    const base = { visitN, campaign, prizes: pub, layout };
    let reason = eligibilityWindow(c);
    if (r < 0) reason = reason ?? "rate_limited";
    // the location is asked for only when the customer presses Khelo, so /ready treats the geofence as passed for now
    const fenced = geoCheck(c, shop, undefined) !== null;
    const bonus = await bonusBucket(q, c, deviceId, input.giftToken, input.comebackToken, input.lqt, fenced ? true : null);
    if (!reason && c.live_qr_required && !liveTokenValid(c.live_secret, input.lqt) && !bonus?.cb) reason = "live_qr_required";
    let nextAt: string | undefined;
    if (!reason && !bonus) {
      const played = await q.one("select id from plays where campaign_id = $1 and device_id = $2 and period_bucket = $3", [c.id, deviceId, periodBucket(c.play_period)]);
      if (played) {
        reason = "already_played";
        nextAt = nextPlayAt(c.play_period, new Date(c.ends_at));
      }
    }
    const bits = await powBits(ip, c.id);
    if (bits === null && !reason) {
      reason = "rate_limited";
      await logAbuse(shop.id, c.id, "subnet_velocity", deviceId, ip);
    }
    const phase = (parseInt(sha256(deviceId + c.id + day).toString("hex").slice(0, 6), 16) / 0xffffff) * Math.PI * 2;
    return {
      eligible: !reason,
      reason: reason ?? undefined,
      nextPlayAt: nextAt,
      bonus: bonus ? (bonus.cb ? "comeback" : "gift") : undefined,
      ...base,
      challenge: reason ? null : makeChallenge(bits ?? 20),
      tossSeed: phase,
    };
  });
}

// ---------- /play ----------
export type PlayInput = { idempotencyKey: string; nonce: string; pow: string; lqt?: string; giftToken?: string; comebackToken?: string; toss?: { throws: Throw[] }; geo?: Geo };

function newCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CROCKFORD[randomInt(32)];
  return s + luhnChar(s);
}

export async function play(slug: string, deviceId: string, ip: string, input: PlayInput) {
  const shop = await shopBySlug(slug);
  if (!shop) throw new HttpError(404, "not_found", "Yeh dukaan nahi mili.", "This shop was not found.");

  // 1. idempotency: a repeated key gets the stored result back, byte for byte.
  const prior = await withShop(shop.id, (q) => storedResult(q, input.idempotencyKey));
  if (prior) return prior;

  const pow = await checkPow(input.nonce, input.pow);
  if (pow !== "ok") {
    await logAbuse(shop.id, null, pow, deviceId, ip);
    throw new HttpError(400, pow, "Dobara khelo, page refresh karke.", "Refresh the page and play again.");
  }

  return withShop(shop.id, async (q) => {
    const c = await q.one("select * from campaigns where id = (select id from campaigns where shop_id = $1 and status = 'live' and now() between starts_at and ends_at order by starts_at desc limit 1) for share", [shop.id]);
    if (!c) throw new HttpError(409, "ended", "Abhi koi khel nahi chal raha.", "No game is running right now.");
    const win = eligibilityWindow(c);
    if (win) throw new HttpError(409, win, "Abhi dukaan band hai.", "The shop is closed right now.");

    const geoOk = geoCheck(c, shop, input.geo);
    const bonus = await bonusBucket(q, c, deviceId, input.giftToken, input.comebackToken, input.lqt, geoOk);
    if (geoOk === false && !bonus?.cb) {
      await logAbuse(shop.id, c.id, "geofence", deviceId, ip, { hadLocation: !!input.geo });
      throw new HttpError(403, "geofence", "Yeh khel sirf dukaan par chalta hai. Dukaan ke paas aakar khelo.", "This game only works at the shop. Come closer and play.");
    }
    if (c.live_qr_required && !liveTokenValid(c.live_secret, input.lqt) && !bonus?.cb) {
      await logAbuse(shop.id, c.id, "live_qr_missing", deviceId, ip);
      throw new HttpError(403, "live_qr_required", "Counter wale phone ka QR scan karo.", "Scan the QR on the counter phone.");
    }
    const tokens = await takeToken(`play:${c.id}:${subnetKey(ip)}`, PLAY_CAP, PLAY_RATE);
    if (tokens < -6) {
      await logAbuse(shop.id, c.id, "subnet_velocity", deviceId, ip);
      throw new HttpError(429, "rate_limited", "Is network se bahut khel ho gaye. Thodi der baad aana.", "Too many plays from this network. Come back later.");
    }

    const bucket = bonus?.bucket ?? periodBucket(c.play_period);
    const customer = await q.one("select id from customers where shop_id = $1 and device_id = $2 and phone_hash is not null and deleted_at is null limit 1", [shop.id, deviceId]);
    const ins = await q.one(
      `insert into plays (shop_id, campaign_id, device_id, customer_id, period_bucket, idempotency_key, outcome, ip_hash)
       values ($1,$2,$3,$4,$5,$6,'lose',$7) on conflict do nothing returning id, created_at`,
      [shop.id, c.id, deviceId, customer?.id ?? null, bucket, input.idempotencyKey, ipHash(ip)],
    );
    if (!ins) {
      const again = await storedResult(q, input.idempotencyKey);
      if (again) return again;
      await logAbuse(shop.id, c.id, "already_played", deviceId, ip);
      throw new HttpError(409, "already_played", "Aaj khel liya. Kal phir aana.", "You have played today. Come back tomorrow.", { nextPlayAt: nextPlayAt(c.play_period, new Date(c.ends_at)) });
    }
    if (bonus?.cb) await q.query("update comeback_tokens set used_play_id = $1 where id = $2", [ins.id, bonus.cb.id]);
    if (bonus?.gift) await q.query("update gift_slips set used_play_id = $1 where id = $2", [ins.id, bonus.gift.id]);

    // 6. skill sets a tier ceiling; the server re-runs the simulation and ignores any client score.
    let hits: number | null = null;
    let tierCap = 3;
    if (c.game === "toss" || c.strict_skill) {
      const phase = (parseInt(sha256(deviceId + c.id + localDay()).toString("hex").slice(0, 6), 16) / 0xffffff) * Math.PI * 2;
      hits = tossHits(input.toss?.throws ?? [], phase);
      tierCap = tierCapFor(hits);
    }

    // 7-8. lock this campaign's prize rows, then draw with crypto randomness over the live weights.
    const all = await availablePrizes(q, c, tierCap, true);
    const candidates = all.filter((p) => p.available && p.weight > 0);
    const layout = layoutOf(await availablePrizes(q, c, 3));
    let chosen: Row | undefined;
    const total = candidates.reduce((a, p) => a + p.weight, 0);
    if (total > 0) {
      let r = randomInt(0, total);
      for (const p of candidates) {
        if (r < p.weight) {
          chosen = p;
          break;
        }
        r -= p.weight;
      }
    }
    // 9. decrement stock under the lock; the guard falls back to the consolation.
    if (chosen && chosen.remaining !== null) {
      const dec = await q.one("update prizes set remaining = remaining - 1 where id = $1 and remaining > 0 returning id", [chosen.id]);
      if (!dec) chosen = undefined;
    }
    if (!chosen) chosen = all.find((p) => p.kind === "consolation" || p.kind === "none");
    const day = localDay();
    const cost = chosen?.cost_paise ?? 0;
    if (chosen) {
      await q.query(
        `insert into prize_daily (shop_id, prize_id, day, issued) values ($1,$2,$3,1)
         on conflict (prize_id, day) do update set issued = prize_daily.issued + 1`,
        [shop.id, chosen.id, day],
      );
    }
    await q.query(
      `insert into campaign_daily (shop_id, campaign_id, day, spent_paise, plays) values ($1,$2,$3,$4,1)
       on conflict (campaign_id, day) do update set spent_paise = campaign_daily.spent_paise + $4, plays = campaign_daily.plays + 1`,
      [shop.id, c.id, day, cost],
    );
    await q.query("update plays set toss_hits = $2, prize_id = $3, layout = $4 where id = $1", [ins.id, hits, chosen?.id ?? null, JSON.stringify(layout)]);
    await q.query("insert into events (shop_id, campaign_id, device_id, kind) values ($1,$2,$3,'play')", [shop.id, c.id, deviceId]);
    await q.query("insert into visits (shop_id, device_id, day) values ($1,$2,$3) on conflict do nothing", [shop.id, deviceId, day]);

    // 11. mint, sign and store the coupon.
    if (chosen && chosen.kind !== "none") {
      const key = await q.one("select kv, private_key_enc from shop_keys where shop_id = $1 and retired_at is null order by kv desc limit 1", [shop.id]);
      const issued = new Date(ins.created_at);
      const expires = new Date(issued.getTime() + chosen.expiry_days * 86400000);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = newCode();
        const payload = { v: 1, s: shop.slug, c: c.id, p: ins.id, z: chosen.id, k: code, i: issued.toISOString(), e: expires.toISOString(), kv: key!.kv };
        const sig = signWith(key!.private_key_enc, canonical(payload));
        const done = await q.one(
          `insert into coupons (shop_id, campaign_id, play_id, prize_id, device_id, customer_id, code, payload, sig, kv, cost_paise, issued_at, expires_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) on conflict (shop_id, code) do nothing returning id`,
          [shop.id, c.id, ins.id, chosen.id, deviceId, customer?.id ?? null, code, payload, sig, key!.kv, cost, issued, expires],
        );
        if (done) break;
      }
      await q.query("update plays set outcome = 'win' where id = $1", [ins.id]);
      await q.query("insert into events (shop_id, campaign_id, device_id, kind, paise) values ($1,$2,$3,'win',$4)", [shop.id, c.id, deviceId, cost]);
    }
    const out = await storedResult(q, input.idempotencyKey);
    return out!;
  });
}

/** Rebuilds the /play response from stored rows only, so a retry is byte-identical. */
async function storedResult(q: Q, key: string, layoutOverride?: { prizeId: string; pct: number }[]) {
  const p = await q.one(
    `select pl.id, pl.layout, pl.outcome, pl.toss_hits, pl.campaign_id, pr.id as prize_id, pr.label_hi, pr.label_en, pr.kind, pr.value, pr.min_bill_paise,
            co.id as coupon_id, co.payload, encode(co.sig, 'base64') as sig
     from plays pl left join prizes pr on pr.id = pl.prize_id left join coupons co on co.play_id = pl.id
     where pl.idempotency_key = $1`,
    [key],
  );
  if (!p) return null;
  let layout = (p.layout as { prizeId: string; pct: number }[] | null) ?? layoutOverride;
  if (!layout) {
    const c = await q.one("select * from campaigns where id = $1", [p.campaign_id]);
    layout = layoutOf(await availablePrizes(q, c!, 3));
    if (p.prize_id && !layout.find((l) => l.prizeId === p.prize_id)) layout = [...layout, { prizeId: p.prize_id, pct: 0 }];
  }
  return {
    playId: p.id as string,
    couponId: (p.coupon_id as string) ?? null,
    payload: p.payload ?? null,
    sig: (p.sig as string) ?? null,
    prize: p.prize_id ? { id: p.prize_id, label_hi: p.label_hi, label_en: p.label_en, kind: p.kind, value: p.value, minBill: p.min_bill_paise } : null,
    layout,
    tossHits: p.toss_hits,
    outcome: p.coupon_id && p.kind !== "consolation" ? "win" : "lose",
  };
}
