import { z } from "zod";
import { route, body, ok, fail } from "@/lib/http";
import { withShop } from "@/lib/db";
import { ownerShop } from "@/lib/session";
import { scryptHash } from "@/lib/crypto";
import { pinLookup } from "@/lib/server/shop";

const S = z.object({ name: z.string().trim().min(1).max(30), pin: z.string().regex(/^[0-9]{4}$/) });
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const shop = await ownerShop((await params).id);
  const b = await body(req, S);
  const r = await withShop(shop.id, (q) =>
    q.one("insert into staff (shop_id, name, pin_hash, pin_lookup) values ($1,$2,$3,$4) on conflict (shop_id, pin_lookup) do nothing returning id, name, active", [shop.id, b.name, scryptHash(b.pin), pinLookup(shop.id, b.pin)]),
  );
  if (!r) return fail(409, "pin_taken", "Yeh PIN kisi aur ka hai. Doosra chuno.", "Someone else has this PIN. Pick another.");
  return ok(r, 201);
});
