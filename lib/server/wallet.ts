import "server-only";
import { admin } from "../db";
import { moharSvg } from "../art";

export type WalletCoupon = {
  id: string; code: string; status: string; issuedAt: string; expiresAt: string; label_hi: string; label_en: string; kind: string; minBill: number;
  shop: { slug: string; name: string; palette: string; initial: string; address: string }; mohar: string; redeemedAt: string | null;
};

/** The one cross-shop customer read: this device's coupons across every shop. */
export async function walletFor(deviceId: string): Promise<WalletCoupon[]> {
  const rows = await admin((q) =>
    q.query(
      `select co.id, co.code, co.status, co.issued_at, co.expires_at, encode(co.sig, 'base64') sig64, p.label_hi, p.label_en, p.kind, p.min_bill_paise,
              s.slug, s.name, s.palette, s.initial, s.address, r.created_at as redeemed_at
       from coupons co join prizes p on p.id = co.prize_id join shops s on s.id = co.shop_id
       left join redemptions r on r.coupon_id = co.id and r.undone_at is null
       where co.device_id = $1 order by co.status = 'issued' desc, co.expires_at asc limit 60`,
      [deviceId],
    ),
  );
  return rows.map((r) => ({
    id: r.id, code: r.code, status: r.status, issuedAt: r.issued_at, expiresAt: r.expires_at, label_hi: r.label_hi, label_en: r.label_en, kind: r.kind, minBill: r.min_bill_paise,
    shop: { slug: r.slug, name: r.name, palette: r.palette, initial: r.initial, address: r.address }, mohar: moharSvg(r.sig64, r.palette, r.initial), redeemedAt: r.redeemed_at,
  }));
}
