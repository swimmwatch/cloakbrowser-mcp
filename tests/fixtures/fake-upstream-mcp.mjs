#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({ name: 'fake-playwright-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
const toolNames = JSON.parse(readFileSync(new URL('./fake-upstream-tools.json', import.meta.url), 'utf8'));
const tools = toolNames.map((name) => ({
  name,
  title: formatToolTitle(name),
  description: `Fake upstream implementation for ${name}.`,
  inputSchema: { type: 'object', properties: {}, additionalProperties: true },
}));

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
  if (request.params.arguments?.includeBrowserConfig === true) {
    value.browserConfig = readBrowserConfig();
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

function readBrowserConfig() {
  const config = readConfig();
  return config?.browser ?? null;
}

function readConfig() {
  const configPath = process.env.PLAYWRIGHT_MCP_CONFIG;
  if (!configPath) return null;
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function formatToolTitle(name) {
  return name
    .replace(/^browser_/u, '')
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
