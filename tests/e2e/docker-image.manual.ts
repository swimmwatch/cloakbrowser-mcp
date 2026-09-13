import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupDistributionE2e,
  createDockerDistributionCommand,
  expectDistributionStdioBridge,
} from './distributionHarness.js';
import {
  cleanupDockerE2e,
  dockerExec,
  dockerExecAllowFailure,
  dockerExecAsRoot,
  dockerImageTag,
  inspectDockerImage,
  startFakeUpstreamHttpDockerContainer,
  startHttpDockerContainer,
  stopDockerContainer,
  waitForDockerExec,
  waitForDockerExit,
  waitForDockerHealth,
  waitForDockerHttp,
} from './dockerHarness.js';

afterEach(() => {
  cleanupDistributionE2e();
  cleanupDockerE2e();
});

describe('Docker image distribution E2E', () => {
  it('runs the Docker image as a stdio MCP bridge and forwards every fake upstream tool', async () => {
    await expectDistributionStdioBridge(createDockerDistributionCommand());
  });

  it('runs a headed stdio bridge under the documented restricted Docker runtime', async () => {
    const command = createDockerDistributionCommand({
      headless: false,
      restrictedRuntime: true,
    });

    expect(command.args).toEqual(
      expect.arrayContaining([
        '--cap-drop=ALL',
        '--security-opt=no-new-privileges',
        '--read-only',
        '--tmpfs',
        '/tmp:rw,nosuid,nodev,noexec,mode=1777',
        '/tmp/.X11-unix:rw,nosuid,nodev,noexec,mode=1777,uid=1000,gid=1000',
      ]),
    );
    await expectDistributionStdioBridge(command);
  });

  it('remains compatible with an explicit external Docker init process', async () => {
    const command = createDockerDistributionCommand({ dockerInit: true });

    expect(command.args).toContain('--init');
    await expectDistributionStdioBridge(command);
  });

  it('admits a headed stdio bridge only after the launcher creates its display', async () => {
    await expectDistributionStdioBridge(createDockerDistributionCommand({ headless: false }));
  });

  it('uses Tini to launch the Docker lifecycle owner', () => {
    const image = inspectDockerImage();
    expect(image.Config?.Entrypoint).toEqual([
      '/usr/local/bin/tini',
      '-s',
      '--',
      'node',
      '/opt/cloakbrowser-mcp/dist/docker/launcher.js',
    ]);
    expect(image.Config?.Cmd).toBeFalsy();
  });

  it('declares bounded active Docker health checks', () => {
    expect(inspectDockerImage().Config?.Healthcheck).toEqual({
      Interval: 2_000_000_000,
      Retries: 2,
      StartPeriod: 2_000_000_000,
      Test: ['CMD', 'node', '/opt/cloakbrowser-mcp/dist/docker/healthcheck.js'],
      Timeout: 1_000_000_000,
    });
  });

  it('demand-starts and retains Xvfb only for effective headed HTTP sessions', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    await waitForDockerExec(containerName, ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99']);

    const headless = await initializeHttpSession(url);
    expect(headless.status).toBe(200);
    await closeHttpSession(url, headless.headers.get('mcp-session-id'));
    await waitForDockerExec(containerName, ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99']);

    const headed = await initializeHttpSession(url, false);
    const headedSessionId = headed.headers.get('mcp-session-id');
    expect(headed.status).toBe(200);
    expect(headedSessionId).not.toBeNull();
    await waitForDockerExec(containerName, ['sh', '-c', 'test -S /tmp/.X11-unix/X99']);

    await closeHttpSession(url, headedSessionId);
    await waitForDockerExec(containerName, ['sh', '-c', 'test -S /tmp/.X11-unix/X99']);

    expect(dockerExecAllowFailure(containerName, ['sh', '-c', 'test -S /tmp/.X11-unix/X99']).status).toBe(0);
  });

  it('rejects unauthorized headed initialization without starting Xvfb', async () => {
    const { containerName, url } = startHttpDockerContainer({
      authToken: 'docker-e2e-token',
      fakeUpstream: true,
    });
    await waitForDockerHttp(url, 10_000, 'Bearer docker-e2e-token');

    const response = await initializeHttpSession(url, false);
    expect(response.status).toBe(401);
    await waitForDockerExec(containerName, ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99']);
  });

  it('rejects a capacity-rejected headed initialization without starting Xvfb', async () => {
    const { containerName, url } = startHttpDockerContainer({
      fakeUpstream: true,
      sessionMax: 1,
    });
    await waitForDockerHttp(url);

    const headless = await initializeHttpSession(url, true);
    expect(headless.status).toBe(200);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(503);
    await waitForDockerExec(containerName, ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99']);

    await closeHttpSession(url, headless.headers.get('mcp-session-id'));
  });

  it('runs as non-root without exposing X11 over TCP', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    expect(dockerExec(containerName, ['id', '-u']).stdout.trim()).toBe('1000');

    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    await waitForDockerExec(containerName, [
      'sh',
      '-c',
      'test "$(stat -c "%a:%u" /tmp/cloakbrowser-mcp-health.sock)" = "600:1000"',
    ]);
    expect(
      dockerExecAllowFailure(containerName, ['sh', '-c', '! grep -qi ":1770" /proc/net/tcp /proc/net/tcp6'])
        .status,
    ).toBe(0);

    await closeHttpSession(url, headed.headers.get('mcp-session-id'));
  });

  it('detects a stopped CLI event loop and recovers after it resumes', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    await waitForDockerHealth(containerName, 'healthy');
    await waitForDockerExec(containerName, ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99']);

    const cliPid = dockerExec(containerName, [
      'sh',
      '-c',
      'for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]opt/cloakbrowser-mcp/dist/cli.js"; then printf "%s" "${process##*/}"; exit 0; fi; done; exit 1',
    ]).stdout;
    expect(cliPid).toMatch(/^\d+$/u);

    const unhealthyStartedAt = Date.now();
    dockerExec(containerName, ['sh', '-c', `kill -STOP ${cliPid}`]);
    await waitForDockerHealth(containerName, 'unhealthy');
    expect(Date.now() - unhealthyStartedAt).toBeLessThanOrEqual(8_000);
    const healthyStartedAt = Date.now();
    dockerExec(containerName, ['sh', '-c', `kill -CONT ${cliPid}`]);
    await waitForDockerHealth(containerName, 'healthy');
    expect(Date.now() - healthyStartedAt).toBeLessThanOrEqual(8_000);
  });

  it('detects an unresponsive retained Xvfb and recovers after it resumes', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    await waitForDockerHealth(containerName, 'healthy');

    const xvfbPid = dockerExec(containerName, [
      'sh',
      '-c',
      'for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]usr/bin/Xvfb"; then printf "%s" "${process##*/}"; exit 0; fi; done; exit 1',
    ]).stdout;
    expect(xvfbPid).toMatch(/^\d+$/u);

    const unhealthyStartedAt = Date.now();
    dockerExec(containerName, ['sh', '-c', `kill -STOP ${xvfbPid}`]);
    await waitForDockerHealth(containerName, 'unhealthy');
    expect(Date.now() - unhealthyStartedAt).toBeLessThanOrEqual(8_000);
    const healthyStartedAt = Date.now();
    dockerExec(containerName, ['sh', '-c', `kill -CONT ${xvfbPid}`]);
    await waitForDockerHealth(containerName, 'healthy');
    expect(Date.now() - healthyStartedAt).toBeLessThanOrEqual(8_000);
    await closeHttpSession(url, headed.headers.get('mcp-session-id'));
  });

  it('shares one Xvfb startup between concurrent headed HTTP sessions', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const [first, second] = await Promise.all([
      initializeHttpSession(url, false, '/data/profiles/first'),
      initializeHttpSession(url, false, '/data/profiles/second'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await waitForDockerExec(containerName, [
      'sh',
      '-c',
      'count=0; for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]usr/bin/Xvfb"; then count=$((count + 1)); fi; done; test "$count" -eq 1',
    ]);

    await closeHttpSession(url, first.headers.get('mcp-session-id'));
    await closeHttpSession(url, second.headers.get('mcp-session-id'));
    await waitForDockerExec(containerName, ['sh', '-c', 'test -S /tmp/.X11-unix/X99']);
  });

  it('launches a real headed CloakBrowser browser over streamable HTTP', async () => {
    const { url } = startHttpDockerContainer({ headless: false });
    await waitForDockerHttp(url);
    const transport = new StreamableHTTPClientTransport(new URL(url));
    const client = new Client({ name: 'docker-headed-http-test', version: '1.0.0' });

    try {
      await client.connect(transport);
      await expectToolSuccess(client, 'browser_navigate', {
        url: 'data:text/html,<title>Docker headed HTTP</title><main>ready</main>',
      });
      await expectToolSuccess(client, 'browser_snapshot');
    } finally {
      await client.callTool({ name: 'browser_close', arguments: {} }).catch(() => undefined);
      await client.close().catch(() => undefined);
    }
  });

  it('keeps real headed HTTP session profiles isolated', async () => {
    const { containerName, url } = startHttpDockerContainer({ headless: false });
    await waitForDockerHttp(url);
    const first = await initializeHttpSession(url, false, '/data/profiles/first');
    const second = await initializeHttpSession(url, false, '/data/profiles/second');
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    await expectHttpToolSuccess(url, first.headers.get('mcp-session-id'), 'browser_navigate', {
      url: 'data:text/html,<title>first session</title><input value=first>',
    });
    await expectHttpToolSuccess(url, second.headers.get('mcp-session-id'), 'browser_navigate', {
      url: 'data:text/html,<title>second session</title><input value=second>',
    });
    await expectHttpToolSuccess(url, first.headers.get('mcp-session-id'), 'browser_take_screenshot');
    await expectHttpToolSuccess(url, second.headers.get('mcp-session-id'), 'browser_take_screenshot');
    await waitForDockerExec(containerName, [
      'sh',
      '-c',
      'test -d /data/profiles/first && test -d /data/profiles/second',
    ]);

    await closeHttpSession(url, first.headers.get('mcp-session-id'));
    await closeHttpSession(url, second.headers.get('mcp-session-id'));
  });

  it('keeps another headed session working when one session closes', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const first = await initializeHttpSession(url, false, '/data/profiles/first');
    const second = await initializeHttpSession(url, false, '/data/profiles/second');
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    await closeHttpSession(url, first.headers.get('mcp-session-id'));
    await expectHttpToolSuccess(url, second.headers.get('mcp-session-id'), 'browser_navigate', {
      url: 'https://example.test/remaining-session',
    });
    await waitForDockerExec(containerName, ['sh', '-c', 'test -S /tmp/.X11-unix/X99']);

    await closeHttpSession(url, second.headers.get('mcp-session-id'));
  });

  it('stops cleanly while a headed HTTP session is active', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    await waitForDockerExec(containerName, ['sh', '-c', 'test -S /tmp/.X11-unix/X99']);

    expect(stopDockerContainer(containerName).status).toBe(0);
    expect(dockerExecAllowFailure(containerName, ['true']).status).not.toBe(0);
  });

  it('stops cleanly while Xvfb startup is still pending', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    dockerExecAsRoot(containerName, [
      'sh',
      '-c',
      'cp /usr/bin/Xvfb /tmp/Xvfb.real && printf "#!/bin/sh\\ntouch /tmp/xvfb-started\\nsleep 30\\nexec /tmp/Xvfb.real "$@"\\n" > /usr/bin/Xvfb && chmod 755 /usr/bin/Xvfb',
    ]);

    const initializing = initializeHttpSession(url, false);
    await waitForDockerExec(containerName, ['sh', '-c', 'test -f /tmp/xvfb-started']);
    expect(stopDockerContainer(containerName).status).toBe(0);
    await expect(initializing).rejects.toBeInstanceOf(Error);
  });

  it('exits when CLI and Xvfb terminate concurrently', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    await waitForDockerExec(containerName, ['sh', '-c', 'test -S /tmp/.X11-unix/X99']);

    dockerExec(containerName, [
      'sh',
      '-c',
      'for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]opt/cloakbrowser-mcp/dist/cli.js\\|[/]usr/bin/Xvfb"; then kill -TERM "${process##*/}"; fi; done',
    ]);
    await waitForDockerExit(containerName);
  });

  it('launches a real headed CloakBrowser browser over stdio', async () => {
    const fixture = await startFixtureServer();
    const transport = new StdioClientTransport({
      command: 'docker',
      args: [
        'run',
        '--rm',
        '-i',
        '--network',
        'host',
        '--tmpfs',
        '/data:rw,nosuid,nodev,mode=1777',
        '--env',
        'PLAYWRIGHT_MCP_HEADLESS=false',
        '--env',
        'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
        dockerImageTag,
      ],
      stderr: 'pipe',
    });
    const client = new Client({ name: 'docker-headed-real-browser-test', version: '1.0.0' });

    try {
      await client.connect(transport);
      await expectToolSuccess(client, 'browser_navigate', { url: fixture.url });
      await expectToolSuccess(client, 'browser_snapshot');
    } finally {
      await client.callTool({ name: 'browser_close', arguments: {} }).catch(() => undefined);
      await client.close().catch(() => undefined);
      await fixture.close();
    }
  });
});

async function initializeHttpSession(
  url: string,
  headless?: boolean,
  userDataDir?: string,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'docker-headed-mode-test', version: '1.0.0' },
        ...(headless === undefined
          ? {}
          : {
              _meta: {
                'io.github.swimmwatch/cloakbrowser-mcp': { headless, userDataDir },
              },
            }),
      },
    }),
  });
}

async function closeHttpSession(url: string, sessionId: string | null): Promise<void> {
  expect(sessionId).not.toBeNull();
  const response = await fetch(url, {
    method: 'DELETE',
    headers: sessionId === null ? {} : { 'mcp-session-id': sessionId },
  });
  expect(response.status).toBe(200);
}

async function expectHttpToolSuccess(
  url: string,
  sessionId: string | null,
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<void> {
  expect(sessionId).not.toBeNull();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(sessionId === null ? {} : { 'mcp-session-id': sessionId }),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name, arguments: arguments_ },
    }),
  });
  expect(response.status).toBe(200);
}

async function expectToolSuccess(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<void> {
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  if (result.isError === true) throw new Error(JSON.stringify(result.content));
}

async function startFixtureServer(): Promise<{ close(): Promise<void>; url: string }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><title>Docker headed mode</title><main>ready</main>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('Expected fixture TCP address');
  return {
    close: async () => new Promise<void>((resolve) => server.close(() => resolve())),
    url: `http://127.0.0.1:${String(address.port)}`,
  };
}
