import process from 'node:process';
import { dockerHealthProbeResultType, isDockerHealthProbeRequest } from '#src/docker/protocol';

export interface DockerCliHealthResponder {
  dispose(): void;
}

class IpcDockerCliHealthResponder implements DockerCliHealthResponder {
  readonly #onMessage = (message: unknown): void => this.#respond(message);

  constructor() {
    process.on('message', this.#onMessage);
  }

  dispose(): void {
    process.off('message', this.#onMessage);
  }

  #respond(message: unknown): void {
    if (!isDockerHealthProbeRequest(message) || typeof process.send !== 'function') return;
    process.send({
      nonce: message.nonce,
      processId: process.pid,
      requestId: message.requestId,
      type: dockerHealthProbeResultType,
    });
  }
}

const noOpDockerCliHealthResponder: DockerCliHealthResponder = {
  dispose: (): void => undefined,
};

export function createDockerCliHealthResponder(): DockerCliHealthResponder {
  if (typeof process.send !== 'function') return noOpDockerCliHealthResponder;
  return new IpcDockerCliHealthResponder();
}
