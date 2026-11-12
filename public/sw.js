const CACHE = 'lift-log-v2';
const SCOPE = new URL('./', self.location).href;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const html = await (await fetch(SCOPE, { cache: 'reload' })).text();
    const urls = new Set([SCOPE, SCOPE + 'manifest.webmanifest',
      SCOPE + 'icons/icon-192.png', SCOPE + 'icons/icon-512.png', SCOPE + 'icons/apple-touch-icon.png']);
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) urls.add(new URL(m[1], SCOPE).href);
    await Promise.all([...urls].map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      // Network first for the page, so a new deploy loads at once.
      const r = await fetch(req).catch(() => null);
      if (r && r.ok) { cache.put(SCOPE, r.clone()); return r; }
      return (await cache.match(SCOPE)) || Response.error();
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') return (await cache.match(SCOPE)) || Response.error();
    return Response.error();
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const action = e.action || 'open';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: 'll-action', action });
    if (all[0]) await all[0].focus().catch(() => {});
    else await self.clients.openWindow(SCOPE);
  })());
});
