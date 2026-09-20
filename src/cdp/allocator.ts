export interface CdpPortBinding {
  close(): Promise<void>;
}

export type CdpPortBinder = (port: number, host: string) => Promise<CdpPortBinding>;

export interface AcquireCdpPortOptions {
  bind: CdpPortBinder;
  host: string;
}

export class CdpPortPoolExhaustedError extends Error {}

export class CdpPortBindError extends Error {
  readonly code?: string;
  readonly port: number;

  constructor(port: number, code?: string, options?: ErrorOptions) {
    super(`Unable to bind managed CDP port ${port}${code === undefined ? '' : ` (${code})`}`, options);
    this.code = code;
    this.port = port;
  }
}

export class CdpPortLease {
  readonly #binding: CdpPortBinding;
  readonly #onReleased: () => void;
  #closeBindingPromise: Promise<void> | undefined;
  #releasePromise: Promise<void> | undefined;
  readonly port: number;

  constructor(port: number, binding: CdpPortBinding, onReleased: () => void) {
    this.#binding = binding;
    this.#onReleased = onReleased;
    this.port = port;
  }

  closeBinding(): Promise<void> {
    this.#closeBindingPromise ??= this.#binding.close();
    return this.#closeBindingPromise;
  }

  release(): Promise<void> {
    this.#releasePromise ??= this.closeBinding().then(() => {
      this.#onReleased();
    });
    return this.#releasePromise;
  }
}

/** Owns atomic process-local reservation state for one configured CDP port pool. */
export class CdpPortAllocator {
  readonly #end: number;
  readonly #leased = new Set<number>();
  readonly #start: number;

  constructor(range: { end: number; start: number }) {
    if (
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      range.start < 1 ||
      range.end > 65_535 ||
      range.start > range.end
    ) {
      throw new RangeError('CDP allocator range must be between 1 and 65535');
    }
    this.#end = range.end;
    this.#start = range.start;
  }

  async acquire(options: AcquireCdpPortOptions): Promise<CdpPortLease> {
    const port = this.#selectCandidate();
    this.#leased.add(port);

    let binding: CdpPortBinding;
    try {
      binding = await options.bind(port, options.host);
    } catch (error) {
      this.#leased.delete(port);
      throw new CdpPortBindError(port, errorCode(error), { cause: error });
    }

    return new CdpPortLease(port, binding, () => {
      this.#leased.delete(port);
    });
  }

  #selectCandidate(): number {
    for (let port = this.#start; port <= this.#end; port += 1) {
      if (!this.#leased.has(port)) return port;
    }
    throw new CdpPortPoolExhaustedError(`Managed CDP port pool ${this.#start}-${this.#end} is exhausted`);
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}
