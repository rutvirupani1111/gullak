// Gullak service worker. It exists for one job: the customer's gullak opens with no network.
// - /_next/static (scripts, CSS, self-hosted fonts) is content-hashed, so it is served cache-first.
// - Customer pages (/w, /w/<coupon>, /s/<shop>, /g/<slip>) are network-first; the last good copy is the offline fallback.
// - /api/v1/wallet is network-first with the last answer kept, so the docked gullak's count survives a dead network.
// Nothing here ever decides a game or redeems a coupon: redemption is online only, at the counter.
const STATIC = "gk-static-v1";
const PAGES = "gk-pages-v1";
const KEEP = [STATIC, PAGES];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(PAGES).then((c) => c.add(new Request("/w", { credentials: "same-origin" })).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// pages hand over the static files they already loaded before this worker was in control
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "gk-keep" || !Array.isArray(d.urls)) return;
  e.waitUntil(
    caches.open(STATIC).then((c) =>
      Promise.all(
        d.urls.slice(0, 80).filter((u) => typeof u === "string" && u.startsWith(self.location.origin + "/_next/static/")).map((u) =>
          c.match(u).then((hit) => hit || fetch(u).then((r) => (r.ok ? c.put(u, r) : undefined)).catch(() => undefined)),
        ),
      ),
    ),
  );
});

const isCustomerPage = (p) => p === "/w" || p.startsWith("/w/") || p.startsWith("/s/") || p.startsWith("/g/");

function offlinePage() {
  const html = `<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#F5E9CF;color:#1C1210;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:16px}
a{display:inline-block;margin-top:12px;padding:12px 18px;border:2.5px solid #1C1210;background:#F4B400;color:#1C1210;font-weight:800;text-decoration:none;box-shadow:3px 4px 0 #1C1210}</style></head>
<body><div><p style="font-size:22px;font-weight:800;margin:0">Network nahi mila</p><p>Yeh panna abhi nahi khul sakta. Aapki gullak ke coupon phone mein hain.</p><p style="opacity:.75">No network. Your gullak's coupons are saved on this phone.</p><a href="/w">Meri gullak kholo</a></div></body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(STATIC).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })),
      ),
    );
    return;
  }

  if (url.pathname === "/api/v1/wallet") {
    e.respondWith(
      fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(PAGES).then((c) => c.put("/api/v1/wallet", copy)); } return r; })
        .catch(() => caches.match("/api/v1/wallet").then((hit) => hit || new Response('{"coupons":[]}', { headers: { "content-type": "application/json" } }))),
    );
    return;
  }

  if (req.mode === "navigate" && isCustomerPage(url.pathname)) {
    const key = url.pathname; // query strings (?src=poster, ?lqt=) do not change the cached shell
    e.respondWith(
      fetch(req).then((r) => {
        if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(PAGES).then((c) => c.put(key, copy)); }
        return r;
      }).catch(() =>
        caches.open(PAGES).then((c) => c.match(key).then((hit) => hit || (key.startsWith("/w/") ? c.match("/w") : undefined)).then((hit) => hit || offlinePage())),
      ),
    );
  }
});
