import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
const uRL = new URL('../../dist/cli.js', import.meta.url);
const cliPath = fileURLToPath(uRL);
type ProbePhase =
  | 'connect'
  | 'control-navigation'
  | 'control-snapshot'
  | 'console-navigation'
  | 'console-read'
  | 'post-console-call';
type FailureSignature = 'mcp-connection-closed' | 'transport-closed' | 'other';
interface ConsoleProbeAttempt {
  attempt: number;
  controlPassed: boolean;
  phase: ProbePhase;
  success: boolean;
  signature: FailureSignature | null;
  stderr: string;
  message: string | null;
}
describe('Playwright console live probe', () => {
  it('keeps the MCP process alive after every console method across two clean sessions', async () => {
    const fixture = await startFixtureServer();
    const attempts: ConsoleProbeAttempt[] = [];
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const probe = await runConsoleProbe(fixture.url, attempt);
        attempts.push(probe);
      }
    } finally {
      await fixture.close();
    }
    if (attempts.every((attempt) => attempt.success)) return;
    const confirmed =
      attempts.every(
        (attempt) =>
          attempt.controlPassed &&
          !attempt.success &&
          isConsolePhase(attempt.phase) &&
          (attempt.signature === 'mcp-connection-closed' || attempt.signature === 'transport-closed'),
      ) && attempts[0]?.signature === attempts[1]?.signature;
    const classification = confirmed ? 'confirmed issue #141' : 'inconclusive issue #141 result';
    const message2 = `${classification}: ${JSON.stringify(attempts, null, 2)}`;
    throw new Error(message2);
  });
});
async function runConsoleProbe(fixtureUrl: string, attempt: number): Promise<ConsoleProbeAttempt> {
  const tmpdirResult = tmpdir();
  const message3 = `cloakbrowser-console-${attempt}-`;
  const joinedPath = path.join(tmpdirResult, message3);
  const runtimeRoot = mkdtempSync(joinedPath);
  const env = {
    ...process.env,
    PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
    PLAYWRIGHT_MCP_HEADLESS: 'true',
    PLAYWRIGHT_MCP_ISOLATED: 'true',
    PLAYWRIGHT_MCP_EXECUTABLE_PATH: chromium.executablePath(),
    PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(runtimeRoot, 'output'),
    CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
    ...(process.platform === 'linux' ? { CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--no-sandbox' } : {}),
  } as Record<string, string>;
  delete env.PLAYWRIGHT_MCP_CLI_PATH;
  delete env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
  const stdioClientTransportOptions: import('@modelcontextprotocol/sdk/client/stdio.js').StdioServerParameters =
    {
      command: process.execPath,
      args: [cliPath],
      env,
      stderr: 'pipe',
    };
  const transport = new StdioClientTransport(stdioClientTransportOptions);
  const stderr = { text: '' };
  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderr.text += chunk.toString();
  });
  const clientOptions = { name: `playwright-console-probe-${attempt}`, version: '1.0.0' } as const;
  const client = new Client(clientOptions);
  let cleanupStarted = false;
  let unexpectedTransportClose = false;
  let controlPassed = false;
  let phase: ProbePhase = 'connect';
  let failure: unknown;
  try {
    await client.connect(transport);
    const previousOnClose = transport.onclose;
    transport.onclose = () => {
      if (!cleanupStarted) unexpectedTransportClose = true;
      previousOnClose?.();
    };
    phase = 'control-navigation';
    const callToolOptions = { url: `${fixtureUrl}/control` } as const;
    await callTool(client, 'browser_navigate', callToolOptions);
    phase = 'control-snapshot';
    await callTool(client, 'browser_snapshot');
    controlPassed = true;
    phase = 'console-navigation';
    const callToolOptions2 = { url: `${fixtureUrl}/console` } as const;
    await callTool(client, 'browser_navigate', callToolOptions2);
    phase = 'console-read';
    const callToolOptions3 = {
      level: 'debug',
      all: true,
    } as const;
    const consoleMessages = await callTool(client, 'browser_console_messages', callToolOptions3);
    const consoleText = consoleMessages.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
    for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
      const receiverActual = consoleText;
      const message4 = `console-probe-${method}`;
      expect(receiverActual).toContain(message4);
    }
    phase = 'post-console-call';
    await callTool(client, 'browser_snapshot');
  } catch (error) {
    failure = error;
  } finally {
    cleanupStarted = true;
    const callToolOptions4 = { name: 'browser_close', arguments: {} } as const;
    await client.callTool(callToolOptions4).catch(() => undefined);
    await client.close().catch(() => undefined);
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(runtimeRoot, rmSyncOptions);
  }
  if (!failure && unexpectedTransportClose) {
    failure = new Error('MCP transport closed unexpectedly');
  }
  const message = failure ? formatError(failure) : null;
  return {
    attempt,
    controlPassed,
    phase,
    success: failure === undefined,
    signature: failure
      ? (() => {
          const formatErrorResult = formatError(failure);
          return normalizeFailureSignature(formatErrorResult, unexpectedTransportClose);
        })()
      : null,
    stderr: stderr.text,
    message,
  };
}
function isConsolePhase(phase: ProbePhase): boolean {
  return phase === 'console-navigation' || phase === 'console-read' || phase === 'post-console-call';
}
function normalizeFailureSignature(message: string, unexpectedTransportClose: boolean): FailureSignature {
  if (/-32000|connection closed/i.test(message)) return 'mcp-connection-closed';
  if (unexpectedTransportClose) return 'transport-closed';
  return 'other';
}
async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<CallToolResult> {
  const callToolOptions5 = { name, arguments: args } as const;
  const result = (await client.callTool(callToolOptions5)) as CallToolResult;
  if (result.isError) {
    const text = result.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
    const message5 = `${name} returned an MCP error: ${text}`;
    throw new Error(message5);
  }
  return result;
}
async function startFixtureServer(): Promise<{
  url: string;
  close(): Promise<void>;
}> {
  const server = createServer((request, response) => {
    const writeHeadOptions = { 'content-type': 'text/html; charset=utf-8' } as const;
    response.writeHead(200, writeHeadOptions);
    const argumentValue = request.url === '/console' ? consoleFixtureHtml() : controlFixtureHtml();
    response.end(argumentValue);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server did not bind a TCP port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
function controlFixtureHtml(): string {
  return '<!doctype html><html><body><h1>Console control</h1></body></html>';
}
function consoleFixtureHtml(): string {
  const uRL2 = new URL('../fixtures/playwright-console/console.html', import.meta.url);
  return readFileSync(uRL2, 'utf8');
}
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
