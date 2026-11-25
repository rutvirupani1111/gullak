import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { admin, withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";
import { scryptHash } from "@/lib/crypto";
import { pinLookup } from "@/lib/server/shop";

const S = z.object({ pin: z.string().regex(/^[0-9]{4}$/).optional(), active: z.boolean().optional() });
export const PATCH = route<{ params: Promise<{ sid: string }> }>(async (req, { params }) => {
  const { sid } = await params;
  const b = await body(req, S);
  const row = await admin((q) => q.one("select shop_id from staff where id = $1", [sid]));
  if (!row) return fail(404, "not_found", "Nahi mila.", "Not found.");
  const shop = await ownerShop(row.shop_id);
  const r = await withShop(shop.id, async (q) => {
    if (b.pin) {
      const clash = await q.one("select id from staff where shop_id = $1 and pin_lookup = $2 and id <> $3", [shop.id, pinLookup(shop.id, b.pin), sid]);
      if (clash) return null;
      await q.query("update staff set pin_hash = $2, pin_lookup = $3, failed_count = 0, locked_until = null where id = $1", [sid, scryptHash(b.pin), pinLookup(shop.id, b.pin)]);
      await q.query("delete from staff_sessions where staff_id = $1", [sid]);
    }
    if (b.active !== undefined) {
      await q.query("update staff set active = $2 where id = $1", [sid, b.active]);
      if (!b.active) await q.query("delete from staff_sessions where staff_id = $1", [sid]);
    }
    return q.one("select id, name, active, locked_until from staff where id = $1", [sid]);
  });
  if (!r) return fail(409, "pin_taken", "Yeh PIN kisi aur ka hai.", "Someone else has this PIN.");
  return ok(r);
});
