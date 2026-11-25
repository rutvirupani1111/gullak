import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { withShop } from "@/lib/db";
import { campaignForOwner } from "@/lib/server/owner";

const S = z.object({
  name: z.string().trim().min(2).max(60).optional(), title_hi: z.string().trim().max(60).optional(), title_en: z.string().trim().max(60).optional(),
  game: z.enum(["chakri", "patti", "toss"]).optional(), open_minute: z.number().int().min(0).max(1439).optional(), close_minute: z.number().int().min(1).max(1440).optional(),
  play_period: z.enum(["day", "week", "campaign"]).optional(), daily_budget_paise: z.number().int().min(0).max(100000000).optional(),
  live_qr_required: z.boolean().optional(), strict_skill: z.boolean().optional(),
  geofence_m: z.number().int().min(50).max(2000).nullable().optional(),
  // "the shop is where I am standing": sets the shop's location for the geofence in the same request
  here: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});
export const PATCH = route<{ params: Promise<{ cid: string }> }>(async (req, { params }) => {
  const { c, shop } = await campaignForOwner((await params).cid);
  const { here, ...b } = await body(req, S);
  if (here) await withShop(shop.id, (q) => q.query("update shops set lat = $2, lng = $3 where id = $1", [shop.id, here.lat, here.lng]));
  const ifMatch = Number(req.headers.get("if-match") ?? c.version);
  const keys = Object.keys(b) as (keyof typeof b)[];
  if (!keys.length) return ok({ version: c.version });
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(", ");
  const r = await withShop(shop.id, (q) =>
    q.one(`update campaigns set ${sets}, version = version + 1, updated_at = now() where id = $1 and version = $2 returning version`, [c.id, ifMatch, ...keys.map((k) => b[k])]),
  );
  if (!r) return fail(409, "version_conflict", "Kisi aur ne badla. Dobara dekho.", "Someone else changed this. Have a look again.", { version: c.version });
  return ok(r);
});
