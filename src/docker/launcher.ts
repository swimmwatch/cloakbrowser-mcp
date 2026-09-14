import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chmodSync, rmSync } from 'node:fs';
import { createServer, type Server, type Socket } from 'node:net';
import { constants as osConstants } from 'node:os';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { dockerDisplay, DockerDisplayManager, probeX11Display } from '#src/docker/display';
import { dockerHealthSocketPath } from '#src/docker/health';
import {
  type DockerDisplayEnsureResult,
  dockerDisplayEnsureResultType,
  dockerHealthProbeRequestType,
  type DockerHealthProbeResult,
  isDockerDisplayEnsureRequest,
  isDockerHealthProbeResult,
} from '#src/docker/protocol';

const cliShutdownTimeoutMs = 8_000;
const cliKillTimeoutMs = 2_000;
const cliHealthProbeTimeoutMs = 750;
const displayProbeIntervalMs = 50;
const displayStartupTimeoutMs = 10_000;

type ShutdownReason =
  | { readonly kind: 'cli_exit' }
  | { readonly error: Error; readonly kind: 'infrastructure_failure' }
  | { readonly kind: 'signal'; readonly signal: NodeJS.Signals };

interface PendingHealthProbe {
  readonly nonce: string;
  readonly reject: (error: Error) => void;
  readonly resolve: () => void;
  readonly timer: NodeJS.Timeout;
}

class DockerLifecycleLauncher {
  #cli: ChildProcess | undefined;
  #cliExitCode: number | undefined;
  #completion: ((exitCode: number) => void) | undefined;
  #display = new DockerDisplayManager({
    onFailure: (error) => void this.#beginShutdown({ kind: 'infrastructure_failure', error }),
    probe: () => probeX11Display(),
    probeIntervalMs: displayProbeIntervalMs,
    spawnXvfb: () =>
      spawn('/usr/bin/Xvfb', [dockerDisplay, '-screen', '0', '1280x720x24', '-nolisten', 'tcp'], {
        detached: true,
        stdio: ['ignore', 'ignore', 'inherit'],
      }),
    startupTimeoutMs: displayStartupTimeoutMs,
  });
  #infrastructureFailure: Error | undefined;
  #healthServer: Server | undefined;
  readonly #pendingHealthProbes = new Map<string, PendingHealthProbe>();
  #shutdown: Promise<void> | undefined;

  async run(args: string[]): Promise<number> {
    this.#installSignalHandlers();
    const completion = new Promise<number>((resolve) => {
      this.#completion = resolve;
    });
    try {
      await this.#startHealthServer();
      this.#startCli(args);
    } catch (error) {
      await this.#beginShutdown({
        kind: 'infrastructure_failure',
        error: asError(error, 'Docker health channel startup failed'),
      });
    }
    return completion;
  }

  #installSignalHandlers(): void {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        void this.#beginShutdown({ kind: 'signal', signal });
      });
    }
  }

  #startCli(args: string[]): void {
    const cli = spawn(process.execPath, [resolveCliPath(), ...args], {
      detached: true,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });
    this.#cli = cli;
    cli.on('message', (message: unknown) => this.#handleCliMessage(message));
    cli.once('error', (error) => {
      void this.#beginShutdown({
        kind: 'infrastructure_failure',
        error: new Error(`Could not start the MCP CLI: ${error.message}`),
      });
    });
    cli.once('exit', (code, signal) => {
      this.#rejectHealthProbes(new Error('MCP CLI exited before Docker health probe completed'));
      this.#cliExitCode = signal === null ? (code ?? 1) : 128 + signalNumber(signal);
      void this.#beginShutdown({ kind: 'cli_exit' });
    });
  }

  #handleCliMessage(message: unknown): void {
    if (isDockerDisplayEnsureRequest(message)) {
      void this.#handleDisplayRequest(message.requestId);
      return;
    }
    if (isDockerHealthProbeResult(message)) this.#handleHealthProbeResult(message);
  }

  async #handleDisplayRequest(requestId: string): Promise<void> {
    try {
      await this.#display.ensureReady();
      this.#replyToCli({
        display: dockerDisplay,
        ok: true,
        requestId,
        type: dockerDisplayEnsureResultType,
      });
    } catch (error) {
      const failure = asError(error, 'Xvfb startup failed');
      this.#replyToCli({
        error: failure.message,
        ok: false,
        requestId,
        type: dockerDisplayEnsureResultType,
      });
      await this.#beginShutdown({ kind: 'infrastructure_failure', error: failure });
    }
  }

  #replyToCli(message: DockerDisplayEnsureResult): void {
    if (this.#cli?.connected !== true) return;
    this.#cli.send(message, (error) => {
      if (error === null) return;
      void this.#beginShutdown({
        kind: 'infrastructure_failure',
        error: new Error(`Could not reply on the Docker display control channel: ${error.message}`),
      });
    });
  }

  async #startHealthServer(): Promise<void> {
    rmSync(dockerHealthSocketPath, { force: true });
    const server = createServer({ allowHalfOpen: true }, (socket) => this.#handleHealthSocket(socket));
    this.#healthServer = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(dockerHealthSocketPath, () => {
        server.off('error', reject);
        chmodSync(dockerHealthSocketPath, 0o600);
        resolve();
      });
    });
  }

  #handleHealthSocket(socket: Socket): void {
    let request = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      request += chunk;
      if (request.length > 64) socket.destroy();
    });
    socket.once('end', () => {
      void this.#checkHealth(request).then((ok) => {
        socket.end(`${JSON.stringify({ ok })}\n`);
      });
    });
    socket.once('error', () => undefined);
  }

  async #checkHealth(request: string): Promise<boolean> {
    if (request !== '{"type":"health"}\n' || this.#shutdown !== undefined) return false;
    if (this.#infrastructureFailure !== undefined) return false;
    if (this.#display.phase === 'ready') {
      try {
        await probeX11Display();
      } catch {
        return false;
      }
    } else if (this.#display.phase !== 'never_started') {
      return false;
    }
    try {
      await this.#probeCliEventLoop();
      return true;
    } catch {
      return false;
    }
  }

  #probeCliEventLoop(): Promise<void> {
    const cli = this.#cli;
    if (cli?.connected !== true || cli.pid === undefined) {
      return Promise.reject(new Error('MCP CLI health channel unavailable'));
    }
    const requestId = randomUUID();
    const nonce = randomUUID();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pendingHealthProbes.delete(requestId);
        reject(new Error('Timed out waiting MCP CLI health response'));
      }, cliHealthProbeTimeoutMs);
      this.#pendingHealthProbes.set(requestId, { nonce, reject, resolve, timer });
      cli.send({ nonce, requestId, type: dockerHealthProbeRequestType }, (error) => {
        if (error === null) return;
        const pending = this.#pendingHealthProbes.get(requestId);
        if (pending === undefined) return;
        clearTimeout(pending.timer);
        this.#pendingHealthProbes.delete(requestId);
        reject(new Error(`Could not send MCP CLI health probe: ${error.message}`));
      });
    });
  }

  #handleHealthProbeResult(result: DockerHealthProbeResult): void {
    const pending = this.#pendingHealthProbes.get(result.requestId);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    this.#pendingHealthProbes.delete(result.requestId);
    if (pending.nonce !== result.nonce || result.processId !== this.#cli?.pid) {
      pending.reject(new Error('MCP CLI health response identity mismatch'));
      return;
    }
    pending.resolve();
  }

  #rejectHealthProbes(error: Error): void {
    for (const [requestId, pending] of this.#pendingHealthProbes) {
      clearTimeout(pending.timer);
      this.#pendingHealthProbes.delete(requestId);
      pending.reject(error);
    }
  }

  async #stopHealthServer(): Promise<void> {
    const server = this.#healthServer;
    this.#healthServer = undefined;
    if (server !== undefined) await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dockerHealthSocketPath, { force: true });
  }

  #beginShutdown(reason: ShutdownReason): Promise<void> {
    if (reason.kind === 'infrastructure_failure' && this.#infrastructureFailure === undefined) {
      this.#infrastructureFailure = reason.error;
      process.stderr.write(`cloakbrowser-mcp: ${reason.error.message}\n`);
    }
    if (this.#shutdown !== undefined) return this.#shutdown;
    this.#shutdown = this.#shutdownChildren(reason).finally(() => {
      const completion = this.#completion;
      if (completion === undefined) return;
      this.#completion = undefined;
      completion(this.#finalExitCode());
    });
    return this.#shutdown;
  }

  async #shutdownChildren(reason: ShutdownReason): Promise<void> {
    this.#rejectHealthProbes(new Error('Docker launcher is shutting down'));
    await this.#stopHealthServer();
    const cli = this.#cli;
    if (cli !== undefined && !hasExited(cli)) {
      signalProcessGroup(cli, reason.kind === 'signal' ? reason.signal : 'SIGTERM');
      if (!(await waitForExit(cli, cliShutdownTimeoutMs))) {
        signalProcessGroup(cli, 'SIGKILL');
        await waitForExit(cli, cliKillTimeoutMs);
      }
    }
    await this.#display.stop();
  }

  #finalExitCode(): number {
    return resolveDockerLauncherExitCode(this.#cliExitCode, this.#infrastructureFailure);
  }
}

export async function runDockerLifecycleLauncher(args = process.argv.slice(2)): Promise<number> {
  return new DockerLifecycleLauncher().run(args);
}

export function resolveDockerLauncherExitCode(
  cliExitCode: number | undefined,
  infrastructureFailure: Error | undefined,
): number {
  if (infrastructureFailure !== undefined) return 1;
  return cliExitCode ?? 1;
}

function resolveCliPath(): string {
  return fileURLToPath(new URL('../cli.js', import.meta.url));
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

function signalProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function signalNumber(signal: NodeJS.Signals): number {
  return osConstants.signals[signal] ?? 1;
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (hasExited(child)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), timeoutMs);
    const onExit = (): void => finish(true);
    function finish(exited: boolean): void {
      clearTimeout(timer);
      child.off('exit', onExit);
      resolve(exited);
    }
    child.once('exit', onExit);
  });
}

function asError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fileURLToPath(import.meta.url) === invokedPath) {
  void runDockerLifecycleLauncher().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(`cloakbrowser-mcp: ${asError(error, 'Docker launcher failed').message}\n`);
      process.exitCode = 1;
    },
  );
}
