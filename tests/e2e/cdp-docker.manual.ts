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
  await Promise.allSettled(browsers.splice(0).map(async (browser) => await browser.close()));
  await Promise.allSettled(clients.splice(0).map(async (client) => await client.close()));
});

afterAll(() => cleanupDockerE2e());

describe(`Docker ${architecture} managed CDP with ${engine}`, () => {
  it('publishes the configured port one-to-one and relays a real browser WebSocket', async () => {
    const cdpPort = await findFreePort();
    const container = startHttpDockerContainer({
      browserEngine: engine,
      cdp: { enabled: true, port: cdpPort },
      headless: engine === 'cloak',
    });
    await waitForDockerHttp(container.url, 30_000);
    let client: Client;
    let cdp: ReadyCdpInfo;
    try {
      client = await connectClient(container.url);
      cdp = await readCdpInfo(client);
    } catch (error) {
      const logs = dockerLogs(container.containerName);
      throw new Error(
        `Docker ${engine} managed CDP startup failed: ${redactCapabilities(`${logs.stdout}\n${logs.stderr}`)}`,
        { cause: error },
      );
    }

    expect(cdp.port).toBe(cdpPort);
    expect(cdp.discoveryUrl).toMatch(new RegExp(`^http://127\\.0\\.0\\.1:${String(cdpPort)}/cdp/`, 'u'));
    const browser = await chromium.connectOverCDP(cdp.discoveryUrl);
    browsers.push(browser);
    const session = await browser.newBrowserCDPSession();
    await expect(session.send('Browser.getVersion')).resolves.toMatchObject({
      product: expect.any(String),
    });
    await session.detach();
  });

  it('does not bind the published range for a disabled session', async () => {
    const cdpPort = await findFreePort();
    const container = startHttpDockerContainer({
      browserEngine: engine,
      cdp: { enabled: false, port: cdpPort },
      headless: engine === 'cloak',
    });
    await waitForDockerHttp(container.url, 30_000);
    const client = await connectClient(container.url);
    const bridgeInfo = await callTool(client, LOCAL_TOOL_BRIDGE_INFO);
    expect(bridgeInfo.structuredContent?.cdp).toEqual({ enabled: false });
    await expect(
      fetch(`http://127.0.0.1:${String(cdpPort)}/json/version`, {
        signal: AbortSignal.timeout(2_000),
      }),
    ).rejects.toThrow();
  });
});

async function connectClient(url: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: `docker-cdp-${engine}-e2e`, version: '1.0.0' });
  clients.push(client);
  await client.connect(transport);
  return client;
}

async function readCdpInfo(client: Client): Promise<ReadyCdpInfo> {
  const result = await callTool(client, LOCAL_TOOL_BRIDGE_INFO);
  const cdp = result.structuredContent?.cdp as ReadyCdpInfo | undefined;
  if (cdp?.enabled !== true || cdp.state !== 'ready') {
    throw new Error(`Docker managed CDP is not ready: ${JSON.stringify(cdp)}`);
  }
  return cdp;
}

async function callTool(client: Client, name: string): Promise<CallToolResult> {
  const result = (await client.callTool({ name, arguments: {} })) as CallToolResult;
  if (result.isError === true) throw new Error(JSON.stringify(result.content));
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
  throw new Error(`Unsupported Docker CDP engine: ${value}`);
}

function readDockerArchitecture(): 'linux/amd64' | 'linux/arm64' {
  if (process.platform !== 'linux') throw new Error('Docker managed CDP evidence requires Linux');
  if (process.arch === 'x64') return 'linux/amd64';
  if (process.arch === 'arm64') return 'linux/arm64';
  throw new Error(`Unsupported Docker CDP architecture: ${process.arch}`);
}

function redactCapabilities(value: string): string {
  return value.replace(/\/cdp\/[A-Za-z0-9_-]{43}(?=[/?#]|$)/gu, '/cdp/<redacted>');
}
