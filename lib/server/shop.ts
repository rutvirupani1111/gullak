import "server-only";
import { randomBytes } from "node:crypto";
import { admin, HttpError, type Q } from "../db";
import { appHmac, encPhone, newShopKey, phoneHash, scryptHash } from "../crypto";

export const RESERVED = new Set(["admin", "api", "counter", "demo", "dukaan", "g", "s", "w", "login", "signup", "niyam", "gullak"]);
export const pinLookup = (shopId: string, pin: string) => appHmac("pin:" + shopId + ":" + pin);

export type Keeper = { face: string; head: string; stache: string; specs: boolean; prop: string };
export const DEFAULT_KEEPER: Keeper = { face: "round", head: "topi", stache: "handlebar", specs: false, prop: "kettle" };

export async function createShop(
  q: Q,
  s: { ownerId: string | null; slug: string; name: string; name_local?: string | null; address: string; city: string; language?: string; palette?: string; initial: string; keeper: Keeper; isDemo?: boolean },
) {
  if (RESERVED.has(s.slug)) throw new HttpError(409, "slug_taken", "Yeh naam pehle se liya hua hai.", "That web name is taken.");
  const shop = await q.one<{ id: string; slug: string }>(
    `insert into shops (owner_id, slug, name, name_local, address, city, language, palette, initial, keeper, is_demo, sandbox_expires_at, stats_watermark)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, case when $11 then now() + interval '24 hours' end, date_trunc('hour', now()) - interval '48 hours')
     on conflict (slug) do nothing returning id, slug`,
    [s.ownerId, s.slug, s.name, s.name_local ?? null, s.address, s.city, s.language ?? "hi", s.palette ?? "haldi-press-red", s.initial, s.keeper, !!s.isDemo],
  );
  if (!shop) throw new HttpError(409, "slug_taken", "Yeh web naam pehle se liya hua hai.", "That web name is taken.");
  const k = newShopKey();
  await q.query("insert into shop_keys (shop_id, kv, public_key, private_key_enc) values ($1, 1, $2, $3)", [shop.id, k.pub, k.privEnc]);
  return shop;
}

/** A starter campaign: draft chakri with a consolation tier that can never be deleted. */
export async function createStarterCampaign(q: Q, shopId: string, opts: { name?: string; status?: string; game?: string; startOffsetDays?: number; days?: number; title_hi?: string; title_en?: string; prizes?: P[] } = {}) {
  const c = await q.one<{ id: string }>(
    `insert into campaigns (shop_id, name, title_hi, title_en, status, game, starts_at, ends_at, open_minute, close_minute, daily_budget_paise)
     values ($1,$2,$3,$4,$5,$6, now() + make_interval(days => $7), now() + make_interval(days => $7 + $8), 0, 1440, 50000) returning id`,
    [shopId, opts.name ?? "Shaam ka khel", opts.title_hi ?? "Chai pe chakri", opts.title_en ?? "Spin with your chai", opts.status ?? "draft", opts.game ?? "chakri", opts.startOffsetDays ?? 0, opts.days ?? 30],
  );
  const prizes = opts.prizes ?? STARTER;
  let i = 0;
  for (const p of prizes) {
    await q.query(
      `insert into prizes (shop_id, campaign_id, label_hi, label_en, kind, value, cost_paise, weight, tier, total_stock, remaining, daily_cap, min_bill_paise, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13)`,
      [shopId, c!.id, p.hi, p.en, p.kind, p.value ?? 0, p.cost ?? 0, p.w, p.tier ?? 1, p.stock ?? null, p.cap ?? null, p.minBill ?? 0, i++],
    );
  }
  return c!;
}
type P = { hi: string; en: string; kind: string; w: number; cost?: number; value?: number; tier?: number; stock?: number | null; cap?: number | null; minBill?: number };
const STARTER: P[] = [
  { hi: "Agli baar ₹2 off", en: "₹2 off next time", kind: "consolation", w: 6000, cost: 200, value: 200 },
  { hi: "Muft cutting chai", en: "Free cutting chai", kind: "free_item", w: 2500, cost: 800, tier: 1, stock: 60, cap: 12 },
  { hi: "Muft bun maska", en: "Free bun maska", kind: "free_item", w: 1200, cost: 1500, tier: 2, stock: 25, cap: 5 },
  { hi: "Poora order 20% off", en: "20% off the whole order", kind: "pct_off", value: 20, w: 300, cost: 3000, tier: 3, stock: 6, cap: 1, minBill: 5000 },
];

/** Builds a complete demo shop: 3 campaigns, staff Ramesh (PIN 1234), 40 fictional regulars, 30 days of history. */
export async function buildDemo(slug: string, isSandbox: boolean) {
  return admin(async (q) => {
    const shop = await createShop(q, {
      ownerId: null, slug, name: "Sharma Ji Ki Tapri", name_local: "शर्मा जी की टपरी", address: "Shop 4, Chhappan Dukaan, New Palasia", city: "Indore",
      palette: "haldi-press-red", initial: "श", keeper: DEFAULT_KEEPER, isDemo: true,
    });
    if (!isSandbox) await q.query("update shops set sandbox_expires_at = null where id = $1", [shop.id]);
    const live = await createStarterCampaign(q, shop.id, { name: "Shaam ki chakri", status: "live", startOffsetDays: -20, days: 40 });
    await createStarterCampaign(q, shop.id, {
      name: "Lottery patti", status: "paused", game: "patti", startOffsetDays: -5, days: 25, title_hi: "Ghiso aur jeeto", title_en: "Scratch and win",
      prizes: [
        { hi: "Agli baar ₹3 off", en: "₹3 off next time", kind: "consolation", w: 7000, cost: 300, value: 300 },
        { hi: "Muft poha", en: "Free poha", kind: "free_item", w: 2400, cost: 2000, tier: 1, stock: 30, cap: 6 },
        { hi: "Muft jalebi 100g", en: "Free jalebi 100g", kind: "free_item", w: 600, cost: 3000, tier: 2, stock: 10, cap: 2 },
      ],
    });
    await createStarterCampaign(q, shop.id, {
      name: "Diwali gullak toss", status: "ended", game: "toss", startOffsetDays: -40, days: 12, title_hi: "Sikka gullak mein", title_en: "Coin in the gullak",
      prizes: [
        { hi: "₹5 off", en: "₹5 off", kind: "consolation", w: 7000, cost: 500, value: 500 },
        { hi: "Muft samosa", en: "Free samosa", kind: "free_item", w: 3000, cost: 1500, tier: 2, stock: 40 },
      ],
    });
    const pinHash = scryptHash("1234");
    await q.query("insert into staff (shop_id, name, pin_hash, pin_lookup) values ($1, 'Ramesh', $2, $3)", [shop.id, pinHash, pinLookup(shop.id, "1234")]);

    // 40 fictional regulars on reserved +91 90000 0xxxx numbers, each with a device and visit history.
    const names = ["Asha", "Bilal", "Chetan", "Divya", "Farhan", "Gita", "Harsh", "Imran", "Jaya", "Kunal", "Lata", "Manoj", "Nisha", "Omkar", "Pooja", "Qasim", "Ritu", "Sanjay", "Tara", "Uday"];
    for (let i = 0; i < 40; i++) {
      const phone = "+9190000" + String(i + 1).padStart(5, "0");
      const dev = await q.one<{ id: string }>("insert into devices default values returning id");
      const cust = await q.one<{ id: string }>(
        `insert into customers (shop_id, device_id, first_name, phone_enc, phone_hash, wa_opt_in, consent_version, consent_at, consent_lang, consent_source, created_at)
         values ($1,$2,$3,$4,$5,true,'demo-v1', now() - interval '25 days','hi','demo_seed', now() - interval '25 days') returning id`,
        [shop.id, dev!.id, i % 3 === 0 ? null : names[i % 20], encPhone(phone), phoneHash(phone)],
      );
      // regular i last came (i % 24) days ago and visited on a handful of earlier days.
      await q.query(
        `insert into visits (shop_id, device_id, day, first_at)
         select $1, $2, (now() - make_interval(days => d))::date, now() - make_interval(days => d)
         from generate_series($3::int, 29, $4::int) d on conflict do nothing`,
        [shop.id, dev!.id, i % 24, 2 + (i % 4)],
      );
      void cust;
    }
    // 30 days of rolled-up hourly history (before the watermark) plus raw events for the last 48 hours.
    await q.query(
      `insert into shop_hourly_stats (shop_id, campaign_id, hour, scans, opens, plays, wins, redemptions, new_devices, returning_devices, paise_given)
       select $1, $2, h, s, round(s * .82), p, round(p * .38), round(p * .38 * .6), round(p * .3), round(p * .7), round(p * .38) * 900
       from (select h, w, round(w * (14 + random() * 8))::int as s, round(w * (11 + random() * 6))::int as p
             from (select h, case when extract(hour from h at time zone 'Asia/Kolkata') between 17 and 21 then 1.0
                                  when extract(hour from h at time zone 'Asia/Kolkata') between 7 and 9 then .55
                                  when extract(hour from h at time zone 'Asia/Kolkata') between 10 and 16 then .18
                                  else 0 end as w
                   from generate_series(date_trunc('hour', now()) - interval '30 days', date_trunc('hour', now()) - interval '49 hours', interval '1 hour') h) a
             where w > 0) b`,
      [shop.id, live.id],
    );
    await q.query(
      `insert into events (shop_id, campaign_id, kind, paise, created_at)
       select $1, $2, k, case when k = 'win' then 900 else 0 end, t
       from generate_series(date_trunc('hour', now()) - interval '48 hours', now() - interval '5 minutes', interval '9 minutes') t
       cross join lateral (select unnest(array['scan','open','play','win','redeem']) k) kk
       where (extract(hour from t at time zone 'Asia/Kolkata') between 17 and 21 or extract(hour from t at time zone 'Asia/Kolkata') between 7 and 9)
         and random() < case k when 'scan' then .95 when 'open' then .8 when 'play' then .7 when 'win' then .28 else .17 end`,
      [shop.id, live.id],
    );
    return shop;
  });
}

export const randomSlugTail = () => randomBytes(4).toString("hex").slice(0, 6);
