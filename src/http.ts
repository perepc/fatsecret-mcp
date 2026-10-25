import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { extractApiKey, isValidApiKey, parseApiKeys } from './auth.js';
import { FatSecretMcpServer } from './server.js';
import { tokenStoreFromEnv } from './token-store.js';

function jsonError(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message }, id: null }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** Stateless Streamable HTTP handler, protected by an API key (MCP_API_KEYS). */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const keys = parseApiKeys(process.env.MCP_API_KEYS);
  if (keys.length === 0) {
    console.error('MCP_API_KEYS is not set; rejecting all requests');
    return jsonError(500, 'Server authentication is not configured');
  }
  if (!isValidApiKey(extractApiKey(request.headers), keys)) {
    return jsonError(401, 'Invalid or missing API key', { 'WWW-Authenticate': 'Bearer' });
  }

  // Stateless mode: a fresh server + transport per request (required for serverless).
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const callbackUrl = new URL('/auth/callback', process.env.PUBLIC_BASE_URL || request.url).toString();
  const server = new FatSecretMcpServer(tokenStoreFromEnv(), callbackUrl);
  await server.init();
  await server.connect(transport);
  return transport.handleRequest(request);
}

function page(status: number, title: string, message: string): Response {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
    `<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${message}</p></body>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/**
 * OAuth 1.0 redirect target. Opened by the user's browser, so it cannot require the API key;
 * it only succeeds for the single pending request token stored by start_auth.
 */
export async function handleAuthCallback(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const oauthToken = params.get('oauth_token');
  const verifier = params.get('oauth_verifier');
  if (!oauthToken || !verifier) {
    return page(400, 'Invalid request', 'Missing OAuth parameters.');
  }
  const store = tokenStoreFromEnv();
  if (!store) {
    return page(500, 'Not configured', 'No token store is configured on the server.');
  }
  try {
    const server = new FatSecretMcpServer(store);
    await server.completeAuthFromCallback(oauthToken, verifier);
    return page(200, 'Authenticated', 'FatSecret is now connected. You can close this tab.');
  } catch (err) {
    console.error('Auth callback failed:', err);
    return page(400, 'Authentication failed', 'The request is unknown or expired. Run start_auth again.');
  }
}
