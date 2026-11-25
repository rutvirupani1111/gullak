import { admin } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import Lifafa from "@/components/customer/Lifafa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shagun ka lifafa: Gullak" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = /^[A-Za-z0-9_-]{16,40}$/.test(token);
  const g = ok
    ? await admin((q) =>
        q.one(
          `select s.slug, s.name, s.name_local, s.address, s.city, s.palette, s.initial, g.expires_at, (g.used_play_id is not null) used
           from gift_slips g join shops s on s.id = g.shop_id where g.token_hash = $1`,
          [sha256(token)],
        ),
      )
    : null;
  const state = !g ? "missing" : g.used || new Date(g.expires_at) < new Date() ? "used" : "fresh";
  return <Lifafa token={token} state={state} shop={g ? JSON.parse(JSON.stringify(g)) : null} />;
}
