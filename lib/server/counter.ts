import "server-only";
import { HttpError, withShop } from "../db";
import { isValidCode, normalise, parseQr } from "../code";
import { moharSvg } from "../art";
import { timeLabel } from "../time";

type Staff = { id: string; name: string; shop_id: string; slug: string; shop_name: string };

export async function lookup(st: Staff, b: { code?: string; qr?: string }) {
  let code = b.code ? normalise(b.code) : "";
  if (b.qr) {
    const p = parseQr(b.qr);
    if (!p) throw new HttpError(400, "bad_qr", "Yeh Gullak ka QR nahi hai.", "This is not a Gullak QR.");
    if (p.slug !== st.slug) {
      const other = await withShop(st.shop_id, async () => null);
      void other;
      return { state: "wrong_shop", otherSlug: p.slug };
    }
    code = p.code;
  }
  if (!isValidCode(code)) throw new HttpError(400, "bad_code", "Code galat lag raha hai. Dobara dekho.", "That code looks wrong. Check it again.");
  return withShop(st.shop_id, async (q) => {
    const c = await q.one(
      `select co.*, encode(co.sig, 'base64') as sig64, p.label_hi, p.label_en, p.kind, p.value, p.min_bill_paise, s.palette, s.initial, s.name as shop_name,
              (select count(distinct day)::int from visits v where v.shop_id = co.shop_id and v.device_id = co.device_id) as visit_n,
              r.id as redemption_id, r.created_at as redeemed_at, r.staff_name as redeemed_by
       from coupons co join prizes p on p.id = co.prize_id join shops s on s.id = co.shop_id
       left join redemptions r on r.coupon_id = co.id and r.undone_at is null
       where co.shop_id = $1 and co.code = $2`,
      [st.shop_id, code],
    );
    if (!c) return { state: "not_found", code };
    const state = c.status === "void" ? "void" : c.redemption_id ? "redeemed" : new Date(c.expires_at) < new Date() ? "expired" : "issued";
    return {
      state,
      coupon: { id: c.id, code: c.code, issuedAt: c.issued_at, expiresAt: c.expires_at },
      prize: { label_hi: c.label_hi, label_en: c.label_en, kind: c.kind, minBill: c.min_bill_paise },
      mohar: moharSvg(c.sig64, c.palette, c.initial),
      visitN: c.visit_n,
      redeemedAt: c.redeemed_at,
      redeemedAtLabel: c.redeemed_at ? timeLabel(c.redeemed_at) : null,
      redeemedBy: c.redeemed_by,
      redemptionId: c.redemption_id,
    };
  });
}

export async function redeem(st: Staff, couponId: string, key: string) {
  return withShop(st.shop_id, async (q) => {
    const prior = await q.one("select id, created_at, coupon_id from redemptions where idempotency_key = $1", [key]);
    if (prior) return { redemptionId: prior.id, redeemedAt: prior.created_at };
    const live = await q.one("select r.created_at, r.staff_name from redemptions r where r.coupon_id = $1 and r.undone_at is null", [couponId]);
    if (live) throw new HttpError(409, "already_redeemed", `Diya gaya ${timeLabel(live.created_at)}, ${live.staff_name ?? "staff"} ne.`, `Already given at ${timeLabel(live.created_at)} by ${live.staff_name ?? "staff"}.`, { at: live.created_at, by: live.staff_name });
    const upd = await q.one("update coupons set status = 'redeemed' where id = $1 and shop_id = $2 and status = 'issued' and expires_at > now() returning id, cost_paise, campaign_id, device_id", [couponId, st.shop_id]);
    if (!upd) {
      const c = await q.one("select status, expires_at from coupons where id = $1", [couponId]);
      if (!c) throw new HttpError(404, "not_found", "Coupon nahi mila.", "Coupon not found.");
      if (c.status === "void") throw new HttpError(409, "void", "Yeh coupon radd hai.", "This coupon is void.");
      throw new HttpError(409, "expired", "Yeh coupon khatam ho gaya.", "This coupon has expired.");
    }
    const r = await q.one(
      "insert into redemptions (shop_id, coupon_id, staff_id, staff_name, idempotency_key) values ($1,$2,$3,$4,$5) on conflict do nothing returning id, created_at",
      [st.shop_id, couponId, st.id, st.name, key],
    );
    if (!r) throw new HttpError(409, "already_redeemed", "Abhi abhi kisi aur ne thappa lagaya.", "Someone stamped this a moment ago.");
    await q.query("insert into events (shop_id, campaign_id, device_id, kind) values ($1,$2,$3,'redeem')", [st.shop_id, upd.campaign_id, upd.device_id]);
    return { redemptionId: r.id, redeemedAt: r.created_at };
  });
}

export async function undo(st: Staff, redemptionId: string) {
  return withShop(st.shop_id, async (q) => {
    const r = await q.one("select r.*, co.campaign_id, co.device_id, extract(epoch from now() - r.created_at) as age from redemptions r join coupons co on co.id = r.coupon_id where r.id = $1 and r.undone_at is null", [redemptionId]);
    if (!r) throw new HttpError(404, "not_found", "Yeh thappa nahi mila.", "Stamp not found.");
    if (r.staff_id !== st.id) throw new HttpError(403, "not_yours", "Sirf jisne lagaya woh wapas le sakta hai.", "Only the person who stamped it can undo.");
    if (Number(r.age) > 10) throw new HttpError(409, "undo_window_passed", "10 second nikal gaye. Malik se baat karo.", "The 10-second window has passed.");
    await q.query("update redemptions set undone_at = now(), undone_by = $2 where id = $1", [redemptionId, st.id]);
    await q.query("update coupons set status = 'issued' where id = $1", [r.coupon_id]);
    await q.query("insert into events (shop_id, campaign_id, device_id, kind) values ($1,$2,$3,'undo')", [st.shop_id, r.campaign_id, r.device_id]);
    return { ok: true };
  });
}

export async function shiftCount(st: Staff) {
  return withShop(st.shop_id, async (q) => {
    const r = await q.one<{ n: number }>("select count(*)::int n from redemptions where staff_id = $1 and undone_at is null and created_at > date_trunc('day', now() + interval '330 minutes') - interval '330 minutes'", [st.id]);
    return r?.n ?? 0;
  });
}
