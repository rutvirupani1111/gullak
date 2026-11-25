import { z } from "zod";
import { route, body, ok } from "@/lib/http";
import { admin } from "@/lib/db";
import { device } from "@/lib/session";

const S = z.object({ shopSlug: z.string().max(40).optional() });
export const POST = route(async (req) => {
  const b = await body(req, S);
  const dev = await device(false);
  if (!dev) return ok({ removed: 0 });
  const n = await admin((q) =>
    q.query(
      `update customers set phone_enc = null, phone_hash = null, first_name = null, wa_opt_in = false, deleted_at = now()
       where device_id = $1 and deleted_at is null and ($2::text is null or shop_id = (select id from shops where slug = $2)) returning id`,
      [dev, b.shopSlug ?? null],
    ),
  );
  return ok({ removed: n.length });
});
