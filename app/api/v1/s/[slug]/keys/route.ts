import { route, ok, fail } from "@/lib/http";
import { admin } from "@/lib/db";

// Every public key a shop has signed with. A coupon names its key by kv.
export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  const rows = await admin((q) =>
    q.query(`select k.kv, encode(k.public_key, 'base64') as "publicKey", k.retired_at as "retiredAt" from shop_keys k join shops s on s.id = k.shop_id where s.slug = $1 order by k.kv`, [slug]),
  );
  if (!rows.length) return fail(404, "not_found", "Yeh dukaan nahi mili.", "This shop was not found.");
  return ok({ keys: rows }, 200, { headers: { "cache-control": "public, max-age=300" } });
});
