#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FatSecretMcpServer } from './server.js';

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

async function run(): Promise<void> {
  const server = new FatSecretMcpServer();
  await server.connect(new StdioServerTransport());
  console.error('FatSecret MCP server running on stdio');
}

run().catch(console.error);
