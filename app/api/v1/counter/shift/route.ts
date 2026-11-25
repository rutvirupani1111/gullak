import { route, ok } from "@/lib/http";
import { requireStaff } from "@/lib/session";
import { shiftCount } from "@/lib/server/counter";

export const GET = route(async () => {
  const st = await requireStaff();
  return ok({ count: await shiftCount(st), name: st.name, shop: { slug: st.slug, name: st.shop_name } });
});
