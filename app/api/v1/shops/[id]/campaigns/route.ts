import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";
import { createStarterCampaign } from "@/lib/server/shop";
import { TEMPLATES } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const shop = await ownerShop((await params).id);
  return ok({
    campaigns: await withShop(shop.id, (q) => q.query("select id, name, title_hi, title_en, status, game, starts_at, ends_at, version from campaigns where shop_id = $1 order by created_at desc", [shop.id])),
  });
});

const S = z.object({
  name: z.string().trim().min(2).max(60),
  template: z.string().max(20).optional(),
  duplicateFrom: z.uuid().optional(),
  game: z.enum(["chakri", "patti", "toss"]).optional(),
  days: z.number().int().min(1).max(365).optional(),
});

// A new campaign is always a draft: from a festival template, a copy of the last one, or the starter shape.
export const POST = route<Ctx>(async (req, { params }) => {
  const shop = await ownerShop((await params).id);
  const b = await body(req, S);
  const r = await withShop(shop.id, async (q) => {
    if (b.duplicateFrom) {
      const src = await q.one("select * from campaigns where id = $1 and shop_id = $2", [b.duplicateFrom, shop.id]);
      if (!src) return null;
      const days = Math.max(1, Math.round((new Date(src.ends_at).getTime() - new Date(src.starts_at).getTime()) / 86400000));
      const c = await q.one<{ id: string }>(
        `insert into campaigns (shop_id, name, title_hi, title_en, status, game, starts_at, ends_at, open_minute, close_minute, play_period, daily_budget_paise, live_qr_required, strict_skill, geofence_m, sound)
         values ($1,$2,$3,$4,'draft',$5, now(), now() + make_interval(days => $6), $7,$8,$9,$10,$11,$12,$13,$14) returning id`,
        [shop.id, b.name, src.title_hi, src.title_en, src.game, days, src.open_minute, src.close_minute, src.play_period, src.daily_budget_paise, src.live_qr_required, src.strict_skill, src.geofence_m, src.sound],
      );
      await q.query(
        `insert into prizes (shop_id, campaign_id, label_hi, label_en, kind, value, cost_paise, weight, tier, total_stock, remaining, daily_cap, expiry_days, min_bill_paise, sort)
         select shop_id, $2, label_hi, label_en, kind, value, cost_paise, weight, tier, total_stock, total_stock, daily_cap, expiry_days, min_bill_paise, sort
         from prizes where campaign_id = $1 and active`,
        [src.id, c!.id],
      );
      return c;
    }
    const t = TEMPLATES.find((x) => x.key === b.template) ?? TEMPLATES[0];
    return createStarterCampaign(q, shop.id, { name: b.name, status: "draft", game: b.game ?? t.game, days: b.days ?? t.days, title_hi: t.hi, title_en: t.en, prizes: t.prizes });
  });
  if (!r) return fail(404, "not_found", "Pichhla khel nahi mila.", "The campaign to copy was not found.");
  return ok({ id: r.id }, 201);
});
