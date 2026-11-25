// The phone's own copy of the gullak: IndexedDB "gullak", store "coupons", keyed by coupon id.
// A coupon is written here the moment the server's signed result arrives, before the coin animation
// lands, so a dropped connection after that point never loses a win. The wallet reads it offline.
import type { WalletCoupon } from "@/lib/server/wallet";

const DB = "gullak";
const STORE = "coupons";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | undefined): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const t = db.transaction(STORE, mode);
          const req: IDBRequest<T> | undefined = fn(t.objectStore(STORE));
          t.oncomplete = () => { resolve(req !== undefined ? (req.result as T) : null); db.close(); };
          t.onerror = () => { resolve(null); db.close(); };
          t.onabort = () => { resolve(null); db.close(); };
        } catch {
          resolve(null);
        }
      }),
  );
}

/** Every coupon this phone knows about, newest expiry last. Never throws; an empty list when storage is blocked. */
export async function idbCoupons(): Promise<WalletCoupon[]> {
  const all = await tx<WalletCoupon[]>("readonly", (s) => s.getAll() as IDBRequest<WalletCoupon[]>);
  const list = all ?? [];
  return list.sort((a, b) => Number(b.status === "issued") - Number(a.status === "issued") || new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
}

export async function idbPut(c: WalletCoupon) {
  await tx("readwrite", (s) => { s.put(c); return undefined; });
  mirror(await idbCoupons());
}

/** The server's list is the truth when we have it: replace the local copy with it. */
export async function idbReplace(list: WalletCoupon[]) {
  await tx("readwrite", (s) => {
    s.clear();
    for (const c of list) s.put(c);
    return undefined;
  });
  mirror(list);
}

/** A small localStorage mirror keeps the docked gullak's badge instant on first paint. */
function mirror(list: WalletCoupon[]) {
  try { localStorage.setItem("gk.coupons", JSON.stringify(list)); } catch {}
}

/** Keep the "Counter par dikhao" page of every live coupon in the page cache, so it opens with no network. */
export async function warmCouponPages(list: WalletCoupon[]) {
  try {
    if (typeof caches === "undefined") return;
    const cache = await caches.open("gk-pages-v1");
    const live = list.filter((c) => c.status === "issued" && new Date(c.expiresAt).getTime() > Date.now()).slice(0, 6);
    await Promise.all(live.map((c) => fetch(`/w/${c.id}`, { credentials: "same-origin" }).then((r) => (r.ok ? cache.put(`/w/${c.id}`, r) : undefined)).catch(() => undefined)));
  } catch {}
}
