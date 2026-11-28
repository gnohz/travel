export function serviceWorkerSource({ base, version, files }) {
  return `const BASE = ${JSON.stringify(base)};
const CACHE = 'sedona-2026-' + ${JSON.stringify(version)};
const REQUIRED = ${JSON.stringify(files)};
function downloadResponse(response, url) {
  if (url.pathname !== BASE + 'sedona-2026-guide.pdf' || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', 'attachment; filename="Sedona-2026-guide.pdf"');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      // A new worker must not precache an older HTML shell from the HTTP cache.
      await cache.addAll(REQUIRED.map(path => new Request(new URL(path, self.location.origin), { cache: 'reload' })));
      const entry = await cache.match(BASE + 'index.html');
      const html = entry ? await entry.text() : '';
      const expected = new Set(REQUIRED.map(path => new URL(path, self.location.origin).href));
      for (const match of html.matchAll(/(?:src|href)=["']([^"']+[.](?:js|css))["']/g)) {
        const asset = new URL(match[1], self.location.origin + BASE).href;
        if (!expected.has(asset) || !await cache.match(asset)) throw new Error('App shell assets do not match this version');
      }
    }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('sedona-2026-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (event.data?.type === 'CACHE_STATUS') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const ready = (await Promise.all(REQUIRED.map(url => cache.match(url)))).every(Boolean);
      event.ports[0]?.postMessage({ ready, version: CACHE });
    })());
  }
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname === BASE + 'sw.js') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (url.pathname === BASE + 'data/travel.json') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Network error');
        await cache.put(request, response.clone());
        return response;
      } catch { return await cache.match(request) || new Response('{}', { status: 503 }); }
      finally { clearTimeout(timeout); }
    }
    if (request.mode === 'navigate' && (url.pathname === BASE || url.pathname === BASE + 'index.html')) {
      return await cache.match(BASE + 'index.html') || await cache.match(BASE + 'offline.html') || fetch(request);
    }
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return downloadResponse(cached, url);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return downloadResponse(response, url);
    } catch { return new Response('Offline resource unavailable', { status: 503 }); }
  })());
});\n`;
}
