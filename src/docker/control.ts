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
  readonly #onDisconnect = (): void => {
    for (const requestId of this.#pending.keys()) this.#rejectPending(requestId);
  };
  constructor() {
    process.on('message', this.#onMessage);
    process.on('disconnect', this.#onDisconnect);
  }
  async ensureDisplayForHeadedRuntime(headless: boolean | undefined): Promise<void> {
    if (headless !== false) return;
    if (typeof process.send !== 'function') return;
    const requestId = randomUUID();
    const result = await new Promise<DockerDisplayEnsureResult>((resolve, reject) => {
      const setOptions = { resolve, reject } as const;
      this.#pending.set(requestId, setOptions);
      try {
        const request = { type: dockerDisplayEnsureRequestType, requestId };
        process.send?.(request, (error) => {
          if (error === null) return;
          this.#rejectPending(requestId);
        });
      } catch {
        this.#rejectPending(requestId);
      }
    });
    if (!result.ok || result.display === undefined) {
      const computedValue = result.error ?? 'Docker display startup failed';
      throw new DockerDisplayUnavailableError(computedValue);
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
  #rejectPending(requestId: string): void {
    const pending = this.#pending.get(requestId);
    if (!pending) return;
    this.#pending.delete(requestId);
    const dockerDisplayUnavailableError = new DockerDisplayUnavailableError(
      'Docker display control channel is unavailable',
    );
    pending.reject(dockerDisplayUnavailableError);
  }
}
const noOpDockerDisplayController: DockerDisplayController = {
  ensureDisplayForHeadedRuntime: async (): Promise<void> => undefined,
};
export function createDockerDisplayController(): DockerDisplayController {
  if (typeof process.send !== 'function') return noOpDockerDisplayController;
  return new DockerIpcDisplayController();
}
