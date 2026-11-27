import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithTimeout } from './request';

test('requests work on Safari without AbortSignal.timeout', async t => {
  t.mock.method(AbortSignal, 'timeout', () => { throw new Error('unavailable'); });
  t.mock.method(globalThis, 'fetch', async (_input: unknown, init: RequestInit) => {
    assert.ok(init.signal instanceof AbortSignal);
    return new Response('itinerary');
  });
  assert.equal(await (await fetchWithTimeout('https://example.org')).text(), 'itinerary');
});

test('a stalled request aborts so it cannot block indefinitely', async t => {
  t.mock.method(globalThis, 'fetch', (_input: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  await assert.rejects(fetchWithTimeout('https://example.org', {}, 10), { name: 'AbortError' });
});
