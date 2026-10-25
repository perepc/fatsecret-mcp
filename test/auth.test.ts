import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractApiKey, isValidApiKey, parseApiKeys } from '../src/auth.js';

test('parseApiKeys splits, trims and drops empties', () => {
  assert.deepEqual(parseApiKeys(' a, b ,,c '), ['a', 'b', 'c']);
  assert.deepEqual(parseApiKeys(undefined), []);
});

test('extractApiKey reads Bearer and X-API-Key', () => {
  assert.equal(extractApiKey(new Headers({ Authorization: 'Bearer abc' })), 'abc');
  assert.equal(extractApiKey(new Headers({ 'X-API-Key': 'xyz' })), 'xyz');
  assert.equal(extractApiKey(new Headers()), null);
});

test('isValidApiKey accepts only configured keys and fails closed', () => {
  assert.equal(isValidApiKey('b', ['a', 'b']), true);
  assert.equal(isValidApiKey('c', ['a', 'b']), false);
  assert.equal(isValidApiKey(null, ['a']), false);
  assert.equal(isValidApiKey('a', []), false);
});
