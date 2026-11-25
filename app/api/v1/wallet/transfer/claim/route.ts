import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { admin } from "@/lib/db";
import { device } from "@/lib/session";
import { sha256 } from "@/lib/crypto";

const S = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{16,40}$/) });

// Merges the old phone's gullak into this one. The token works once, within 10 minutes.
export const POST = route(async (req) => {
  const { token } = await body(req, S);
  const dev = (await device(true))!;
  const r = await admin(async (q) => {
    const t = await q.one("update device_transfers set claimed_by = $2 where token_hash = $1 and claimed_by is null and expires_at > now() returning from_device", [sha256(token), dev]);
    if (!t) return "gone";
    const old = t.from_device as string;
    if (old === dev) return "same";
    const moved = await q.query("update coupons set device_id = $2 where device_id = $1 returning id", [old, dev]);
    await q.query("update gift_slips set saved_by_device = $2 where saved_by_device = $1", [old, dev]);
    await q.query("update customers set device_id = $2 where device_id = $1", [old, dev]);
    await q.query("insert into visits (shop_id, device_id, day, first_at) select shop_id, $2, day, first_at from visits where device_id = $1 on conflict do nothing", [old, dev]);
    // a play already made this period on either phone still counts: plays move unless that would double a period
    await q.query(
      `update plays p set device_id = $2 where p.device_id = $1
       and not exists (select 1 from plays x where x.device_id = $2 and x.campaign_id = p.campaign_id and x.period_bucket = p.period_bucket)`,
      [old, dev],
    );
    await q.query("update devices set merged_into = $2 where id = $1 or merged_into = $1", [old, dev]);
    return moved.length;
  });
  if (r === "gone") return fail(410, "transfer_gone", "Yeh QR purana ho gaya ya pehle hi istemaal ho chuka. Purane phone par naya QR banao.", "This QR has expired or was already used. Make a new one on the old phone.");
  if (r === "same") return fail(409, "same_device", "Yeh wahi phone hai. Naye phone se scan karo.", "This is the same phone. Scan it from the new phone.");
  return ok({ moved: r });
});
