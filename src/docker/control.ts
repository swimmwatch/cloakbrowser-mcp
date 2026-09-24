import { randomUUID } from 'node:crypto';
import process from 'node:process';
import {
  dockerDisplayEnsureRequestType,
  type DockerDisplayEnsureResult,
  isDockerDisplayEnsureResult,
} from '#src/docker/protocol';

export class DockerDisplayUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DockerDisplayUnavailableError';
  }
}

export interface DockerDisplayController {
  ensureDisplayForHeadedRuntime(headless: boolean | undefined): Promise<void>;
}

interface PendingDisplayRequest {
  reject(error: Error): void;
  resolve(result: DockerDisplayEnsureResult): void;
}

class DockerIpcDisplayController implements DockerDisplayController {
  readonly #pending = new Map<string, PendingDisplayRequest>();
  readonly #onMessage = (message: unknown): void => this.#handleMessage(message);

  constructor() {
    process.on('message', this.#onMessage);
  }

  async ensureDisplayForHeadedRuntime(headless: boolean | undefined): Promise<void> {
    if (headless !== false) return;
    if (typeof process.send !== 'function') return;

    const requestId = randomUUID();
    const result = await new Promise<DockerDisplayEnsureResult>((resolve, reject) => {
      this.#pending.set(requestId, { resolve, reject });
      const sent = process.send?.({ type: dockerDisplayEnsureRequestType, requestId });
      if (sent) return;
      this.#pending.delete(requestId);
      reject(new DockerDisplayUnavailableError('Docker display control channel is unavailable'));
    });

    if (!result.ok || result.display === undefined) {
      throw new DockerDisplayUnavailableError(result.error ?? 'Docker display startup failed');
    }
    process.env.DISPLAY = result.display;
  }

  #handleMessage(message: unknown): void {
    if (!isDockerDisplayEnsureResult(message)) return;
    const pending = this.#pending.get(message.requestId);
    if (!pending) return;
    this.#pending.delete(message.requestId);
    pending.resolve(message);
  }
}

const noOpDockerDisplayController: DockerDisplayController = {
  ensureDisplayForHeadedRuntime: async (): Promise<void> => undefined,
};

export function createDockerDisplayController(): DockerDisplayController {
  if (typeof process.send !== 'function') return noOpDockerDisplayController;
  return new DockerIpcDisplayController();
}
