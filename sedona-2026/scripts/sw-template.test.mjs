import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { serviceWorkerSource } from './sw-template.mjs';
const base = '/travel/sedona-2026/';
function environment() {
  let online = true; let contents = 'version one'; let failPath = ''; let skip = 0; let staleHttpContents;
  const fetched = [];
  const stores = new Map();
  const key = request => typeof request === 'string' ? new URL(request, 'https://example.org').href : request.url;
  const fetcher = async request => {
    fetched.push({ url: key(request), cache: request.cache });
    if (!online || key(request).endsWith(failPath || 'NO_FAILURE')) throw new Error('offline');
    if (key(request).endsWith('index.html') && request.cache !== 'reload' && staleHttpContents) return new Response(staleHttpContents);
    return key(request).endsWith('.pdf')
      ? new Response('%PDF-1.4\nactual PDF bytes', { headers: { 'Content-Type': 'application/pdf' } })
      : new Response(contents);
  };
  const caches = {
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return { addAll: async files => { for (const f of files) store.set(key(f), await fetcher(f)); }, match: async req => store.get(key(req))?.clone(), put: async (req, res) => { store.set(key(req), res); } };
    },
    keys: async () => [...stores.keys()], delete: async name => stores.delete(name),
  };
  function worker(version, extraFiles = []) {
    const events = {};
    const self = { location: { origin: 'https://example.org' }, clients: { claim: async () => {} }, skipWaiting: () => { skip++; }, addEventListener: (name, fn) => { events[name] = fn; } };
    const files = [base + 'index.html', base + 'data/travel.json', base + 'sedona-2026-guide.pdf', ...extraFiles];
    vm.runInNewContext(serviceWorkerSource({ base, version, files }), { self, caches, fetch: fetcher, URL, Request, Response, Headers, AbortController, setTimeout, clearTimeout, Promise, Error, Set });
    const emit = async (name, data = {}) => {
      let promise; let response;
      events[name]({ ...data, waitUntil: p => { promise = p; }, respondWith: p => { response = p; } });
      await promise; return await response;
    };
    return { emit, files };
  }
  return { worker, stores, caches, fetched, staleHttp: v => { staleHttpContents = v; }, online: v => { online = v; }, contents: v => { contents = v; }, fail: v => { failPath = v; }, skipped: () => skip };
}
test('install bypasses stale browser HTTP HTML and stores a matching app shell', async () => {
  const e = environment();
  e.staleHttp('<script src="' + base + 'assets/old.js"></script>');
  const current = '<script src="' + base + 'assets/current.js"></script>';
  e.contents(current);
  const w = e.worker('fresh', [base + 'assets/current.js']); await w.emit('install');
  assert.ok(e.fetched.every(request => request.cache === 'reload'));
  e.online(false);
  const html = await w.emit('fetch', { request: { method: 'GET', url: 'https://example.org' + base, mode: 'navigate' } });
  assert.equal(await html.text(), current);
});
test('install rejects a stale server shell that references assets outside its manifest', async () => {
  const e = environment();
  e.contents('<script src="' + base + 'assets/old.js"></script>');
  await assert.rejects(e.worker('mixed', [base + 'assets/current.js']).emit('install'), /assets do not match/);
  assert.equal(e.stores.has('sedona-2026-mixed'), false);
});
test('offline readiness requires every resource, including the PDF', async () => {
  const e = environment(); const w = e.worker('one'); await w.emit('install');
  let ready;
  await w.emit('message', { data: { type: 'CACHE_STATUS' }, ports: [{ postMessage: v => { ready = v.ready; } }] });
  assert.equal(ready, true);
  e.stores.get('sedona-2026-one').delete('https://example.org' + base + 'sedona-2026-guide.pdf');
  await w.emit('message', { data: { type: 'CACHE_STATUS' }, ports: [{ postMessage: v => { ready = v.ready; } }] });
  assert.equal(ready, false);
});
test('failed first download never leaves an apparently ready cache', async () => {
  const e = environment(); e.fail('sedona-2026-guide.pdf');
  await assert.rejects(e.worker('failed').emit('install'));
  assert.equal(e.stores.has('sedona-2026-failed'), false);
});
test('offline reload serves the cached application and data', async () => {
  const e = environment(); const w = e.worker('one'); await w.emit('install'); e.online(false);
  const html = await w.emit('fetch', { request: { method: 'GET', url: 'https://example.org' + base, mode: 'navigate' } });
  assert.equal(await html.text(), 'version one');
  const data = await w.emit('fetch', { request: new Request('https://example.org' + base + 'data/travel.json') });
  assert.equal(await data.text(), 'version one');
});
test('travel data is network first and persists the last successful response', async () => {
  const e = environment(); const w = e.worker('one'); await w.emit('install'); e.contents('new itinerary');
  const request = new Request('https://example.org' + base + 'data/travel.json');
  assert.equal(await (await w.emit('fetch', { request })).text(), 'new itinerary');
  e.online(false);
  assert.equal(await (await w.emit('fetch', { request })).text(), 'new itinerary');
});
test('PDF navigation in an installed app returns a PDF download online and offline, never the HTML shell', async () => {
  const e = environment(); const w = e.worker('pdf'); await w.emit('install');
  for (const online of [true, false]) {
    e.online(online);
    const response = await w.emit('fetch', { request: { method: 'GET', url: 'https://example.org' + base + 'sedona-2026-guide.pdf', mode: 'navigate' } });
    assert.equal(response.headers.get('Content-Type'), 'application/pdf');
    assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="Sedona-2026-guide.pdf"');
    assert.ok((await response.text()).startsWith('%PDF-'));
  }
});
test('an uncached PDF navigation fetches the PDF and a missing offline PDF fails without HTML fallback', async () => {
  const e = environment(); const w = e.worker('pdf'); await w.emit('install');
  const url = 'https://example.org' + base + 'sedona-2026-guide.pdf';
  const request = { method: 'GET', url, mode: 'navigate' };
  e.stores.get('sedona-2026-pdf').delete(url);
  const online = await w.emit('fetch', { request });
  assert.ok((await online.text()).startsWith('%PDF-'));
  e.stores.get('sedona-2026-pdf').delete(url); e.online(false);
  const offline = await w.emit('fetch', { request });
  assert.equal(offline.status, 503);
  assert.notEqual(await offline.text(), 'version one');
});
test('new version waits for explicit update; activation only cleans its own caches', async () => {
  const e = environment(); const one = e.worker('one'); await one.emit('install');
  await e.caches.open('japan-2027-keep'); e.contents('version two');
  const two = e.worker('two'); await two.emit('install'); assert.equal(e.skipped(), 0);
  await two.emit('message', { data: { type: 'SKIP_WAITING' } }); assert.equal(e.skipped(), 1);
  await two.emit('activate'); assert.deepEqual((await e.caches.keys()).sort(), ['japan-2027-keep', 'sedona-2026-two']);
  e.online(false);
  const html = await two.emit('fetch', { request: { method: 'GET', url: 'https://example.org' + base, mode: 'navigate' } });
  assert.equal(await html.text(), 'version two');
});
test('other trips and external weather requests are outside the service worker scope', async () => {
  const e = environment(); const w = e.worker('one');
  assert.equal(await w.emit('fetch', { request: new Request('https://example.org/travel/japan-2027/') }), undefined);
  assert.equal(await w.emit('fetch', { request: new Request('https://api.open-meteo.com/v1/forecast') }), undefined);
});
