import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAuthCallback } from '../src/http.js';

function setup(t: import('node:test').TestContext) {
  process.env.KV_REST_API_URL = 'https://redis.test';
  process.env.KV_REST_API_TOKEN = 'tok';
  process.env.FATSECRET_CLIENT_ID = 'id';
  process.env.FATSECRET_CLIENT_SECRET = 'secret';
  process.env.FATSECRET_CONSUMER_SECRET = 'consumer';
  const commands: unknown[][] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL, init?: RequestInit) => {
    if (String(url).startsWith('https://redis.test')) {
      const cmd = JSON.parse(init!.body as string) as unknown[];
      commands.push(cmd);
      return new Response(JSON.stringify({ result: cmd[0] === 'GET' ? JSON.stringify({ token: 'req', secret: 'rs' }) : 'OK' }));
    }
    assert.match(String(url), /access_token/);
    return new Response('oauth_token=at&oauth_token_secret=ats');
  });
  return commands;
}

test('callback exchanges the verifier and stores the access token', async (t) => {
  const commands = setup(t);
  const res = await handleAuthCallback(new Request('https://x/auth/callback?oauth_token=req&oauth_verifier=123'));
  assert.equal(res.status, 200);
  const set = commands.find((c) => c[0] === 'SET');
  assert.deepEqual(JSON.parse(set![2] as string), { accessToken: 'at', accessTokenSecret: 'ats' });
  assert.ok(commands.some((c) => c[0] === 'DEL'));
});

test('callback rejects an unknown oauth_token', async (t) => {
  setup(t);
  const res = await handleAuthCallback(new Request('https://x/auth/callback?oauth_token=other&oauth_verifier=123'));
  assert.equal(res.status, 400);
});

test('callback rejects missing parameters', async () => {
  assert.equal((await handleAuthCallback(new Request('https://x/auth/callback'))).status, 400);
});
