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
  if (request.params.arguments?.includeHumanizeConfig === true) {
    value.humanizeConfig = readHumanizeConfig();
  }
  if (request.params.arguments?.includeHeadlessConfig === true) {
    value.headlessConfig = readHeadlessConfig();
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
  };
});

await server.connect(new StdioServerTransport());

function readProxyConfig() {
  const config = readConfig();
  return config?.browser?.launchOptions?.proxy ?? null;
}

function readHumanizeConfig() {
  const config = readConfig();
  const initPage = config?.browser?.initPage;
  if (!Array.isArray(initPage)) return { enabled: false, initPageCount: 0 };
  return {
    enabled: initPage.some((value) => String(value).includes('humanize-init-page.cjs')),
    initPageCount: initPage.length,
    preset: process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET ?? null,
  };
}

function readHeadlessConfig() {
  const config = readConfig();
  return {
    env: process.env.PLAYWRIGHT_MCP_HEADLESS ?? null,
    config: config?.browser?.launchOptions?.headless ?? null,
  };
}

function readConfig() {
  const configPath = process.env.PLAYWRIGHT_MCP_CONFIG;
  if (!configPath) return null;
  return JSON.parse(readFileSync(configPath, 'utf8'));
}
