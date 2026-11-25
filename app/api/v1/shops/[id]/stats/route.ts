import { route, ok } from "@/lib/http";
import { ownerShop } from "@/lib/session";
import { stats } from "@/lib/server/stats";

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const shop = await ownerShop((await params).id);
  const u = new URL(req.url).searchParams;
  const to = u.get("to") ?? new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const from = u.get("from") ?? new Date(Date.now() + 330 * 60000 - 29 * 86400000).toISOString().slice(0, 10);
  return ok(await stats(shop.id, from, to, u.get("campaign")));
});
