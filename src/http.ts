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
  const server = new FatSecretMcpServer(tokenStoreFromEnv());
  await server.init();
  await server.connect(transport);
  return transport.handleRequest(request);
}
