import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

const cliPath = fileURLToPath(new URL('../../dist/cli.js', import.meta.url));

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
        attempts.push(await runConsoleProbe(fixture.url, attempt));
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

    throw new Error(`${classification}: ${JSON.stringify(attempts, null, 2)}`);
  });
});

async function runConsoleProbe(fixtureUrl: string, attempt: number): Promise<ConsoleProbeAttempt> {
  const runtimeRoot = mkdtempSync(path.join(tmpdir(), `cloakbrowser-console-${attempt}-`));
  const env = {
    ...process.env,
    PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
    PLAYWRIGHT_MCP_HEADLESS: 'true',
    PLAYWRIGHT_MCP_ISOLATED: 'true',
    PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(runtimeRoot, 'output'),
    CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
    ...(process.platform === 'linux' ? { CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--no-sandbox' } : {}),
  } as Record<string, string>;
  delete env.PLAYWRIGHT_MCP_CLI_PATH;
  delete env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cliPath],
    env,
    stderr: 'pipe',
  });
  const stderr = { text: '' };
  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderr.text += chunk.toString();
  });
  const client = new Client({ name: `playwright-console-probe-${attempt}`, version: '1.0.0' });
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
    await callTool(client, 'browser_navigate', { url: `${fixtureUrl}/control` });
    phase = 'control-snapshot';
    await callTool(client, 'browser_snapshot');
    controlPassed = true;

    phase = 'console-navigation';
    await callTool(client, 'browser_navigate', { url: `${fixtureUrl}/console` });
    phase = 'console-read';
    const consoleMessages = await callTool(client, 'browser_console_messages', {
      level: 'debug',
      all: true,
    });
    const consoleText = consoleMessages.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
      expect(consoleText).toContain(`console-probe-${method}`);
    }

    phase = 'post-console-call';
    await callTool(client, 'browser_snapshot');
  } catch (error) {
    failure = error;
  } finally {
    cleanupStarted = true;
    await client.callTool({ name: 'browser_close', arguments: {} }).catch(() => undefined);
    await client.close().catch(() => undefined);
    rmSync(runtimeRoot, { recursive: true, force: true });
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
    signature: failure ? normalizeFailureSignature(formatError(failure), unexpectedTransportClose) : null,
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
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  if (result.isError) {
    const text = result.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
    throw new Error(`${name} returned an MCP error: ${text}`);
  }
  return result;
}

async function startFixtureServer(): Promise<{ url: string; close(): Promise<void> }> {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(request.url === '/console' ? consoleFixtureHtml() : controlFixtureHtml());
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
  return `<!doctype html>
<html>
  <body>
    <h1>Console probe</h1>
    <script>
      console.log('console-probe-log');
      console.warn('console-probe-warn');
      console.error('console-probe-error');
      console.info('console-probe-info');
      console.debug('console-probe-debug');
    </script>
  </body>
</html>`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
