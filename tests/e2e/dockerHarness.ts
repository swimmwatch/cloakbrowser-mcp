import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const dockerImageTag = process.env.CLOAKBROWSER_MCP_DOCKER_IMAGE ?? 'cloakbrowser-mcp:dev';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
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
    runDocker(['rm', '--force', containerName], { allowFailure: true });
  }
}

export function trackDockerContainer(containerName: string): void {
  containerNames.push(containerName);
}

export function dockerExec(containerName: string, args: string[]): DockerCommandResult {
  return runDocker(['exec', containerName, ...args]);
}

export async function dockerExecAsync(containerName: string, args: string[]): Promise<DockerCommandResult> {
  return await runDockerAsync(['exec', containerName, ...args]);
}

export function dockerExecAllowFailure(containerName: string, args: string[]): DockerCommandResult {
  return runDocker(['exec', containerName, ...args], { allowFailure: true });
}

export function dockerExecAsRoot(containerName: string, args: string[]): DockerCommandResult {
  return runDocker(['exec', '--user', '0', containerName, ...args]);
}

export function dockerLogs(containerName: string): DockerCommandResult {
  return runDocker(['logs', containerName], { allowFailure: true });
}

export function stopDockerContainer(containerName: string): DockerCommandResult {
  return runDocker(['stop', '--time', '10', containerName]);
}

export function dockerHealthStatus(containerName: string): string {
  return runDocker([
    'inspect',
    '--format',
    '{{if .State.Health}}{{.State.Health.Status}}{{end}}',
    containerName,
  ]).stdout.trim();
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
  const [image] = JSON.parse(runDocker(['image', 'inspect', dockerImageTag]).stdout) as Array<{
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
  if (!image) throw new Error(`Docker image inspection returned no image: ${dockerImageTag}`);
  return image;
}

export function startFakeUpstreamDockerContainer(): string {
  const containerName = `cloakbrowser-mcp-e2e-${process.pid}-${Date.now()}`;
  containerNames.push(containerName);
  runDocker([
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
  ]);
  return containerName;
}

export function startFakeUpstreamHttpDockerContainer(): { containerName: string; url: string } {
  return startHttpDockerContainer({ fakeUpstream: true });
}

export function startHttpDockerContainer(
  options: {
    authToken?: string;
    browserEngine?: 'cloak' | 'playwright';
    cdp?: { enabled: boolean; port: number };
    fakeUpstream?: boolean;
    headless?: boolean;
    sessionMax?: number;
  } = {},
): { containerName: string; url: string } {
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
    args.push(
      '--mount',
      `type=bind,source=${fakeUpstreamFixtureDir},target=${fakeUpstreamContainerDir},readonly`,
      '--env',
      `PLAYWRIGHT_MCP_CLI_PATH=${fakeUpstreamContainerPath}`,
      '--env',
      'PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright',
    );
  }

  if (options.browserEngine !== undefined && !options.fakeUpstream) {
    args.push('--env', `PLAYWRIGHT_MCP_BROWSER_ENGINE=${options.browserEngine}`);
    if (options.browserEngine === 'playwright') {
      args.push('--env', 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS=--no-sandbox');
    }
  }

  if (options.cdp !== undefined) {
    args.push(
      '--env',
      `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=${String(options.cdp.enabled)}`,
      '--env',
      `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE=${String(options.cdp.port)}`,
      '--env',
      'CLOAK_PLAYWRIGHT_MCP_CDP_HOST=0.0.0.0',
      '--env',
      'CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true',
      '--env',
      'CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST=127.0.0.1',
    );
  }

  if (options.headless !== undefined) {
    args.push('--env', `PLAYWRIGHT_MCP_HEADLESS=${String(options.headless)}`);
  }

  if (options.authToken !== undefined) {
    args.push('--env', `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN=${options.authToken}`);
  }

  if (options.sessionMax !== undefined) {
    args.push('--env', `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX=${String(options.sessionMax)}`);
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
  const port = runDocker(['port', containerName, '3000/tcp']).stdout.trim();
  const match = /:(\d+)$/u.exec(port);
  if (match?.[1] === undefined) throw new Error(`Could not resolve Docker HTTP port: ${port}`);
  return { containerName, url: `http://127.0.0.1:${match[1]}/mcp` };
}

export async function waitForDockerExec(
  containerName: string,
  args: string[],
  timeoutMs = 10_000,
): Promise<DockerCommandResult> {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;
  while (Date.now() < deadline) {
    try {
      return dockerExec(containerName, args);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError ?? new Error(`Timed out waiting for Docker command: ${args.join(' ')}`);
}

export async function waitForDockerExit(containerName: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (dockerExecAllowFailure(containerName, ['true']).status !== 0) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Docker container did not exit: ${containerName}`);
}

export async function waitForDockerHttp(
  url: string,
  timeoutMs = 10_000,
  authorization?: string,
): Promise<void> {
  const healthUrl = new URL('/healthz', url);
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, {
        headers: authorization === undefined ? {} : { authorization },
      });
      if (response.status === 200) return;
      lastError = new Error(`Docker HTTP health probe returned ${String(response.status)}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError ?? new Error(`Timed out waiting for Docker HTTP endpoint: ${url}`);
}

export async function waitForDockerHealth(
  containerName: string,
  expected: 'healthy' | 'unhealthy',
  timeoutMs = 12_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (dockerHealthStatus(containerName) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Docker health did not become ${expected}`);
}

function runDocker(args: string[], options: { allowFailure?: boolean } = {}): DockerCommandResult {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(
      [
        `Docker command failed: docker ${args.join(' ')}`,
        `status: ${String(result.status)}`,
        `stdout:\n${result.stdout}`,
        `stderr:\n${result.stderr}`,
      ].join('\n'),
    );
  }
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

async function runDockerAsync(args: string[]): Promise<DockerCommandResult> {
  return await new Promise<DockerCommandResult>((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
        resolve({ status, stderr, stdout });
        return;
      }

      reject(
        new Error(
          [
            `Docker command failed: docker ${args.join(' ')}`,
            `status: ${String(status)}`,
            `stdout:\n${stdout}`,
            `stderr:\n${stderr}`,
          ].join('\n'),
        ),
      );
    });
  });
}
