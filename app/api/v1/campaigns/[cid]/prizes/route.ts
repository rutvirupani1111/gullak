import { z } from "zod";
import { route, body, ok } from "@/lib/http";
import { withShop } from "@/lib/db";
import { campaignForOwner } from "@/lib/server/owner";

const S = z.object({ label_hi: z.string().trim().min(1).max(40), label_en: z.string().trim().min(1).max(40), kind: z.enum(["free_item", "flat_off", "pct_off"]), cost_paise: z.number().int().min(0).max(1000000), stock: z.number().int().min(1).max(100000), tier: z.number().int().min(1).max(3).default(1) });
export const POST = route<{ params: Promise<{ cid: string }> }>(async (req, { params }) => {
  const { c, shop } = await campaignForOwner((await params).cid);
  const b = await body(req, S);
  // a new jar starts at weight 0, so the odds never shift until the owner moves the wheel.
  const r = await withShop(shop.id, (q) =>
    q.one(
      `insert into prizes (shop_id, campaign_id, label_hi, label_en, kind, cost_paise, weight, tier, total_stock, remaining, sort)
       values ($1,$2,$3,$4,$5,$6,0,$7,$8,$8,(select coalesce(max(sort),0)+1 from prizes where campaign_id = $2)) returning *`,
      [shop.id, c.id, b.label_hi, b.label_en, b.kind, b.cost_paise, b.tier, b.stock],
    ),
  );
  return ok(r, 201);
});
