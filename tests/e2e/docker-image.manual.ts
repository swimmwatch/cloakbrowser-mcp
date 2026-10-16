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
  dockerExecAsync,
  dockerImageTag,
  inspectDockerImage,
  startFakeUpstreamHttpDockerContainer,
  startHttpDockerContainer,
  stopDockerContainer,
  trackDockerContainer,
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
    const dockerDistributionCommandResult = createDockerDistributionCommand();
    await expectDistributionStdioBridge(dockerDistributionCommandResult);
  });
  it('accepts Playwright Extension mode without conflicting with Docker image defaults', async () => {
    const createDockerDistributionCommandOptions = { extensionMode: true } as const;
    const dockerDistributionCommandResult2 = createDockerDistributionCommand(
      createDockerDistributionCommandOptions,
    );
    await expectDistributionStdioBridge(dockerDistributionCommandResult2);
  });
  it('runs a headed stdio bridge under the documented restricted Docker runtime', async () => {
    const createDockerDistributionCommandOptions2 = {
      headless: false,
      restrictedRuntime: true,
    } as const;
    const command = createDockerDistributionCommand(createDockerDistributionCommandOptions2);
    const receiverActual = command.args;
    const values = [
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,nosuid,nodev,noexec,mode=1777',
      '/tmp/.X11-unix:rw,nosuid,nodev,noexec,mode=1777,uid=1000,gid=1000',
    ];
    const arrayContainingResult = expect.arrayContaining(values);
    expect(receiverActual).toEqual(arrayContainingResult);
    await expectDistributionStdioBridge(command);
  });
  it('remains compatible with an explicit external Docker init process', async () => {
    const createDockerDistributionCommandOptions3 = { dockerInit: true } as const;
    const command = createDockerDistributionCommand(createDockerDistributionCommandOptions3);
    expect(command.args).toContain('--init');
    await expectDistributionStdioBridge(command);
  });
  it('admits a headed stdio bridge only after the launcher creates its display', async () => {
    const createDockerDistributionCommandOptions4 = { headless: false } as const;
    const dockerDistributionCommandResult3 = createDockerDistributionCommand(
      createDockerDistributionCommandOptions4,
    );
    await expectDistributionStdioBridge(dockerDistributionCommandResult3);
  });
  it('uses Tini to launch the Docker lifecycle owner', () => {
    const image = inspectDockerImage();
    const receiver2Actual = image.Config?.Entrypoint;
    const values2: string[] = [
      '/usr/local/bin/tini',
      '-s',
      '--',
      'node',
      '/opt/cloakbrowser-mcp/dist/docker/launcher.js',
    ];
    expect(receiver2Actual).toEqual(values2);
    expect(image.Config?.Cmd).toBeFalsy();
  });
  it('declares bounded active Docker health checks', () => {
    const argumentValue = inspectDockerImage().Config?.Healthcheck;
    const receiver3Actual = argumentValue;
    const toEqualOptions: {
      Interval: number;
      Retries: number;
      StartPeriod: number;
      Test: string[];
      Timeout: number;
    } = {
      Interval: 2000000000,
      Retries: 2,
      StartPeriod: 2000000000,
      Test: ['CMD', 'node', '/opt/cloakbrowser-mcp/dist/docker/healthcheck.js'],
      Timeout: 3000000000,
    };
    expect(receiver3Actual).toEqual(toEqualOptions);
  });
  it('runs real default and explicit headless HTTP sessions without Xvfb', async () => {
    for (const headless of [undefined, true]) {
      const argumentValue2 = headless === undefined ? {} : { headless };
      const { containerName, url } = startHttpDockerContainer(argumentValue2);
      await waitForDockerHttp(url);
      const values3: string[] = ['sh', '-c', 'test -z "${DISPLAY:-}" && test ! -S /tmp/.X11-unix/X99'];
      const argumentValue3 = dockerExec(containerName, values3).status;
      expect(argumentValue3).toBe(0);
      const session = await initializeHttpSession(url);
      expect(session.status).toBe(200);
      const currentUrl2: string = url;
      const result3: string | null = session.headers.get('mcp-session-id');
      const expectHttpToolSuccessOptions = {
        url: 'data:text/html,<title>Docker headless HTTP</title><main>ready</main>',
      } as const;
      await expectHttpToolSuccess(currentUrl2, result3, 'browser_navigate', expectHttpToolSuccessOptions);
      const currentUrl4: string = url;
      const result5: string | null = session.headers.get('mcp-session-id');
      await expectHttpToolSuccess(currentUrl4, result5, 'browser_snapshot');
      const values4: string[] = ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99'];
      const argumentValue4 = dockerExec(containerName, values4).status;
      expect(argumentValue4).toBe(0);
      const currentUrl6: string = url;
      const result7: string | null = session.headers.get('mcp-session-id');
      await closeHttpSession(currentUrl6, result7);
    }
  });
  it('demand-starts and retains Xvfb only for effective headed HTTP sessions', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const values5: string[] = ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values5);
    const headless = await initializeHttpSession(url);
    expect(headless.status).toBe(200);
    const currentUrl7: string = url;
    const result8: string | null = headless.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl7, result8);
    const values6: string[] = ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values6);
    const headed = await initializeHttpSession(url, false);
    const headedSessionId = headed.headers.get('mcp-session-id');
    expect(headed.status).toBe(200);
    expect(headedSessionId).not.toBeNull();
    const values7: string[] = ['sh', '-c', 'test -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values7);
    await closeHttpSession(url, headedSessionId);
    const values8: string[] = ['sh', '-c', 'test -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values8);
    const values9: string[] = ['sh', '-c', 'test -S /tmp/.X11-unix/X99'];
    const argumentValue5 = dockerExecAllowFailure(containerName, values9).status;
    expect(argumentValue5).toBe(0);
  });
  it('rejects unauthorized headed initialization without starting Xvfb', async () => {
    const startHttpDockerContainerOptions = {
      authToken: 'docker-e2e-token',
      fakeUpstream: true,
    } as const;
    const { containerName, url } = startHttpDockerContainer(startHttpDockerContainerOptions);
    await waitForDockerHttp(url, 10000, 'Bearer docker-e2e-token');
    const response = await initializeHttpSession(url, false);
    expect(response.status).toBe(401);
    const values10: string[] = ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values10);
  });
  it('rejects a capacity-rejected headed initialization without starting Xvfb', async () => {
    const startHttpDockerContainerOptions2 = {
      fakeUpstream: true,
      sessionMax: 1,
    } as const;
    const { containerName, url } = startHttpDockerContainer(startHttpDockerContainerOptions2);
    await waitForDockerHttp(url);
    const headless = await initializeHttpSession(url, true);
    expect(headless.status).toBe(200);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(503);
    const values11: string[] = ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values11);
    const currentUrl8: string = url;
    const result9: string | null = headless.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl8, result9);
  });
  it('rejects an invalid headed runtime without starting Xvfb', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const response = await initializeHttpSession(url, false, '/proc/self/exe');
    expect(response.status).toBe(500);
    const values12: string[] = ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values12);
  });
  it('runs as non-root without exposing X11 over TCP', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const values13: string[] = ['id', '-u'];
    const trimResult = dockerExec(containerName, values13).stdout.trim();
    expect(trimResult).toBe('1000');
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    const values14: string[] = [
      'sh',
      '-c',
      'test "$(stat -c "%a:%u" /tmp/cloakbrowser-mcp-health.sock)" = "600:1000"',
    ];
    await waitForDockerExec(containerName, values14);
    const values15: string[] = ['sh', '-c', '! grep -qi ":1770" /proc/net/tcp /proc/net/tcp6'];
    const argumentValue6 = dockerExecAllowFailure(containerName, values15).status;
    expect(argumentValue6).toBe(0);
    const currentUrl9: string = url;
    const result10: string | null = headed.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl9, result10);
  });
  it('detects a stopped CLI event loop and recovers after it resumes', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    await waitForDockerHealth(containerName, 'healthy');
    const values16: string[] = ['sh', '-c', 'test ! -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values16);
    const values17: string[] = [
      'sh',
      '-c',
      'for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]opt/cloakbrowser-mcp/dist/cli.js"; then printf "%s" "${process##*/}"; exit 0; fi; done; exit 1',
    ];
    const cliPid = dockerExec(containerName, values17).stdout;
    expect(cliPid).toMatch(/^\d+$/u);
    const unhealthyStartedAt = Date.now();
    const values18: string[] = ['sh', '-c', `kill -STOP ${cliPid}`];
    dockerExec(containerName, values18);
    await waitForDockerHealth(containerName, 'unhealthy');
    const computedValue = Date.now() - unhealthyStartedAt;
    expect(computedValue).toBeLessThanOrEqual(8000);
    const healthyStartedAt = Date.now();
    const values19: string[] = ['sh', '-c', `kill -CONT ${cliPid}`];
    dockerExec(containerName, values19);
    await waitForDockerHealth(containerName, 'healthy');
    const computedValue2 = Date.now() - healthyStartedAt;
    expect(computedValue2).toBeLessThanOrEqual(8000);
  });
  it('detects an unresponsive retained Xvfb and recovers after it resumes', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    await waitForDockerHealth(containerName, 'healthy');
    const values20: string[] = [
      'sh',
      '-c',
      'for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]usr/bin/Xvfb"; then printf "%s" "${process##*/}"; exit 0; fi; done; exit 1',
    ];
    const xvfbPid = dockerExec(containerName, values20).stdout;
    expect(xvfbPid).toMatch(/^\d+$/u);
    const unhealthyStartedAt = Date.now();
    const values21: string[] = ['sh', '-c', `kill -STOP ${xvfbPid}`];
    dockerExec(containerName, values21);
    await waitForDockerHealth(containerName, 'unhealthy');
    const computedValue3 = Date.now() - unhealthyStartedAt;
    expect(computedValue3).toBeLessThanOrEqual(8000);
    const healthyStartedAt = Date.now();
    const values22: string[] = ['sh', '-c', `kill -CONT ${xvfbPid}`];
    dockerExec(containerName, values22);
    await waitForDockerHealth(containerName, 'healthy');
    const computedValue4 = Date.now() - healthyStartedAt;
    expect(computedValue4).toBeLessThanOrEqual(8000);
    const currentUrl10: string = url;
    const result11: string | null = headed.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl10, result11);
  });
  it('shares one Xvfb startup between concurrent headed HTTP sessions', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const values23: [Promise<Response>, Promise<Response>] = [
      initializeHttpSession(url, false, '/data/profiles/first'),
      initializeHttpSession(url, false, '/data/profiles/second'),
    ];
    const [first, second] = await Promise.all(values23);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const values24: string[] = [
      'sh',
      '-c',
      'count=0; for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]usr/bin/Xvfb"; then count=$((count + 1)); fi; done; test "$count" -eq 1',
    ];
    await waitForDockerExec(containerName, values24);
    const currentUrl11: string = url;
    const result12: string | null = first.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl11, result12);
    const currentUrl12: string = url;
    const result13: string | null = second.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl12, result13);
    const values25: string[] = ['sh', '-c', 'test -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values25);
  });
  it('keeps active Docker health responsive during concurrent headed MCP traffic', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    const values26: string[] = ['node', '/opt/cloakbrowser-mcp/dist/docker/healthcheck.js'];
    const dockerExecAsyncResult: Promise<import('./dockerHarness.js').DockerCommandResult> = dockerExecAsync(
      containerName,
      values26,
    );
    const currentUrl13: string = url;
    const result14: string | null = headed.headers.get('mcp-session-id');
    const expectHttpToolSuccessOptions2 = {
      url: 'https://example.test/parallel-1',
    } as const;
    const expectHttpToolSuccessResult: Promise<void> = expectHttpToolSuccess(
      currentUrl13,
      result14,
      'browser_navigate',
      expectHttpToolSuccessOptions2,
    );
    const currentUrl14: string = url;
    const result15: string | null = headed.headers.get('mcp-session-id');
    const values27: [
      Promise<import('./dockerHarness.js').DockerCommandResult>,
      Promise<void>,
      Promise<void>,
    ] = [
      dockerExecAsyncResult,
      expectHttpToolSuccessResult,
      expectHttpToolSuccess(currentUrl14, result15, 'browser_snapshot'),
    ];
    const [health] = await Promise.all(values27);
    expect(health.status).toBe(0);
    const currentUrl15: string = url;
    const result16: string | null = headed.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl15, result16);
  });
  it('launches a real headed CloakBrowser browser over streamable HTTP', async () => {
    const startHttpDockerContainerOptions3 = { headless: false } as const;
    const { url } = startHttpDockerContainer(startHttpDockerContainerOptions3);
    await waitForDockerHttp(url);
    const uRL = new URL(url);
    const transport = new StreamableHTTPClientTransport(uRL);
    const clientOptions = { name: 'docker-headed-http-test', version: '1.0.0' } as const;
    const client = new Client(clientOptions);
    try {
      await client.connect(transport);
      const expectToolSuccessOptions = {
        url: 'data:text/html,<title>Docker headed HTTP</title><main>ready</main>',
      } as const;
      await expectToolSuccess(client, 'browser_navigate', expectToolSuccessOptions);
      await expectToolSuccess(client, 'browser_snapshot');
    } finally {
      const callToolOptions = { name: 'browser_close', arguments: {} } as const;
      await client.callTool(callToolOptions).catch(() => undefined);
      await client.close().catch(() => undefined);
    }
  });
  it('keeps concurrent real headed and headless HTTP session profiles isolated', async () => {
    const startHttpDockerContainerOptions4 = { headless: false } as const;
    const { containerName, url } = startHttpDockerContainer(startHttpDockerContainerOptions4);
    await waitForDockerHttp(url);
    const values28: [Promise<Response>, Promise<Response>, Promise<Response>] = [
      initializeHttpSession(url, false, '/data/profiles/first'),
      initializeHttpSession(url, false, '/data/profiles/second'),
      initializeHttpSession(url, true, '/data/profiles/headless'),
    ];
    const [first, second, headless] = await Promise.all(values28);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(headless.status).toBe(200);
    const currentUrl16: string = url;
    const result17: string | null = first.headers.get('mcp-session-id');
    const expectHttpToolSuccessOptions3 = {
      url: 'data:text/html,<title>first session</title><input value=first>',
    } as const;
    await expectHttpToolSuccess(currentUrl16, result17, 'browser_navigate', expectHttpToolSuccessOptions3);
    const currentUrl17: string = url;
    const result18: string | null = second.headers.get('mcp-session-id');
    const expectHttpToolSuccessOptions4 = {
      url: 'data:text/html,<title>second session</title><input value=second>',
    } as const;
    await expectHttpToolSuccess(currentUrl17, result18, 'browser_navigate', expectHttpToolSuccessOptions4);
    const currentUrl18: string = url;
    const result19: string | null = headless.headers.get('mcp-session-id');
    const expectHttpToolSuccessOptions5 = {
      url: 'data:text/html,<title>headless session</title><input value=headless>',
    } as const;
    await expectHttpToolSuccess(currentUrl18, result19, 'browser_navigate', expectHttpToolSuccessOptions5);
    const currentUrl19: string = url;
    const result20: string | null = first.headers.get('mcp-session-id');
    await expectHttpToolSuccess(currentUrl19, result20, 'browser_take_screenshot');
    const currentUrl20: string = url;
    const result21: string | null = second.headers.get('mcp-session-id');
    await expectHttpToolSuccess(currentUrl20, result21, 'browser_take_screenshot');
    const currentUrl21: string = url;
    const result22: string | null = headless.headers.get('mcp-session-id');
    await expectHttpToolSuccess(currentUrl21, result22, 'browser_take_screenshot');
    const values29: string[] = [
      'sh',
      '-c',
      'test -d /data/profiles/first && test -d /data/profiles/second && test -d /data/profiles/headless',
    ];
    await waitForDockerExec(containerName, values29);
    const currentUrl22: string = url;
    const result23: string | null = first.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl22, result23);
    const currentUrl23: string = url;
    const result24: string | null = second.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl23, result24);
    const currentUrl24: string = url;
    const result25: string | null = headless.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl24, result25);
  });
  it('keeps display startup available after one waiting HTTP client cancels', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const values30: string[] = [
      'sh',
      '-c',
      'cp /usr/bin/Xvfb /tmp/Xvfb.real && printf "#!/bin/sh\\ntouch /tmp/xvfb-started\\nsleep 2\\nexec /tmp/Xvfb.real "\\$@"\\n" > /usr/bin/Xvfb && chmod 755 /usr/bin/Xvfb',
    ];
    dockerExecAsRoot(containerName, values30);
    const controller = new AbortController();
    const cancelled = initializeHttpSession(url, false, '/data/profiles/cancelled', controller.signal);
    const cancellation = cancelled.catch((error: unknown) => error);
    const values31: string[] = ['sh', '-c', 'test -f /tmp/xvfb-started'];
    await waitForDockerExec(containerName, values31);
    controller.abort();
    const admitted = await initializeHttpSession(url, false, '/data/profiles/admitted');
    await expect(cancellation).resolves.toBeInstanceOf(Error);
    expect(admitted.status).toBe(200);
    const values32: string[] = [
      'sh',
      '-c',
      'count=0; for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]Xvfb"; then count=$((count + 1)); fi; done; test "$count" -eq 1',
    ];
    await waitForDockerExec(containerName, values32);
    const currentUrl25: string = url;
    const result26: string | null = admitted.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl25, result26);
  });
  it('keeps another headed session working when one session closes', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const first = await initializeHttpSession(url, false, '/data/profiles/first');
    const second = await initializeHttpSession(url, false, '/data/profiles/second');
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const currentUrl26: string = url;
    const result27: string | null = first.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl26, result27);
    const currentUrl27: string = url;
    const result28: string | null = second.headers.get('mcp-session-id');
    const expectHttpToolSuccessOptions6 = {
      url: 'https://example.test/remaining-session',
    } as const;
    await expectHttpToolSuccess(currentUrl27, result28, 'browser_navigate', expectHttpToolSuccessOptions6);
    const values33: string[] = ['sh', '-c', 'test -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values33);
    const currentUrl28: string = url;
    const result29: string | null = second.headers.get('mcp-session-id');
    await closeHttpSession(currentUrl28, result29);
  });
  it('stops cleanly while a headed HTTP session is active', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    const values34: string[] = ['sh', '-c', 'test -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values34);
    const argumentValue7 = stopDockerContainer(containerName).status;
    expect(argumentValue7).toBe(0);
    const values35: string[] = ['true'];
    const argumentValue8 = dockerExecAllowFailure(containerName, values35).status;
    expect(argumentValue8).not.toBe(0);
  });
  it('stops cleanly while Xvfb startup is still pending', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const values36: string[] = [
      'sh',
      '-c',
      'cp /usr/bin/Xvfb /tmp/Xvfb.real && printf "#!/bin/sh\\ntouch /tmp/xvfb-started\\nsleep 30\\nexec /tmp/Xvfb.real "$@"\\n" > /usr/bin/Xvfb && chmod 755 /usr/bin/Xvfb',
    ];
    dockerExecAsRoot(containerName, values36);
    const initializing = initializeHttpSession(url, false);
    const values37: string[] = ['sh', '-c', 'test -f /tmp/xvfb-started'];
    await waitForDockerExec(containerName, values37);
    const argumentValue9 = stopDockerContainer(containerName).status;
    expect(argumentValue9).toBe(0);
    await expect(initializing).rejects.toBeInstanceOf(Error);
  });
  it('exits when CLI and Xvfb terminate concurrently', async () => {
    const { containerName, url } = startFakeUpstreamHttpDockerContainer();
    await waitForDockerHttp(url);
    const headed = await initializeHttpSession(url, false);
    expect(headed.status).toBe(200);
    const values38: string[] = ['sh', '-c', 'test -S /tmp/.X11-unix/X99'];
    await waitForDockerExec(containerName, values38);
    const values39: string[] = [
      'sh',
      '-c',
      'for process in /proc/[0-9]*; do [ -r "$process/cmdline" ] || continue; if tr "\\000" " " < "$process/cmdline" | grep -q "[/]opt/cloakbrowser-mcp/dist/cli.js\\|[/]usr/bin/Xvfb"; then kill -TERM "${process##*/}"; fi; done',
    ];
    dockerExec(containerName, values39);
    await waitForDockerExit(containerName);
  });
  it('launches a real headed CloakBrowser browser over stdio', async () => {
    const fixture = await startFixtureServer();
    const stdioClientTransportOptions: import('@modelcontextprotocol/sdk/client/stdio.js').StdioServerParameters =
      {
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
      };
    const transport = new StdioClientTransport(stdioClientTransportOptions);
    const clientOptions2 = { name: 'docker-headed-real-browser-test', version: '1.0.0' } as const;
    const client = new Client(clientOptions2);
    try {
      await client.connect(transport);
      const expectToolSuccessOptions2 = { url: fixture.url } as const;
      await expectToolSuccess(client, 'browser_navigate', expectToolSuccessOptions2);
      await expectToolSuccess(client, 'browser_snapshot');
    } finally {
      const callToolOptions2 = { name: 'browser_close', arguments: {} } as const;
      await client.callTool(callToolOptions2).catch(() => undefined);
      await client.close().catch(() => undefined);
      await fixture.close();
    }
  });
});
it('launches real default and explicit headless CloakBrowser browsers over stdio without Xvfb', async () => {
  for (const headless of [undefined, true]) {
    const containerName = `cloakbrowser-mcp-headless-stdio-e2e-${process.pid}-${crypto.randomUUID()}`;
    trackDockerContainer(containerName);
    const stdioClientTransportOptions2: import('@modelcontextprotocol/sdk/client/stdio.js').StdioServerParameters =
      {
        command: 'docker',
        args: [
          'run',
          '--rm',
          '-i',
          '--name',
          containerName,
          '--tmpfs',
          '/data:rw,nosuid,nodev,mode=1777',
          '--env',
          'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
          ...(headless === undefined ? [] : ['--env', 'PLAYWRIGHT_MCP_HEADLESS=true']),
          dockerImageTag,
        ],
        stderr: 'pipe',
      };
    const transport = new StdioClientTransport(stdioClientTransportOptions2);
    const clientOptions3 = { name: 'docker-headless-real-browser-test', version: '1.0.0' } as const;
    const client = new Client(clientOptions3);
    try {
      await client.connect(transport);
      const values40: string[] = ['sh', '-c', 'test -z "${DISPLAY:-}" && test ! -S /tmp/.X11-unix/X99'];
      const argumentValue10 = dockerExec(containerName, values40).status;
      expect(argumentValue10).toBe(0);
      const expectToolSuccessOptions3 = {
        url: 'data:text/html,<title>Docker headless stdio</title><main>ready</main>',
      } as const;
      await expectToolSuccess(client, 'browser_navigate', expectToolSuccessOptions3);
      await expectToolSuccess(client, 'browser_snapshot');
    } finally {
      const callToolOptions3 = { name: 'browser_close', arguments: {} } as const;
      await client.callTool(callToolOptions3).catch(() => undefined);
      await client.close().catch(() => undefined);
    }
  }
});
async function initializeHttpSession(
  url: string,
  headless?: boolean,
  userDataDir?: string,
  signal?: AbortSignal,
): Promise<Response> {
  const propertyValue = 'POST';
  const currentSignal = signal;
  const options = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  } as const;
  const stringifyOptions = {
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
  } as const;
  const serializedValue = JSON.stringify(stringifyOptions);
  const fetchOptions = {
    method: propertyValue,
    signal: currentSignal,
    headers: options,
    body: serializedValue,
  } as const;
  return fetch(url, fetchOptions);
}
async function closeHttpSession(url: string, sessionId: string | null): Promise<void> {
  expect(sessionId).not.toBeNull();
  const fetchOptions2 = {
    method: 'DELETE',
    headers: sessionId === null ? {} : { 'mcp-session-id': sessionId },
  } as const;
  const response = await fetch(url, fetchOptions2);
  expect(response.status).toBe(200);
}
async function expectHttpToolSuccess(
  url: string,
  sessionId: string | null,
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<void> {
  expect(sessionId).not.toBeNull();
  const propertyValue2 = 'POST';
  const options2 = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    ...(sessionId === null ? {} : { 'mcp-session-id': sessionId }),
  } as const;
  const stringifyOptions2 = {
    jsonrpc: '2.0',
    id: crypto.randomUUID(),
    method: 'tools/call',
    params: { name, arguments: arguments_ },
  } as const;
  const serializedValue2 = JSON.stringify(stringifyOptions2);
  const fetchOptions3 = {
    method: propertyValue2,
    headers: options2,
    body: serializedValue2,
  } as const;
  const response = await fetch(url, fetchOptions3);
  expect(response.status).toBe(200);
}
async function expectToolSuccess(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<void> {
  const callToolOptions4 = { name, arguments: args } as const;
  const result = (await client.callTool(callToolOptions4)) as CallToolResult;
  if (result.isError === true) {
    const serializedValue3 = JSON.stringify(result.content);
    throw new Error(serializedValue3);
  }
}
async function startFixtureServer(): Promise<{
  close(): Promise<void>;
  url: string;
}> {
  const server = createServer((_request, response) => {
    const writeHeadOptions = { 'content-type': 'text/html; charset=utf-8' } as const;
    response.writeHead(200, writeHeadOptions);
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
