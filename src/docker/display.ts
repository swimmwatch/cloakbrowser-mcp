import type { ChildProcess } from 'node:child_process';
import { connect } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

export const dockerDisplay = ':99';
export const dockerX11SocketPath = '/tmp/.X11-unix/X99';
const dockerX11ProbeTimeoutMs = 1_000;

export type DockerDisplayPhase = 'failed' | 'never_started' | 'ready' | 'starting' | 'stopping';

export interface DockerDisplayManagerOptions {
  readonly onFailure: (error: Error) => void;
  readonly probe: () => Promise<void>;
  readonly probeIntervalMs: number;
  readonly spawnXvfb: () => ChildProcess;
  readonly startupTimeoutMs: number;
}

/** Owns the one retained Xvfb process for a Docker container invocation. */
export class DockerDisplayManager {
  #child: ChildProcess | undefined;
  #failure: Error | undefined;
  readonly #options: DockerDisplayManagerOptions;
  #phase: DockerDisplayPhase = 'never_started';
  #startup: Promise<void> | undefined;

  constructor(options: DockerDisplayManagerOptions) {
    this.#options = options;
  }

  get phase(): DockerDisplayPhase {
    return this.#phase;
  }

  async ensureReady(): Promise<void> {
    if (this.#phase === 'ready') return;
    if (this.#phase === 'starting' && this.#startup !== undefined) return this.#startup;
    if (this.#failure !== undefined) throw this.#failure;
    if (this.#phase === 'stopping') throw new Error('Docker display is shutting down');

    this.#phase = 'starting';
    this.#startup = this.#start();
    return this.#startup;
  }

  async stop(): Promise<void> {
    if (this.#phase === 'never_started' || this.#phase === 'stopping') return;
    this.#phase = 'stopping';
    const child = this.#child;
    if (child === undefined || hasExited(child)) return;

    child.kill('SIGTERM');
    if (await waitForExit(child, 8_000)) return;
    child.kill('SIGKILL');
    await waitForExit(child, 2_000);
  }

  async #start(): Promise<void> {
    let child: ChildProcess;
    try {
      child = this.#options.spawnXvfb();
    } catch (error) {
      throw this.#fail(asError(error, 'Could not spawn Xvfb'));
    }

    this.#child = child;
    child.once('error', (error) => this.#fail(new Error(`Xvfb spawn error: ${error.message}`)));
    child.once('exit', (code, signal) => {
      if (this.#phase === 'stopping') return;
      const reason = signal === null ? `exit code ${String(code)}` : `signal ${signal}`;
      this.#fail(new Error(`Xvfb exited unexpectedly (${reason})`));
    });

    const deadline = Date.now() + this.#options.startupTimeoutMs;
    let lastError: Error | undefined;
    while (Date.now() < deadline) {
      const failure = this.#failure;
      if (failure !== undefined) throw failure;
      try {
        await this.#options.probe();
        if (this.#failure !== undefined) throw this.#failure;
        this.#phase = 'ready';
        return;
      } catch (error) {
        lastError = asError(error, 'Xvfb did not respond to the X11 probe');
      }
      await delay(this.#options.probeIntervalMs);
    }

    const timeoutError = new Error(
      `Xvfb did not become ready within ${String(this.#options.startupTimeoutMs)}ms${
        lastError === undefined ? '' : `: ${lastError.message}`
      }`,
    );
    throw this.#fail(timeoutError);
  }

  #fail(error: Error): Error {
    if (this.#failure !== undefined) return this.#failure;
    this.#failure = error;
    this.#phase = 'failed';
    this.#options.onFailure(error);
    return error;
  }
}

/** Probes a Unix X11 socket through a complete setup handshake. */
export function probeX11Display(
  socketPath = dockerX11SocketPath,
  timeoutMs = dockerX11ProbeTimeoutMs,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let response = Buffer.alloc(0);
    let expectedResponseLength: number | undefined;
    const socket = connect(socketPath);
    const timer = setTimeout(() => finish(new Error('Timed out waiting for X11 setup response')), timeoutMs);

    function finish(error?: Error): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error === undefined) resolve();
      else reject(error);
    }

    socket.once('connect', () => {
      const request = Buffer.alloc(12);
      request[0] = 0x6c;
      request.writeUInt16LE(11, 2);
      socket.write(request);
    });
    socket.on('data', (chunk: Buffer) => {
      response = Buffer.concat([response, chunk]);
      if (response.length < 8) return;
      if (response[0] !== 1) {
        finish(new Error('X11 server rejected the setup request'));
        return;
      }
      expectedResponseLength ??= 8 + response.readUInt16LE(6) * 4;
      if (response.length >= expectedResponseLength) finish();
    });
    socket.once('end', () => {
      finish(
        new Error(
          expectedResponseLength === undefined
            ? 'X11 server closed before setup response prefix'
            : 'X11 server closed before setup response completed',
        ),
      );
    });
    socket.once('error', (error) => finish(error));
  });
}

function asError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
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
