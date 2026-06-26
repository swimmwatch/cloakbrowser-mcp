#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({ name: 'fake-playwright-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

const tools = [
  {
    name: 'browser_snapshot',
    title: 'Page snapshot',
    description: 'Capture accessibility snapshot.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'browser_navigate',
    title: 'Navigate',
    description: 'Navigate to a URL.',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const value = {
    forwarded: true,
    name: request.params.name,
    arguments: request.params.arguments ?? {},
  };
  if (request.params.arguments?.includePid === true) value.upstreamPid = process.pid;
  if (request.params.arguments?.includeProxyEnv === true) {
    value.proxyEnv = {
      server: process.env.PLAYWRIGHT_MCP_PROXY_SERVER ?? null,
      bypass: process.env.PLAYWRIGHT_MCP_PROXY_BYPASS ?? null,
    };
  }
  if (request.params.arguments?.includeProxyConfig === true) {
    value.proxyConfig = readProxyConfig();
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
  };
});

await server.connect(new StdioServerTransport());

function readProxyConfig() {
  const configPath = process.env.PLAYWRIGHT_MCP_CONFIG;
  if (!configPath) return null;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  return config.browser?.launchOptions?.proxy ?? null;
}
