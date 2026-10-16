import { createServer } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { type Browser, chromium } from 'playwright';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import {
  cleanupDockerE2e,
  dockerLogs,
  startHttpDockerContainer,
  waitForDockerHttp,
} from '@tests/e2e/dockerHarness.js';
type BrowserEngine = 'cloak' | 'playwright';
interface ReadyCdpInfo {
  discoveryUrl: string;
  enabled: true;
  port: number;
  state: 'ready';
}
const engine = readBrowserEngine();
const architecture = readDockerArchitecture();
const browsers: Browser[] = [];
const clients: Client[] = [];
it('matches the declared Docker architecture evidence', () => {
  const expected = process.env.CLOAKBROWSER_MCP_CDP_EXPECTED_ARCHITECTURE;
  if (expected === undefined) return;
  expect(architecture).toBe(expected);
});
afterEach(async () => {
  const mappedValues = browsers.splice(0).map(async (browser) => await browser.close());
  await Promise.allSettled(mappedValues);
  const mappedValues2 = clients.splice(0).map(async (client) => await client.close());
  await Promise.allSettled(mappedValues2);
});
afterAll(() => cleanupDockerE2e());
describe('Docker managed CDP', () => {
  it('publishes the configured port one-to-one and relays a real browser WebSocket', async () => {
    const cdpPort = await findFreePort();
    const startHttpDockerContainerOptions = {
      browserEngine: engine,
      cdp: { enabled: true, port: cdpPort },
      headless: engine === 'cloak',
    } as const;
    const container = startHttpDockerContainer(startHttpDockerContainerOptions);
    await waitForDockerHttp(container.url, 30000);
    let client: Client;
    let cdp: ReadyCdpInfo;
    try {
      client = await connectClient(container.url);
      cdp = await readCdpInfo(client);
    } catch (error) {
      const logs = dockerLogs(container.containerName);
      const templateValue = engine;
      const message = `${logs.stdout}\n${logs.stderr}`;
      const templateValue2 = redactCapabilities(message);
      const message2 = `Docker ${templateValue} managed CDP startup failed: ${templateValue2}`;
      const errorOptions = { cause: error } as const;
      throw new Error(message2, errorOptions);
    }
    expect(cdp.port).toBe(cdpPort);
    const receiverActual = cdp.discoveryUrl;
    const message3 = `^http://127\\.0\\.0\\.1:${String(cdpPort)}/cdp/`;
    const regExp = new RegExp(message3, 'u');
    expect(receiverActual).toMatch(regExp);
    const browser = await chromium.connectOverCDP(cdp.discoveryUrl);
    browsers.push(browser);
    const session = await browser.newBrowserCDPSession();
    const sendResult = session.send('Browser.getVersion');
    const receiver2Actual = sendResult;
    const toMatchObjectOptions = {
      product: expect.any(String),
    } as const;
    await expect(receiver2Actual).resolves.toMatchObject(toMatchObjectOptions);
    await session.detach();
  });
  it('does not bind the published range for a disabled session', async () => {
    const cdpPort = await findFreePort();
    const startHttpDockerContainerOptions2 = {
      browserEngine: engine,
      cdp: { enabled: false, port: cdpPort },
      headless: engine === 'cloak',
    } as const;
    const container = startHttpDockerContainer(startHttpDockerContainerOptions2);
    await waitForDockerHttp(container.url, 30000);
    const client = await connectClient(container.url);
    const bridgeInfo = await callTool(client, LOCAL_TOOL_BRIDGE_INFO);
    const receiver3Actual = bridgeInfo.structuredContent?.cdp;
    const toEqualOptions = { enabled: false } as const;
    expect(receiver3Actual).toEqual(toEqualOptions);
    const message4 = `http://127.0.0.1:${String(cdpPort)}/json/version`;
    const fetchOptions = {
      signal: AbortSignal.timeout(2000),
    } as const;
    const fetchResult = fetch(message4, fetchOptions);
    await expect(fetchResult).rejects.toThrow();
  });
});
async function connectClient(url: string): Promise<Client> {
  const uRL = new URL(url);
  const transport = new StreamableHTTPClientTransport(uRL);
  const clientOptions = { name: `docker-cdp-${engine}-e2e`, version: '1.0.0' } as const;
  const client = new Client(clientOptions);
  clients.push(client);
  await client.connect(transport);
  return client;
}
async function readCdpInfo(client: Client): Promise<ReadyCdpInfo> {
  const result = await callTool(client, LOCAL_TOOL_BRIDGE_INFO);
  const cdp = result.structuredContent?.cdp as ReadyCdpInfo | undefined;
  if (cdp?.enabled !== true || cdp.state !== 'ready') {
    const message6 = `Docker managed CDP is not ready: ${JSON.stringify(cdp)}`;
    throw new Error(message6);
  }
  return cdp;
}
async function callTool(client: Client, name: string): Promise<CallToolResult> {
  const callToolOptions = { name, arguments: {} } as const;
  const result = (await client.callTool(callToolOptions)) as CallToolResult;
  if (result.isError === true) {
    const serializedValue = JSON.stringify(result.content);
    throw new Error(serializedValue);
  }
  return result;
}
async function findFreePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('Expected TCP address');
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  return address.port;
}
function readBrowserEngine(): BrowserEngine {
  const value = process.env.CLOAKBROWSER_MCP_CDP_DOCKER_ENGINE ?? 'cloak';
  if (value === 'cloak' || value === 'playwright') return value;
  const message7 = `Unsupported Docker CDP engine: ${value}`;
  throw new Error(message7);
}
function readDockerArchitecture(): 'linux/amd64' | 'linux/arm64' {
  if (process.platform !== 'linux') throw new Error('Docker managed CDP evidence requires Linux');
  if (process.arch === 'x64') return 'linux/amd64';
  if (process.arch === 'arm64') return 'linux/arm64';
  const message8 = `Unsupported Docker CDP architecture: ${process.arch}`;
  throw new Error(message8);
}
function redactCapabilities(value: string): string {
  return value.replace(/\/cdp\/[A-Za-z0-9_-]{43}(?=[/?#]|$)/gu, '/cdp/<redacted>');
}
