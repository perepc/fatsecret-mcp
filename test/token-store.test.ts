import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RestRedisStore, tokenStoreFromEnv } from '../src/token-store.js';

test('tokenStoreFromEnv returns null without Redis env vars', () => {
  assert.equal(tokenStoreFromEnv({}), null);
  assert.ok(tokenStoreFromEnv({ KV_REST_API_URL: 'https://r', KV_REST_API_TOKEN: 't' }) instanceof RestRedisStore);
});

test('RestRedisStore sends Redis commands with bearer auth', async (t) => {
  const calls: { body: unknown; auth: string | null }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    calls.push({ body: JSON.parse(init.body as string), auth: new Headers(init.headers).get('authorization') });
    return new Response(JSON.stringify({ result: 'v' }));
  });
  const store = new RestRedisStore('https://r', 'tok');
  await store.set('k', 'v', 60);
  assert.equal(await store.get('k'), 'v');
  assert.deepEqual(calls[0].body, ['SET', 'k', 'v', 'EX', 60]);
  assert.deepEqual(calls[1].body, ['GET', 'k']);
  assert.equal(calls[0].auth, 'Bearer tok');
});
