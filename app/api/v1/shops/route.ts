import { z } from "zod";
import { route, body, ok } from "@/lib/http";
import { admin } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { createShop, createStarterCampaign } from "@/lib/server/shop";

const S = z.object({
  name: z.string().trim().min(2).max(60), name_local: z.string().trim().max(60).optional(), address: z.string().trim().min(3).max(140), city: z.string().trim().min(2).max(40),
  language: z.enum(["hi", "en", "hinglish"]), palette: z.string().max(30), initial: z.string().trim().min(1).max(2),
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  keeper: z.object({ face: z.string().max(10), head: z.string().max(10), stache: z.string().max(10), specs: z.boolean(), prop: z.string().max(10) }),
});
export const POST = route(async (req) => {
  const b = await body(req, S);
  const o = await requireOwner();
  const shop = await admin(async (q) => {
    const s = await createShop(q, { ...b, ownerId: o.id });
    await createStarterCampaign(q, s.id);
    return s;
  });
  return ok(shop, 201);
});
export const GET = route(async (req) => {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const taken = await admin((q) => q.one("select 1 from shops where slug = $1", [slug]));
  return ok({ available: !taken && /^[a-z0-9-]{3,40}$/.test(slug) });
});
