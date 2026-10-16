import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const dockerImageTag = process.env.CLOAKBROWSER_MCP_DOCKER_IMAGE ?? 'cloakbrowser-mcp:dev';
const uRL = new URL('../..', import.meta.url);
const repoRoot = fileURLToPath(uRL);
const fakeUpstreamContainerDir = '/opt/cloakbrowser-mcp/tests/fixtures';
const fakeUpstreamContainerPath = `${fakeUpstreamContainerDir}/fake-upstream-mcp.mjs`;
const fakeUpstreamFixtureDir = path.join(repoRoot, 'tests', 'fixtures');
const containerNames: string[] = [];
export interface DockerCommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}
export function cleanupDockerE2e(): void {
  for (const containerName of containerNames.splice(0)) {
    const values: string[] = ['rm', '--force', containerName];
    const runDockerOptions = { allowFailure: true } as const;
    runDocker(values, runDockerOptions);
  }
}
export function trackDockerContainer(containerName: string): void {
  containerNames.push(containerName);
}
export function dockerExec(containerName: string, args: string[]): DockerCommandResult {
  const values2: string[] = ['exec', containerName, ...args];
  return runDocker(values2);
}
export async function dockerExecAsync(containerName: string, args: string[]): Promise<DockerCommandResult> {
  const values3: string[] = ['exec', containerName, ...args];
  return await runDockerAsync(values3);
}
export function dockerExecAllowFailure(containerName: string, args: string[]): DockerCommandResult {
  const values4: string[] = ['exec', containerName, ...args];
  const runDockerOptions2 = { allowFailure: true } as const;
  return runDocker(values4, runDockerOptions2);
}
export function dockerExecAsRoot(containerName: string, args: string[]): DockerCommandResult {
  const values5: string[] = ['exec', '--user', '0', containerName, ...args];
  return runDocker(values5);
}
export function dockerLogs(containerName: string): DockerCommandResult {
  const values6: string[] = ['logs', containerName];
  const runDockerOptions3 = { allowFailure: true } as const;
  return runDocker(values6, runDockerOptions3);
}
export function stopDockerContainer(containerName: string): DockerCommandResult {
  const values7: string[] = ['stop', '--time', '10', containerName];
  return runDocker(values7);
}
export function dockerHealthStatus(containerName: string): string {
  const values8: string[] = [
    'inspect',
    '--format',
    '{{if .State.Health}}{{.State.Health.Status}}{{end}}',
    containerName,
  ];
  return runDocker(values8).stdout.trim();
}
export function inspectDockerImage(): {
  Config?: {
    Cmd?: string[];
    Entrypoint?: string[];
    Healthcheck?: {
      Interval?: number;
      Retries?: number;
      StartPeriod?: number;
      Test?: string[];
      Timeout?: number;
    };
  };
} {
  const values9: string[] = ['image', 'inspect', dockerImageTag];
  const argumentValue = runDocker(values9).stdout;
  const [image] = JSON.parse(argumentValue) as Array<{
    Config?: {
      Cmd?: string[];
      Entrypoint?: string[];
      Healthcheck?: {
        Interval?: number;
        Retries?: number;
        StartPeriod?: number;
        Test?: string[];
        Timeout?: number;
      };
    };
  }>;
  if (!image) {
    const message = `Docker image inspection returned no image: ${dockerImageTag}`;
    throw new Error(message);
  }
  return image;
}
export function startFakeUpstreamDockerContainer(): string {
  const containerName = `cloakbrowser-mcp-e2e-${process.pid}-${Date.now()}`;
  containerNames.push(containerName);
  const values10: string[] = [
    'run',
    '--detach',
    '--rm',
    '--name',
    containerName,
    '--mount',
    `type=bind,source=${fakeUpstreamFixtureDir},target=${fakeUpstreamContainerDir},readonly`,
    '--tmpfs',
    '/data:rw,nosuid,nodev,mode=1777',
    '--env',
    `PLAYWRIGHT_MCP_CLI_PATH=${fakeUpstreamContainerPath}`,
    '--env',
    'PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright',
    '--env',
    'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
    '--env',
    'PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default',
    '--env',
    'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=false',
    dockerImageTag,
  ];
  runDocker(values10);
  return containerName;
}
export function startFakeUpstreamHttpDockerContainer(): {
  containerName: string;
  url: string;
} {
  const startHttpDockerContainerOptions = { fakeUpstream: true } as const;
  return startHttpDockerContainer(startHttpDockerContainerOptions);
}
export function startHttpDockerContainer(
  options: {
    authToken?: string;
    browserEngine?: 'cloak' | 'playwright';
    cdp?: {
      enabled: boolean;
      port: number;
    };
    fakeUpstream?: boolean;
    headless?: boolean;
    sessionMax?: number;
  } = {},
): {
  containerName: string;
  url: string;
} {
  const containerName = `cloakbrowser-mcp-http-e2e-${process.pid}-${Date.now()}`;
  containerNames.push(containerName);
  const args = [
    'run',
    '--detach',
    '--rm',
    '--name',
    containerName,
    '--publish',
    '127.0.0.1::3000',
    ...(options.cdp === undefined
      ? []
      : ['--publish', `127.0.0.1:${String(options.cdp.port)}:${String(options.cdp.port)}`]),
    '--tmpfs',
    '/data:rw,nosuid,nodev,mode=1777',
    '--env',
    'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
    '--env',
    'PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default',
    '--env',
    'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=false',
  ];
  if (options.fakeUpstream) {
    const message2 = `type=bind,source=${fakeUpstreamFixtureDir},target=${fakeUpstreamContainerDir},readonly`;
    const message3 = `PLAYWRIGHT_MCP_CLI_PATH=${fakeUpstreamContainerPath}`;
    args.push('--mount', message2, '--env', message3, '--env', 'PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright');
  }
  if (options.browserEngine !== undefined && !options.fakeUpstream) {
    const message4 = `PLAYWRIGHT_MCP_BROWSER_ENGINE=${options.browserEngine}`;
    args.push('--env', message4);
    if (options.browserEngine === 'playwright') {
      args.push('--env', 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS=--no-sandbox');
    }
  }
  if (options.cdp !== undefined) {
    const message5 = `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=${String(options.cdp.enabled)}`;
    const message6 = `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE=${String(options.cdp.port)}`;
    args.push(
      '--env',
      message5,
      '--env',
      message6,
      '--env',
      'CLOAK_PLAYWRIGHT_MCP_CDP_HOST=0.0.0.0',
      '--env',
      'CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true',
      '--env',
      'CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST=127.0.0.1',
    );
  }
  if (options.headless !== undefined) {
    const message7 = `PLAYWRIGHT_MCP_HEADLESS=${String(options.headless)}`;
    args.push('--env', message7);
  }
  if (options.authToken !== undefined) {
    const message8 = `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN=${options.authToken}`;
    args.push('--env', message8);
  }
  if (options.sessionMax !== undefined) {
    const message9 = `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX=${String(options.sessionMax)}`;
    args.push('--env', message9);
  }
  args.push(
    dockerImageTag,
    '--transport',
    'streamable-http',
    '--http-host',
    '0.0.0.0',
    '--http-port',
    '3000',
  );
  runDocker(args);
  const values11: string[] = ['port', containerName, '3000/tcp'];
  const port = runDocker(values11).stdout.trim();
  const match = /:(\d+)$/u.exec(port);
  if (match?.[1] === undefined) {
    const message10 = `Could not resolve Docker HTTP port: ${port}`;
    throw new Error(message10);
  }
  return { containerName, url: `http://127.0.0.1:${match[1]}/mcp` };
}
export async function waitForDockerExec(
  containerName: string,
  args: string[],
  timeoutMs = 10000,
): Promise<DockerCommandResult> {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;
  while (Date.now() < deadline) {
    try {
      return dockerExec(containerName, args);
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : (() => {
              const stringResult = String(error);
              return new Error(stringResult);
            })();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw (
    lastError ??
    (() => {
      const message11 = `Timed out waiting for Docker command: ${args.join(' ')}`;
      return new Error(message11);
    })()
  );
}
export async function waitForDockerExit(containerName: string, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (
      (() => {
        const values12: string[] = ['true'];
        return dockerExecAllowFailure(containerName, values12).status !== 0;
      })()
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const message12 = `Docker container did not exit: ${containerName}`;
  throw new Error(message12);
}
export async function waitForDockerHttp(
  url: string,
  timeoutMs = 10000,
  authorization?: string,
): Promise<void> {
  const healthUrl = new URL('/healthz', url);
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;
  while (Date.now() < deadline) {
    try {
      const fetchOptions = {
        headers: authorization === undefined ? {} : { authorization },
      } as const;
      const response = await fetch(healthUrl, fetchOptions);
      if (response.status === 200) return;
      const message13 = `Docker HTTP health probe returned ${String(response.status)}`;
      lastError = new Error(message13);
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : (() => {
              const stringResult2 = String(error);
              return new Error(stringResult2);
            })();
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw (
    lastError ??
    (() => {
      const message14 = `Timed out waiting for Docker HTTP endpoint: ${url}`;
      return new Error(message14);
    })()
  );
}
export async function waitForDockerHealth(
  containerName: string,
  expected: 'healthy' | 'unhealthy',
  timeoutMs = 12000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (dockerHealthStatus(containerName) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const message15 = `Docker health did not become ${expected}`;
  throw new Error(message15);
}
function runDocker(
  args: string[],
  options: {
    allowFailure?: boolean;
  } = {},
): DockerCommandResult {
  const spawnSyncOptions: import('node:child_process').SpawnSyncOptionsWithStringEncoding = {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  const result = spawnSync('docker', args, spawnSyncOptions);
  if (!options.allowFailure && result.status !== 0) {
    const joinedPath = [
      `Docker command failed: docker ${args.join(' ')}`,
      `status: ${String(result.status)}`,
      `stdout:\n${result.stdout}`,
      `stderr:\n${result.stderr}`,
    ].join('\n');
    throw new Error(joinedPath);
  }
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}
async function runDockerAsync(args: string[]): Promise<DockerCommandResult> {
  return await new Promise<DockerCommandResult>((resolve, reject) => {
    const spawnOptions: import('node:child_process').SpawnOptionsWithStdioTuple<
      import('node:child_process').StdioNull,
      import('node:child_process').StdioPipe,
      import('node:child_process').StdioPipe
    > = { stdio: ['ignore', 'pipe', 'pipe'] };
    const child = spawn('docker', args, spawnOptions);
    let stderr = '';
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (status) => {
      if (status === 0) {
        const resolveOptions = { status, stderr, stdout } as const;
        resolve(resolveOptions);
        return;
      }
      const joinedPath2 = [
        `Docker command failed: docker ${args.join(' ')}`,
        `status: ${String(status)}`,
        `stdout:\n${stdout}`,
        `stderr:\n${stderr}`,
      ].join('\n');
      const error2 = new Error(joinedPath2);
      reject(error2);
    });
  });
}
