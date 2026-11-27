import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../../scripts/static/sedona-recovery.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function repair({ online = true, reachable = true } = {}) {
  let click;
  const removed = [], unregistered = [];
  const button = { disabled: false, addEventListener: (_event, listener) => { click = listener; } };
  const status = { textContent: '' };
  let destination;
  const registrations = ['/travel/sedona-2026/', '/travel/japan-2027/', '/travel/'].map(path => ({
    scope: 'https://example.org' + path,
    unregister: async () => { unregistered.push(path); },
  }));
  const caches = { keys: async () => ['sedona-2026-one', 'japan-2027-keep'], delete: async key => { removed.push(key); } };
  const navigator = { onLine: online, serviceWorker: { getRegistrations: async () => registrations } };
  vm.runInNewContext(script, {
    document: { getElementById: id => id === 'repair' ? button : status }, navigator,
    window: { caches }, caches, URL, Date, Promise, Error,
    fetch: async () => ({ ok: reachable }),
    location: { origin: 'https://example.org', replace: url => { destination = url; } },
  });
  click(); await new Promise(resolve => setImmediate(resolve));
  return { removed, unregistered, destination, status: status.textContent, disabled: button.disabled };
}

test('repair removes only Sedona worker and caches before opening a fresh homepage', async () => {
  const result = await repair();
  assert.deepEqual(result.unregistered, ['/travel/sedona-2026/']);
  assert.deepEqual(result.removed, ['sedona-2026-one']);
  assert.ok(result.destination.startsWith('/travel/sedona-2026/?recovered='));
});
test('repair preserves offline content when offline or the server cannot be reached', async () => {
  for (const options of [{ online: false }, { reachable: false }]) {
    const result = await repair(options);
    assert.deepEqual(result.removed, []); assert.deepEqual(result.unregistered, []);
    assert.equal(result.destination, undefined); assert.equal(result.disabled, false);
    assert.ok(result.status.includes('网络'));
  }
});
