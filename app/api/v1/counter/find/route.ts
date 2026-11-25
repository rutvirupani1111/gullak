import { route, ok, fail } from "@/lib/http";
import { withShop } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { phoneHash } from "@/lib/crypto";

// A lost phone: staff find this shop's live coupons by the customer's number and check the person face to face.
export const GET = route(async (req) => {
  const st = await requireStaff();
  const raw = (new URL(req.url).searchParams.get("phone") ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9][0-9]{9}$/.test(raw)) return fail(400, "bad_phone", "10 ank ka mobile number daalo.", "Enter a 10 digit mobile number.");
  const rows = await withShop(st.shop_id, (q) =>
    q.query(
      `select co.code, co.expires_at, p.label_hi, p.label_en from customers cu
       join coupons co on co.shop_id = cu.shop_id and (co.customer_id = cu.id or co.device_id = cu.device_id)
       join prizes p on p.id = co.prize_id
       where cu.shop_id = $1 and cu.phone_hash = $2 and cu.deleted_at is null and co.status = 'issued' and co.expires_at > now()
       order by co.expires_at limit 20`,
      [st.shop_id, phoneHash("+91" + raw)],
    ),
  );
  return ok({ coupons: rows });
});
