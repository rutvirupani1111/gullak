import "server-only";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { admin, HttpError, withShop } from "./db";
import { appHmac, sha256, token } from "./crypto";

const secure = process.env.NODE_ENV === "production";
const P = secure ? "__Host-" : "";
export const C_OWNER = P + "gk_o";
export const C_STAFF = P + "gk_s";
export const C_DEVICE = P + "gk_d";

const opts = (maxAge: number) => ({ httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge });

// ---------- device (customers have no account) ----------
export function signDevice(id: string) {
  return `v1.${id}.${appHmac("dev:" + id).toString("base64url").slice(0, 32)}`;
}
export function readDeviceToken(v: string | undefined | null): string | null {
  if (!v) return null;
  const [ver, id, mac] = v.split(".");
  if (ver !== "v1" || !id || !mac) return null;
  return signDevice(id) === v ? id : null;
}

/** Returns this browser's device id, creating the row and cookie when absent. */
export async function device(create = true): Promise<string | null> {
  const jar = await cookies();
  const h = await headers();
  let id = readDeviceToken(jar.get(C_DEVICE)?.value) || readDeviceToken(h.get("x-gullak-device"));
  if (id) {
    const exists = await admin((q) => q.one<{ id: string; merged_into: string | null }>("update devices set last_seen = now() where id = $1 returning id, merged_into", [id]));
    if (exists) {
      id = exists.merged_into || exists.id;
      jar.set(C_DEVICE, signDevice(id), opts(400 * 86400));
      return id;
    }
  }
  if (!create) return null;
  const nid = randomUUID();
  await admin((q) => q.query("insert into devices (id) values ($1)", [nid]));
  jar.set(C_DEVICE, signDevice(nid), opts(400 * 86400));
  return nid;
}

/** Read-only device lookup for server components, which may not set cookies. Follows a transfer merge. */
export async function deviceRO(): Promise<string | null> {
  const id = readDeviceToken((await cookies()).get(C_DEVICE)?.value);
  if (!id) return null;
  const r = await admin((q) => q.one<{ id: string }>("select coalesce(merged_into, id) as id from devices where id = $1", [id]));
  return r?.id ?? null;
}

// ---------- owners ----------
export async function startOwnerSession(ownerId: string) {
  const t = token();
  await admin((q) => q.query("insert into owner_sessions (owner_id, token_hash, expires_at) values ($1, $2, now() + interval '30 days')", [ownerId, sha256(t)]));
  (await cookies()).set(C_OWNER, t, opts(30 * 86400));
}

export async function owner(): Promise<{ id: string; name: string; demo_shop?: string } | null> {
  const jar = await cookies();
  const t = jar.get(C_OWNER)?.value;
  if (!t) return null;
  return admin(async (q) => {
    const r = await q.one<{ id: string; name: string }>(
      `update owner_sessions s set expires_at = now() + interval '30 days' from owners o
       where s.token_hash = $1 and s.expires_at > now() and o.id = s.owner_id returning o.id, o.name`,
      [sha256(t)],
    );
    return r ?? null;
  });
}

export async function requireOwner() {
  const o = await owner();
  if (!o) throw new HttpError(401, "signin", "Pehle login karo.", "Please sign in first.");
  return o;
}

/** Resolves a shop the signed-in owner (or this demo visitor) controls. Anything else is a 404. */
export async function ownerShop(shopId: string) {
  const jar = await cookies();
  const demo = jar.get("gk_demo")?.value;
  const o = await owner();
  const shop = await admin((q) =>
    q.one<{ id: string; slug: string; owner_id: string | null; is_demo: boolean }>(
      "select id, slug, owner_id, is_demo from shops where id::text = $1 or slug = $1",
      [shopId],
    ),
  );
  if (!shop) throw new HttpError(404, "not_found", "Dukaan nahi mili.", "Shop not found.");
  const mine = (o && shop.owner_id === o.id) || (shop.is_demo && demo && demo === appHmac("demo:" + shop.id).toString("base64url"));
  if (!mine) throw new HttpError(404, "not_found", "Dukaan nahi mili.", "Shop not found.");
  return { ...shop, ownerId: o?.id ?? null };
}

export async function setDemoCookie(shopId: string) {
  (await cookies()).set("gk_demo", appHmac("demo:" + shopId).toString("base64url"), opts(86400));
}

// ---------- staff ----------
export async function startStaffSession(staffId: string, shopId: string) {
  const t = token();
  await withShop(shopId, (q) =>
    q.query("insert into staff_sessions (staff_id, shop_id, token_hash, expires_at) values ($1, $2, $3, now() + interval '12 hours')", [staffId, shopId, sha256(t)]),
  );
  (await cookies()).set(C_STAFF, t, opts(12 * 3600));
}

export async function staff(): Promise<{ id: string; name: string; shop_id: string; slug: string; shop_name: string } | null> {
  const t = (await cookies()).get(C_STAFF)?.value;
  if (!t) return null;
  const r = await admin((q) =>
    q.one<{ id: string; name: string; shop_id: string; slug: string; shop_name: string }>(
      `select st.id, st.name, st.shop_id, sh.slug, sh.name as shop_name from staff_sessions ss
       join staff st on st.id = ss.staff_id join shops sh on sh.id = ss.shop_id
       where ss.token_hash = $1 and ss.expires_at > now() and st.active`,
      [sha256(t)],
    ),
  );
  return r ?? null;
}
export async function requireStaff() {
  const s = await staff();
  if (!s) throw new HttpError(401, "signin", "PIN dobara daalo.", "Enter the PIN again.");
  return s;
}
