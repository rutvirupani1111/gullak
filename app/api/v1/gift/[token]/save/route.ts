import { route, ok, fail } from "@/lib/http";
import { admin } from "@/lib/db";
import { device } from "@/lib/session";
import { sha256 } from "@/lib/crypto";

// Gullak mein rakho: the friend's device claims the slip. It becomes a play only at the shop.
export const POST = route<{ params: Promise<{ token: string }> }>(async (_req, { params }) => {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return fail(404, "not_found", "Yeh lifafa nahi mila.", "This gift slip was not found.");
  const dev = (await device(true))!;
  const r = await admin(async (q) => {
    const g = await q.one("select g.id, g.from_device, g.saved_by_device, g.used_play_id, g.expires_at, s.slug from gift_slips g join shops s on s.id = g.shop_id where g.token_hash = $1", [sha256(token)]);
    if (!g) return { e: "not_found" } as const;
    if (new Date(g.expires_at) < new Date() || g.used_play_id) return { e: "used" } as const;
    if (g.from_device === dev) return { e: "own" } as const;
    if (g.saved_by_device && g.saved_by_device !== dev) return { e: "taken" } as const;
    await q.query("update gift_slips set saved_by_device = $2 where id = $1 and (saved_by_device is null or saved_by_device = $2)", [g.id, dev]);
    return { slug: g.slug as string };
  });
  const e = (r as { e?: string }).e;
  if (e) {
    const m: Record<string, [number, string, string]> = {
      not_found: [404, "Yeh lifafa nahi mila.", "This gift slip was not found."],
      used: [410, "Yeh lifafa istemaal ho chuka ya purana ho gaya.", "This slip has been used or has expired."],
      own: [409, "Apna hi lifafa nahi rakh sakte. Dost ko bhejo.", "You cannot keep your own slip. Send it to a friend."],
      taken: [409, "Yeh lifafa kisi aur ki gullak mein hai.", "Someone else has already kept this slip."],
    };
    const [st, hi, en] = m[e];
    return fail(st, e, hi, en);
  }
  return ok({ slug: (r as { slug: string }).slug });
});
