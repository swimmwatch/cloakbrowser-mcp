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
const cliShutdownTimeoutMs = 8000;
const cliKillTimeoutMs = 2000;
const cliHealthProbeTimeoutMs = 750;
const displayProbeIntervalMs = 50;
const displayStartupTimeoutMs = 10000;
type ShutdownReason =
  | {
      readonly kind: 'cli_exit';
    }
  | {
      readonly error: Error;
      readonly kind: 'infrastructure_failure';
    }
  | {
      readonly kind: 'signal';
      readonly signal: NodeJS.Signals;
    };
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
  #display = (() => {
    const dockerDisplayManagerOptions: import('#src/docker/display').DockerDisplayManagerOptions = {
      onFailure: (error) =>
        void (() => {
          const beginShutdownOptions = { kind: 'infrastructure_failure', error } as const;
          return this.#beginShutdown(beginShutdownOptions);
        })(),
      probe: () => probeX11Display(),
      probeIntervalMs: displayProbeIntervalMs,
      spawnXvfb: () => {
        const values: readonly string[] = [dockerDisplay, '-screen', '0', '1280x720x24', '-nolisten', 'tcp'];
        const spawnOptions: import('node:child_process').SpawnOptionsWithStdioTuple<
          import('node:child_process').StdioNull,
          import('node:child_process').StdioNull,
          import('node:child_process').StdioNull
        > = {
          detached: true,
          stdio: ['ignore', 'ignore', 'inherit'],
        };
        return spawn('/usr/bin/Xvfb', values, spawnOptions);
      },
      startupTimeoutMs: displayStartupTimeoutMs,
    };
    return new DockerDisplayManager(dockerDisplayManagerOptions);
  })();
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
      const beginShutdownOptions2 = {
        kind: 'infrastructure_failure',
        error: asError(error, 'Docker health channel startup failed'),
      } as const;
      await this.#beginShutdown(beginShutdownOptions2);
    }
    return completion;
  }
  #installSignalHandlers(): void {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        void (() => {
          const beginShutdownOptions3 = { kind: 'signal', signal } as const;
          return this.#beginShutdown(beginShutdownOptions3);
        })();
      });
    }
  }
  #startCli(args: string[]): void {
    const argumentValue = process.execPath;
    const values2: readonly string[] = [resolveCliPath(), ...args];
    const spawnOptions2: import('node:child_process').SpawnOptions = {
      detached: true,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    };
    const cli = spawn(argumentValue, values2, spawnOptions2);
    this.#cli = cli;
    cli.on('message', (message: unknown) => this.#handleCliMessage(message));
    cli.once('error', (error) => {
      void (() => {
        const propertyValue = 'infrastructure_failure';
        const message2 = `Could not start the MCP CLI: ${error.message}`;
        const error2 = new Error(message2);
        const beginShutdownOptions4 = {
          kind: propertyValue,
          error: error2,
        } as const;
        return this.#beginShutdown(beginShutdownOptions4);
      })();
    });
    cli.once('exit', (code, signal) => {
      const error3 = new Error('MCP CLI exited before Docker health probe completed');
      this.#rejectHealthProbes(error3);
      this.#cliExitCode = signal === null ? (code ?? 1) : 128 + signalNumber(signal);
      void (() => {
        const beginShutdownOptions5 = { kind: 'cli_exit' } as const;
        return this.#beginShutdown(beginShutdownOptions5);
      })();
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
      const replyToCliOptions = {
        display: dockerDisplay,
        ok: true,
        requestId,
        type: dockerDisplayEnsureResultType,
      } as const;
      this.#replyToCli(replyToCliOptions);
    } catch (error) {
      const failure = asError(error, 'Xvfb startup failed');
      const replyToCliOptions2 = {
        error: failure.message,
        ok: false,
        requestId,
        type: dockerDisplayEnsureResultType,
      } as const;
      this.#replyToCli(replyToCliOptions2);
      const beginShutdownOptions6 = { kind: 'infrastructure_failure', error: failure } as const;
      await this.#beginShutdown(beginShutdownOptions6);
    }
  }
  #replyToCli(message: DockerDisplayEnsureResult): void {
    if (this.#cli?.connected !== true) return;
    this.#cli.send(message, (error) => {
      if (error === null) return;
      void (() => {
        const propertyValue2 = 'infrastructure_failure';
        const message3 = `Could not reply on the Docker display control channel: ${error.message}`;
        const error4 = new Error(message3);
        const beginShutdownOptions7 = {
          kind: propertyValue2,
          error: error4,
        } as const;
        return this.#beginShutdown(beginShutdownOptions7);
      })();
    });
  }
  async #startHealthServer(): Promise<void> {
    const rmSyncOptions = { force: true } as const;
    rmSync(dockerHealthSocketPath, rmSyncOptions);
    const createServerOptions = { allowHalfOpen: true } as const;
    const server = createServer(createServerOptions, (socket) => this.#handleHealthSocket(socket));
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
        const stringifyOptions = { ok } as const;
        const templateValue = JSON.stringify(stringifyOptions);
        const message4 = `${templateValue}\n`;
        socket.end(message4);
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
      const error5 = new Error('MCP CLI health channel unavailable');
      return Promise.reject(error5);
    }
    const requestId = randomUUID();
    const nonce = randomUUID();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pendingHealthProbes.delete(requestId);
        const error6 = new Error('Timed out waiting MCP CLI health response');
        reject(error6);
      }, cliHealthProbeTimeoutMs);
      const setOptions = { nonce, reject, resolve, timer } as const;
      this.#pendingHealthProbes.set(requestId, setOptions);
      const sendOptions = { nonce, requestId, type: dockerHealthProbeRequestType } as const;
      cli.send(sendOptions, (error) => {
        if (error === null) return;
        const pending = this.#pendingHealthProbes.get(requestId);
        if (pending === undefined) return;
        clearTimeout(pending.timer);
        this.#pendingHealthProbes.delete(requestId);
        const message5 = `Could not send MCP CLI health probe: ${error.message}`;
        const error7 = new Error(message5);
        reject(error7);
      });
    });
  }
  #handleHealthProbeResult(result: DockerHealthProbeResult): void {
    const pending = this.#pendingHealthProbes.get(result.requestId);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    this.#pendingHealthProbes.delete(result.requestId);
    if (pending.nonce !== result.nonce || result.processId !== this.#cli?.pid) {
      const error8 = new Error('MCP CLI health response identity mismatch');
      pending.reject(error8);
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
    const rmSyncOptions2 = { force: true } as const;
    rmSync(dockerHealthSocketPath, rmSyncOptions2);
  }
  #beginShutdown(reason: ShutdownReason): Promise<void> {
    if (reason.kind === 'infrastructure_failure' && this.#infrastructureFailure === undefined) {
      this.#infrastructureFailure = reason.error;
      const message6 = `cloakbrowser-mcp: ${reason.error.message}\n`;
      process.stderr.write(message6);
    }
    if (this.#shutdown !== undefined) return this.#shutdown;
    this.#shutdown = this.#shutdownChildren(reason).finally(() => {
      const completion = this.#completion;
      if (completion === undefined) return;
      this.#completion = undefined;
      const finalExitCodeResult = this.#finalExitCode();
      completion(finalExitCodeResult);
    });
    return this.#shutdown;
  }
  async #shutdownChildren(reason: ShutdownReason): Promise<void> {
    const error9 = new Error('Docker launcher is shutting down');
    this.#rejectHealthProbes(error9);
    await this.#stopHealthServer();
    const cli = this.#cli;
    if (cli !== undefined && !hasExited(cli)) {
      const argumentValue2 = reason.kind === 'signal' ? reason.signal : 'SIGTERM';
      signalProcessGroup(cli, argumentValue2);
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
  const uRL = new URL('../cli.js', import.meta.url);
  return fileURLToPath(uRL);
}
function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}
function signalProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    const argumentValue3 = -child.pid;
    process.kill(argumentValue3, signal);
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
      const message7 = `cloakbrowser-mcp: ${asError(error, 'Docker launcher failed').message}\n`;
      process.stderr.write(message7);
      process.exitCode = 1;
    },
  );
}
