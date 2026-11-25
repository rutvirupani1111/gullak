import { z } from "zod";
import { route, body } from "@/lib/http";
import { withShop } from "@/lib/db";
import { device } from "@/lib/session";
import { shopBySlug, currentCampaign } from "@/lib/server/game";

const S = z.object({ src: z.enum(["poster", "live", "gift", "comeback", "direct"]).default("direct"), lqt: z.string().max(20).optional() });
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const { slug } = await params;
  const b = await body(req, S).catch(() => ({ src: "direct" as const }));
  const shop = await shopBySlug(slug);
  if (!shop) return new Response(null, { status: 204 });
  const dev = await device(true);
  await withShop(shop.id, async (q) => {
    const c = await currentCampaign(q, shop.id);
    await q.query("insert into events (shop_id, campaign_id, device_id, kind, src) values ($1,$2,$3,'scan',$4)", [shop.id, c?.id ?? null, dev, b.src]);
  });
  return new Response(null, { status: 204 });
});
