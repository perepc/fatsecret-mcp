import { createHash, timingSafeEqual } from 'node:crypto';

/** Parse the comma-separated MCP_API_KEYS env var into a list of valid keys. */
export function parseApiKeys(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

/** Read the key from `Authorization: Bearer <key>` or `X-API-Key: <key>`. */
export function extractApiKey(headers: Headers): string | null {
  const auth = headers.get('authorization');
  const match = auth?.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return headers.get('x-api-key')?.trim() || null;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Constant-time check of a candidate key against all valid keys. Fails closed if none are configured. */
export function isValidApiKey(candidate: string | null, validKeys: string[]): boolean {
  if (!candidate || validKeys.length === 0) return false;
  const candidateDigest = digest(candidate);
  let ok = false;
  for (const key of validKeys) {
    if (timingSafeEqual(candidateDigest, digest(key))) ok = true;
  }
  return ok;
}
