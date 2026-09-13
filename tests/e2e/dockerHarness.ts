import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const dockerImageTag = process.env.CLOAKBROWSER_MCP_DOCKER_IMAGE ?? 'cloakbrowser-mcp:dev';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const fakeUpstreamContainerDir = '/opt/cloakbrowser-mcp/tests/fixtures';
const fakeUpstreamContainerPath = `${fakeUpstreamContainerDir}/fake-upstream-mcp.mjs`;
const fakeUpstreamFixtureDir = path.join(repoRoot, 'tests', 'fixtures');
const containerNames: string[] = [];
const tempRoots: string[] = [];

export interface DockerCommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export function cleanupDockerE2e(): void {
  for (const containerName of containerNames.splice(0)) {
    runDocker(['rm', '--force', containerName], { allowFailure: true });
  }
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
}

export function dockerExec(containerName: string, args: string[]): DockerCommandResult {
  return runDocker(['exec', containerName, ...args]);
}

export function dockerExecAllowFailure(containerName: string, args: string[]): DockerCommandResult {
  return runDocker(['exec', containerName, ...args], { allowFailure: true });
}

export function dockerExecAsRoot(containerName: string, args: string[]): DockerCommandResult {
  return runDocker(['exec', '--user', '0', containerName, ...args]);
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
  const dataDir = createTempRoot('cloakbrowser-mcp-docker-data-');
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
    '--mount',
    `type=bind,source=${dataDir},target=/data`,
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
    fakeUpstream?: boolean;
    headless?: boolean;
    sessionMax?: number;
  } = {},
): { containerName: string; url: string } {
  const dataDir = createTempRoot('cloakbrowser-mcp-docker-http-data-');
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
    '--mount',
    `type=bind,source=${dataDir},target=/data`,
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

  if (options.headless === false) {
    args.push('--env', 'PLAYWRIGHT_MCP_HEADLESS=false');
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

function createTempRoot(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
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
