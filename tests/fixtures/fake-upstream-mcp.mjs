#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import process from 'node:process';
import { URL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer } from 'ws';
const cdpMetrics = {
  challengePlacements: 0,
  internalPort: null,
  tabsCalls: 0,
};
const cdpChallenges = new Map();
const toolCallCounts = new Map();
const startedCalls = new Set();
const dynamicTools = new Map();
let browserGeneration = 1;
let fakeChromium;
function configuredCdpPort() {
  const args = readBrowserConfig()?.launchOptions?.args;
  if (!Array.isArray(args)) return null;
  const argument = args.find((value) =>
    typeof value === 'string' ? value.startsWith('--remote-debugging-port=') : false,
  );
  if (typeof argument !== 'string') return null;
  const sliceResult = argument.slice('--remote-debugging-port='.length);
  const port = Number(sliceResult);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}
async function ensureFakeChromium() {
  if (fakeChromium !== undefined) return;
  const port = configuredCdpPort();
  if (port === null) return;
  const webSocketServerOptions = { noServer: true, perMessageDeflate: false };
  const webSocketServer = new WebSocketServer(webSocketServerOptions);
  const httpServer = createServer((request, response) => {
    const origin = `ws://127.0.0.1:${port}`;
    if (request.url === '/json/version' || request.url === '/json/version/') {
      const respondJsonOptions = {
        webSocketDebuggerUrl: `${origin}/devtools/browser/browser-${process.pid}-${browserGeneration}`,
      };
      respondJson(response, respondJsonOptions);
      return;
    }
    if (request.url === '/json/list' || request.url === '/json/list/') {
      const values2 = [
        {
          id: `page-${process.pid}-${browserGeneration}`,
          type: 'page',
          webSocketDebuggerUrl: `${origin}/devtools/page/page-${process.pid}-${browserGeneration}`,
        },
      ];
      respondJson(response, values2);
      return;
    }
    response.writeHead(404).end();
  });
  httpServer.on('upgrade', (request, socket, head) => {
    const computedValue = request.url ?? '';
    if (!/^\/devtools\/(?:browser|page)\//u.test(computedValue)) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      webSocketServer.emit('connection', webSocket, request);
    });
  });
  webSocketServer.on('connection', (webSocket) => {
    webSocket.on('message', (data) => {
      const toStringResult = Buffer.from(data).toString();
      const request = JSON.parse(toStringResult);
      if (request.method === 'Browser.close') {
        browserGeneration += 1;
        webSocket.close(1001, 'browser_closed');
        return;
      }
      if (request.method !== 'Runtime.evaluate') {
        webSocket.send(data);
        return;
      }
      const computedValue2 = request.params?.expression ?? '';
      const propertyMatch = /const propertyName = ("(?:[^"\\]|\\.)*")/u.exec(computedValue2);
      const propertyName = propertyMatch === null ? undefined : JSON.parse(propertyMatch[1]);
      const value = propertyName === undefined ? undefined : cdpChallenges.get(propertyName);
      if (propertyName !== undefined) cdpChallenges.delete(propertyName);
      const stringifyOptions = { id: request.id, result: { result: { type: 'string', value } } };
      const serializedValue = JSON.stringify(stringifyOptions);
      webSocket.send(serializedValue);
    });
  });
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, '127.0.0.1', resolve);
  });
  cdpMetrics.internalPort = port;
  fakeChromium = { httpServer, webSocketServer };
}
async function closeFakeChromium() {
  if (fakeChromium === undefined) return;
  const { httpServer, webSocketServer } = fakeChromium;
  fakeChromium = undefined;
  for (const socket of webSocketServer.clients) socket.terminate();
  const values3 = [
    new Promise((resolve) => webSocketServer.close(resolve)),
    new Promise((resolve) => httpServer.close(resolve)),
  ];
  await Promise.all(values3);
}
function respondJson(response, value) {
  const writeHeadOptions = { 'content-type': 'application/json' };
  response.writeHead(200, writeHeadOptions);
  const serializedValue2 = JSON.stringify(value);
  response.end(serializedValue2);
}
function recordChallenge(functionSource) {
  const match = /globalThis\[("(?:[^"\\]|\\.)*")\]\s*=\s*("(?:[^"\\]|\\.)*")/u.exec(functionSource);
  if (match === null) return;
  const parsedValue = JSON.parse(match[1]);
  const parsedValue2 = JSON.parse(match[2]);
  cdpChallenges.set(parsedValue, parsedValue2);
  cdpMetrics.challengePlacements += 1;
}
const serverOptions = { name: 'fake-playwright-mcp', version: '1.0.0' };
const serverOptions2 = { capabilities: { tools: { listChanged: true } } };
const server = new Server(serverOptions, serverOptions2);
const uRL = new URL('./fake-upstream-tools.json', import.meta.url);
const fileSyncResult = readFileSync(uRL, 'utf8');
const toolNames = JSON.parse(fileSyncResult);
const tools = toolNames.map((name) => ({
  name,
  title: formatToolTitle(name),
  description: `Fake upstream implementation for ${name}.`,
  inputSchema: { type: 'object', properties: {}, additionalProperties: true },
}));
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [...tools, ...dynamicTools.values()],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.arguments?.fakeRecordStartedCall === true) {
    const callId = request.params.arguments?.callId;
    if (typeof callId === 'string') startedCalls.add(callId);
  }
  const delayMs = request.params.arguments?.delayMs;
  if (typeof delayMs === 'number' && Number.isFinite(delayMs) && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (request.params.name === 'browser_tabs') {
    cdpMetrics.tabsCalls += 1;
    await ensureFakeChromium();
  }
  if (request.params.name === 'browser_evaluate') {
    const computedValue3 = request.params.arguments?.function ?? '';
    recordChallenge(computedValue3);
  }
  const dynamicToolAction = request.params.arguments?.fakeDynamicToolAction;
  if (dynamicToolAction === 'add') {
    const dynamicName = request.params.arguments?.fakeDynamicToolName;
    if (typeof dynamicName === 'string' && dynamicName.startsWith('webmcp_')) {
      const setOptions = {
        name: dynamicName,
        title: 'Untrusted page tool',
        description: 'Page-provided dynamic tool.',
        inputSchema: {
          type: 'object',
          properties: { value: { type: 'string' } },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
      };
      dynamicTools.set(dynamicName, setOptions);
      await server.sendToolListChanged();
    }
  } else if (dynamicToolAction === 'remove') {
    const dynamicName = request.params.arguments?.fakeDynamicToolName;
    if (typeof dynamicName === 'string' && dynamicTools.delete(dynamicName)) {
      await server.sendToolListChanged();
    }
  }
  const value = {
    forwarded: true,
    name: request.params.name,
    arguments: request.params.arguments ?? {},
  };
  const callId = request.params.arguments?.callId;
  if (typeof callId === 'string') {
    const count = (toolCallCounts.get(callId) ?? 0) + 1;
    toolCallCounts.set(callId, count);
    value.toolCallCount = count;
  }
  if (request.params.arguments?.includeStartedCalls === true) value.startedCalls = [...startedCalls];
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
  if (request.params.arguments?.includeExtensionConfig === true) {
    value.extensionConfig = readExtensionConfig();
  }
  if (request.params.arguments?.includeBrowserConfig === true) {
    value.browserConfig = readBrowserConfig();
  }
  if (request.params.arguments?.includeCdpMetrics === true) {
    value.cdpMetrics = { ...cdpMetrics };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
  };
});
process.stdin.once('end', () => {
  void server.close().finally(() => closeFakeChromium());
});
const stdioServerTransport = new StdioServerTransport();
await server.connect(stdioServerTransport);
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
function readExtensionConfig() {
  const config = readConfig();
  return {
    enabled: process.env.PLAYWRIGHT_MCP_EXTENSION ?? null,
    hasToken: Boolean(process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN),
    profileDirName: process.env.PLAYWRIGHT_MCP_PROFILE_DIR_NAME ?? null,
    userDataDir: config?.browser?.userDataDir ?? null,
  };
}
function readBrowserConfig() {
  const config = readConfig();
  return config?.browser ?? null;
}
function readConfig() {
  const configPath = process.env.PLAYWRIGHT_MCP_CONFIG;
  if (!configPath) return null;
  const fileSyncResult2 = readFileSync(configPath, 'utf8');
  return JSON.parse(fileSyncResult2);
}
function formatToolTitle(name) {
  return name
    .replace(/^browser_/u, '')
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
