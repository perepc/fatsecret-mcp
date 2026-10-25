/** Minimal key-value store for state that must survive between serverless invocations. */
export interface TokenStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}

/** Redis over the Upstash REST API (what Vercel Marketplace Redis/KV provides). */
export class RestRedisStore implements TokenStore {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async command(args: (string | number)[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const data = (await response.json()) as { result?: unknown; error?: string };
    if (!response.ok || data.error) {
      throw new Error(`Token store request failed: ${response.status} ${data.error ?? ''}`);
    }
    return data.result;
  }

  async get(key: string): Promise<string | null> {
    return ((await this.command(['GET', key])) as string | null) ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.command(ttlSeconds ? ['SET', key, value, 'EX', ttlSeconds] : ['SET', key, value]);
  }
}

/** Returns a store when Redis REST env vars are present, otherwise null (local file config is used). */
export function tokenStoreFromEnv(env: NodeJS.ProcessEnv = process.env): TokenStore | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new RestRedisStore(url, token) : null;
}
