import type { CdpHttpProxy } from '#src/cdp/httpProxy';
import { generateCdpCapability } from '#src/cdp/capability';
import type {
  ChromiumCdpClient,
  ManagedCdpReadyGeneration,
  ManagedCdpRuntimeOwner,
  ManagedCdpSessionDependencies,
  ManagedCdpSessionSnapshot,
  ManagedCdpUpstreamOwner,
} from '#src/cdp/types';

export type { ManagedCdpSessionDependencies } from '#src/cdp/types';

export interface ManagedCdpSession {
  readonly activeConnections: number;
  bootstrapGeneration(): Promise<void>;
  dispose(): Promise<void>;
  readonly externalPort: number;
  invalidateGeneration(): void;
  probeGeneration(signal?: AbortSignal): Promise<boolean>;
  runBrowserTool(operation: (upstream: ManagedCdpUpstreamOwner) => Promise<unknown>): Promise<unknown>;
  runWithCurrentUpstream(
    operation: (upstream: ManagedCdpUpstreamOwner) => Promise<unknown>,
  ): Promise<unknown>;
  snapshot(): ManagedCdpSessionSnapshot;
}

interface ManagedCdpGenerationOwner {
  chromium: ChromiumCdpClient;
  internalHost: string;
  internalPort: number;
  runtime: ManagedCdpRuntimeOwner;
  upstream: ManagedCdpUpstreamOwner;
}

/** Creates one fully ready managed-CDP owner or rolls back all provisional resources. */
export async function startManagedCdpSession(
  dependencies: ManagedCdpSessionDependencies,
): Promise<ManagedCdpSession> {
  const deadline = createDeadline(dependencies.initialTimeoutMs ?? 60_000);
  let proxy: CdpHttpProxy | undefined;
  let session: ManagedCdpSessionRuntime | undefined;

  try {
    proxy = await acquireWithinDeadline(
      dependencies.createProxy(deadline.signal),
      deadline.signal,
      async (createdProxy) => await createdProxy.close(),
      dependencies.onCleanupError,
      'proxy',
    );
    session = new ManagedCdpSessionRuntime(dependencies, proxy);
    await session.initializeWithSignal(deadline.signal);
    deadline.clear();
    return session;
  } catch (error) {
    const startupError = normalizeDeadlineError(error, deadline.signal);
    try {
      if (session !== undefined) await session.rollbackStartup();
      else await disposeOwnedResources({ proxy });
    } catch (cleanupError) {
      dependencies.onCleanupError?.(normalizeError(cleanupError));
      throw new AggregateError(
        [startupError, normalizeError(cleanupError)],
        'Managed CDP startup failed and cleanup was incomplete',
        { cause: cleanupError },
      );
    } finally {
      deadline.clear();
    }
    throw startupError;
  }
}

class ManagedCdpSessionRuntime implements ManagedCdpSession {
  readonly #dependencies: ManagedCdpSessionDependencies;
  readonly #proxy: CdpHttpProxy;
  #activeOwnerUses = 0;
  #disposed = false;
  #disposePromise: Promise<void> | undefined;
  #generation: ManagedCdpReadyGeneration | undefined;
  #generationSeed = 0;
  #owner: ManagedCdpGenerationOwner | undefined;
  readonly #ownerIdleWaiters = new Set<() => void>();
  readonly #pendingCleanups = new Set<Promise<void>>();
  #pendingOwnerCleanup: Promise<void> | undefined;
  #restartAbort: (() => void) | undefined;
  #restartPromise: Promise<void> | undefined;

  constructor(dependencies: ManagedCdpSessionDependencies, proxy: CdpHttpProxy) {
    this.#dependencies = dependencies;
    this.#proxy = proxy;
  }

  get activeConnections(): number {
    return this.#proxy.activeConnections;
  }

  get externalPort(): number {
    return this.#proxy.port;
  }

  snapshot(): ManagedCdpSessionSnapshot {
    return this.#generation === undefined
      ? { generation: this.#generationSeed, state: 'unavailable' }
      : { ...this.#generation };
  }

  async initializeWithSignal(signal: AbortSignal): Promise<void> {
    this.#assertActive();
    const owner = await this.#createOwner(signal);
    this.#owner = owner;
    await this.#bootstrapOwner(owner, signal);
  }

  async rollbackStartup(): Promise<void> {
    this.#disposed = true;
    const owner = this.#owner;
    this.#owner = undefined;
    this.#generation = undefined;
    await disposeOwnedResources({
      proxy: this.#proxy,
      runtime: owner?.runtime,
      upstream: owner?.upstream,
    });
  }

  async bootstrapGeneration(): Promise<void> {
    this.#assertActive();
    if (this.#generation !== undefined) return;
    if (this.#restartPromise !== undefined) return await this.#restartPromise;

    const deadline = createDeadline(this.#dependencies.initialTimeoutMs ?? 60_000);
    this.#restartAbort = () => deadline.abort();
    const operation = this.#restartWithSignal(deadline.signal);
    this.#restartPromise = operation;
    try {
      await operation;
    } finally {
      deadline.clear();
      if (this.#restartPromise === operation) {
        this.#restartAbort = undefined;
        this.#restartPromise = undefined;
      }
    }
  }

  invalidateGeneration(): void {
    if (this.#disposed || this.#generation === undefined) return;
    this.#proxy.clearGeneration();
    this.#generation = undefined;
    this.#reportState();
  }

  async runBrowserTool(operation: (upstream: ManagedCdpUpstreamOwner) => Promise<unknown>): Promise<unknown> {
    this.#assertActive();
    if (this.#generation !== undefined) {
      await this.probeGeneration();
    }
    if (this.#generation === undefined) {
      try {
        await this.bootstrapGeneration();
      } catch {
        throw new Error('Managed CDP browser replacement failed');
      }
    }
    const generation = this.#generation;
    try {
      const result = await this.#useCurrentOwner(operation);
      if (this.#generation === generation) {
        await this.probeGeneration();
      }
      return result;
    } catch (error) {
      if (this.#generation === generation) this.invalidateGeneration();
      throw error;
    }
  }

  async runWithCurrentUpstream(
    operation: (upstream: ManagedCdpUpstreamOwner) => Promise<unknown>,
  ): Promise<unknown> {
    this.#assertActive();
    const restart = this.#restartPromise;
    if (restart !== undefined) await restart;
    return await this.#useCurrentOwner(operation);
  }

  async probeGeneration(signal?: AbortSignal): Promise<boolean> {
    this.#assertActive();
    const current = this.#generation;
    const owner = this.#owner;
    if (current === undefined || owner === undefined) return false;

    const deadline =
      signal === undefined ? createDeadline(this.#dependencies.initialTimeoutMs ?? 60_000) : undefined;
    const probeSignal = signal ?? deadline?.signal;
    if (probeSignal === undefined) throw new Error('Managed CDP probe signal is unavailable');
    try {
      const discovery = await withinDeadline(owner.chromium.probe(probeSignal), probeSignal);
      if (discovery.browserWebSocketUrl === current.browserWebSocketUrl) return true;
    } catch {
      // A failed identity probe invalidates only the generation that was probed.
    } finally {
      deadline?.clear();
    }
    if (this.#generation === current) this.invalidateGeneration();
    return false;
  }

  async dispose(): Promise<void> {
    if (this.#disposePromise !== undefined) return await this.#disposePromise;
    this.#disposed = true;
    this.#restartAbort?.();
    const restart = this.#restartPromise;

    this.#disposePromise = (async () => {
      if (restart !== undefined) await restart.catch(() => undefined);
      const errors: Error[] = [];
      const pendingOwnerCleanup = this.#pendingOwnerCleanup;
      if (pendingOwnerCleanup !== undefined) {
        await pendingOwnerCleanup.catch((error: unknown) => {
          const normalized = normalizeError(error);
          errors.push(normalized);
          this.#dependencies.onCleanupError?.(normalized);
        });
      }
      await this.#drainPendingCleanups().catch((error: unknown) => {
        errors.push(normalizeError(error));
      });
      this.#generation = undefined;
      this.#proxy.clearGeneration();
      const owner = this.#owner;
      this.#owner = undefined;
      await disposeOwnedResources({
        ordered: true,
        proxy: this.#proxy,
        releaseLease: errors.length === 0,
        runtime: owner?.runtime,
        upstream: owner?.upstream,
      }).catch((error: unknown) => {
        const normalized = normalizeError(error);
        errors.push(normalized);
        this.#dependencies.onCleanupError?.(normalized);
      });
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Managed CDP cleanup was incomplete');
      }
    })();
    return await this.#disposePromise;
  }

  async #bootstrapOwner(owner: ManagedCdpGenerationOwner, signal: AbortSignal): Promise<void> {
    this.#generation = undefined;
    const challenge = (this.#dependencies.createChallenge ?? createManagedCdpChallenge)();
    let challengePlaced = false;
    let challengeRemoved = false;

    try {
      await withinDeadline(owner.upstream.callTool('browser_tabs', { action: 'list' }), signal);
      await withinDeadline(
        owner.upstream.callTool('browser_evaluate', {
          function: createChallengePlacementFunction(
            challenge.propertyName,
            challenge.value,
            this.#dependencies.initialTimeoutMs ?? 60_000,
          ),
        }),
        signal,
      );
      challengePlaced = true;
      const discovery = await withinDeadline(owner.chromium.discover(signal), signal);
      const observed = await withinDeadline(
        owner.chromium.readAndDeleteChallenge(discovery.pageWebSocketUrl, challenge.propertyName, signal),
        signal,
      );
      challengeRemoved = true;
      if (observed !== challenge.value) {
        throw new Error('Chromium ownership challenge did not match');
      }

      const capability = (this.#dependencies.createCapability ?? generateCdpCapability)();
      const generation = this.#generationSeed + 1;
      const generationOptions = {
        capability,
        upstreamHost: owner.internalHost,
        upstreamPort: owner.internalPort,
      };
      const headers = this.#proxy.stageGeneration(generationOptions);
      const discoveryUrl = await withinDeadline(
        this.#dependencies.verifyExternal({ capability, headers, proxy: this.#proxy, signal }),
        signal,
      );
      validateExternalDiscoveryUrl(discoveryUrl, capability);
      this.#proxy.publishGeneration(generationOptions);
      this.#generationSeed = generation;
      this.#generation = {
        browserWebSocketUrl: discovery.browserWebSocketUrl,
        capability,
        discoveryUrl,
        generation,
        state: 'ready',
        upstreamHost: owner.internalHost,
        upstreamPort: owner.internalPort,
      };
      this.#reportState();
    } catch (error) {
      this.#proxy.clearGeneration();
      if (challengePlaced && !challengeRemoved) {
        const cleanup = owner.upstream.callTool('browser_evaluate', {
          function: createChallengeDeletionFunction(challenge.propertyName),
        });
        try {
          await withinDeadline(cleanup, signal);
        } catch {
          if (signal.aborted) {
            observeBackgroundCleanup(cleanup, this.#dependencies.onCleanupError, 'challenge');
            throw normalizeDeadlineError(error, signal);
          }
          throw new AggregateError(
            [normalizeError(error), new Error('Managed CDP challenge cleanup failed')],
            'Managed CDP bootstrap failed and challenge cleanup was incomplete',
          );
        }
      }
      throw normalizeDeadlineError(error, signal);
    }
  }

  async #createOwner(signal: AbortSignal): Promise<ManagedCdpGenerationOwner> {
    let reservation: Awaited<ReturnType<ManagedCdpSessionDependencies['reserveInternalPort']>> | undefined;
    let runtime: ManagedCdpRuntimeOwner | undefined;
    let upstream: ManagedCdpUpstreamOwner | undefined;

    try {
      reservation = await acquireWithinDeadline(
        this.#dependencies.reserveInternalPort(signal),
        signal,
        async (createdReservation) => await createdReservation.close(),
        this.#dependencies.onCleanupError,
        'reservation',
        (cleanup, label) => this.#trackCleanup(cleanup, label),
      );
      runtime = await acquireWithinDeadline(
        this.#dependencies.prepareRuntime({ internalPort: reservation.port }, signal),
        signal,
        async (createdRuntime) => await createdRuntime.dispose(),
        this.#dependencies.onCleanupError,
        'runtime',
        (cleanup, label) => this.#trackCleanup(cleanup, label),
      );
      upstream = await acquireWithinDeadline(
        this.#dependencies.connectUpstream(runtime, signal),
        signal,
        async (createdUpstream) => await createdUpstream.dispose(),
        this.#dependencies.onCleanupError,
        'upstream',
        (cleanup, label) => this.#trackCleanup(cleanup, label),
      );
      const internalHost = reservation.host;
      const internalPort = reservation.port;
      await withinDeadline(reservation.close(), signal);
      reservation = undefined;
      return {
        chromium: this.#dependencies.createChromiumClient({
          host: internalHost,
          port: internalPort,
        }),
        internalHost,
        internalPort,
        runtime,
        upstream,
      };
    } catch (error) {
      const cleanup = disposeOwnedResources({ reservation, runtime, upstream });
      if (signal.aborted) {
        this.#trackCleanup(cleanup, 'owner');
      } else {
        await cleanup.catch((cleanupError) => {
          this.#dependencies.onCleanupError?.(normalizeError(cleanupError));
        });
      }
      throw error;
    }
  }

  async #restartWithSignal(signal: AbortSignal): Promise<void> {
    this.#proxy.clearGeneration();
    this.#generation = undefined;
    await this.#waitForOwnerIdle(signal);
    const pendingOwnerCleanup = this.#pendingOwnerCleanup;
    if (pendingOwnerCleanup !== undefined) {
      await withinDeadline(pendingOwnerCleanup, signal);
    }
    await this.#drainPendingCleanups(signal);

    const previous = this.#owner;
    this.#owner = undefined;
    if (previous !== undefined) {
      const cleanup = this.#beginOwnerCleanup(previous);
      await withinDeadline(cleanup, signal);
    }

    this.#assertActive();
    const replacement = await this.#createOwner(signal);
    this.#owner = replacement;
    try {
      await this.#bootstrapOwner(replacement, signal);
    } catch (error) {
      if (this.#owner === replacement) this.#owner = undefined;
      const cleanup = this.#beginOwnerCleanup(replacement);
      try {
        await cleanup;
      } catch (cleanupError) {
        const normalizedError = normalizeError(error);
        const normalizedCleanupError = normalizeError(cleanupError);
        this.#dependencies.onCleanupError?.(normalizedCleanupError);
        throw new AggregateError(
          [normalizedError, normalizedCleanupError],
          'Managed CDP replacement failed and owner cleanup was incomplete',
          { cause: cleanupError },
        );
      }
      throw error;
    }
  }

  #beginOwnerCleanup(owner: ManagedCdpGenerationOwner): Promise<void> {
    const cleanup = disposeGenerationOwner(owner);
    this.#pendingOwnerCleanup = cleanup;
    void cleanup
      .then(() => {
        if (this.#pendingOwnerCleanup === cleanup) this.#pendingOwnerCleanup = undefined;
      })
      .catch(() => undefined);
    return cleanup;
  }

  async #useCurrentOwner<T>(operation: (upstream: ManagedCdpUpstreamOwner) => Promise<T>): Promise<T> {
    this.#assertActive();
    const owner = this.#owner;
    if (owner === undefined) throw new Error('Managed CDP upstream is unavailable');
    this.#activeOwnerUses += 1;
    try {
      return await operation(owner.upstream);
    } finally {
      this.#activeOwnerUses -= 1;
      if (this.#activeOwnerUses === 0) {
        for (const resolve of this.#ownerIdleWaiters) resolve();
        this.#ownerIdleWaiters.clear();
      }
    }
  }

  async #waitForOwnerIdle(signal: AbortSignal): Promise<void> {
    if (this.#activeOwnerUses === 0) return;
    await withinDeadline(
      new Promise<void>((resolve) => {
        this.#ownerIdleWaiters.add(resolve);
      }),
      signal,
    );
  }

  async #drainPendingCleanups(signal?: AbortSignal): Promise<void> {
    const errors: Error[] = [];
    while (this.#pendingCleanups.size > 0) {
      const pending = [...this.#pendingCleanups];
      const completion = Promise.allSettled(pending);
      const results = signal === undefined ? await completion : await withinDeadline(completion, signal);
      for (const cleanup of pending) this.#pendingCleanups.delete(cleanup);
      for (const result of results) {
        if (result.status === 'rejected') errors.push(normalizeError(result.reason));
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Managed CDP provisional cleanup was incomplete');
    }
  }

  #trackCleanup(cleanup: Promise<void>, label: string): void {
    this.#pendingCleanups.add(cleanup);
    observeBackgroundCleanup(cleanup, this.#dependencies.onCleanupError, label);
  }

  #assertActive(): void {
    if (this.#disposed) throw new Error('Managed CDP session disposed');
  }

  #reportState(): void {
    try {
      this.#dependencies.onStateChange?.(this.snapshot());
    } catch {
      // State observers are diagnostic and do not change lifecycle outcomes.
    }
  }
}

function createChallengePlacementFunction(propertyName: string, value: string, timeoutMs: number): string {
  return `() => { globalThis[${JSON.stringify(propertyName)}] = ${JSON.stringify(value)}; const propertyName = ${JSON.stringify(propertyName)}; setTimeout(() => { Reflect.deleteProperty(globalThis, propertyName); }, ${String(timeoutMs)}); }`;
}

function createChallengeDeletionFunction(propertyName: string): string {
  return `() => { delete globalThis[${JSON.stringify(propertyName)}]; }`;
}

export function createManagedCdpChallenge(): { propertyName: string; value: string } {
  return {
    propertyName: `__cloak_mcp_${generateCdpCapability()}`,
    value: generateCdpCapability(),
  };
}

function createDeadline(timeoutMs: number): {
  abort(): void;
  clear(): void;
  signal: AbortSignal;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref();
  return {
    abort: () => controller.abort(),
    clear: () => clearTimeout(timer),
    signal: controller.signal,
  };
}

async function withinDeadline<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error('Managed CDP bootstrap timed out');
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error('Managed CDP bootstrap timed out'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(normalizeError(error));
      },
    );
  });
}

async function acquireWithinDeadline<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  cleanup: (resource: T) => void | Promise<void>,
  onCleanupError: ManagedCdpSessionDependencies['onCleanupError'],
  label: string,
  trackCleanup?: (cleanup: Promise<void>, label: string) => void,
): Promise<T> {
  try {
    return await withinDeadline(promise, signal);
  } catch (error) {
    if (signal.aborted) {
      const lateCleanup = promise.then(
        async (resource) => await cleanup(resource),
        () => undefined,
      );
      if (trackCleanup === undefined) {
        observeBackgroundCleanup(lateCleanup, onCleanupError, label);
      } else {
        trackCleanup(lateCleanup, label);
      }
    }
    throw error;
  }
}

async function disposeGenerationOwner(owner: ManagedCdpGenerationOwner): Promise<void> {
  try {
    await owner.upstream.dispose();
  } catch (error) {
    throw new Error('Managed CDP upstream cleanup failed', { cause: error });
  }
  try {
    await owner.runtime.dispose();
  } catch (error) {
    throw new Error('Managed CDP runtime cleanup failed', { cause: error });
  }
}

async function disposeOwnedResources(resources: {
  ordered?: boolean;
  proxy?: CdpHttpProxy;
  releaseLease?: boolean;
  reservation?: Awaited<ReturnType<ManagedCdpSessionDependencies['reserveInternalPort']>>;
  runtime?: ManagedCdpRuntimeOwner;
  upstream?: ManagedCdpUpstreamOwner;
}): Promise<void> {
  if (resources.ordered === true && resources.proxy !== undefined) {
    return await disposeManagedResourcesInOrder(
      resources.proxy,
      resources.upstream,
      resources.runtime,
      resources.releaseLease ?? true,
    );
  }

  const errors: Error[] = [];
  if (resources.proxy !== undefined) {
    await resources.proxy.close().catch((error: unknown) => {
      errors.push(new Error('Managed CDP proxy cleanup failed', { cause: error }));
    });
  }
  let upstreamClosed = resources.upstream === undefined;
  if (resources.upstream !== undefined) {
    const upstream = resources.upstream;
    await Promise.resolve()
      .then(async () => await upstream.dispose())
      .then(
        () => {
          upstreamClosed = true;
        },
        (error: unknown) => {
          errors.push(new Error('Managed CDP upstream cleanup failed', { cause: error }));
        },
      );
  }
  if (resources.runtime !== undefined && upstreamClosed) {
    const runtime = resources.runtime;
    await Promise.resolve()
      .then(async () => await runtime.dispose())
      .catch((error: unknown) => {
        errors.push(new Error('Managed CDP runtime cleanup failed', { cause: error }));
      });
  }
  if (resources.reservation !== undefined) {
    await resources.reservation.close().catch((error: unknown) => {
      errors.push(new Error('Managed CDP reservation cleanup failed', { cause: error }));
    });
  }
  if (errors.length > 0) throw new AggregateError(errors, 'Managed CDP cleanup was incomplete');
}

async function disposeManagedResourcesInOrder(
  proxy: CdpHttpProxy,
  upstream: ManagedCdpUpstreamOwner | undefined,
  runtime: ManagedCdpRuntimeOwner | undefined,
  releaseLease: boolean,
): Promise<void> {
  const errors: Error[] = [];
  try {
    await proxy.stop();
  } catch {
    errors.push(new Error('Managed CDP proxy stop failed'));
  }

  let upstreamClosed = upstream === undefined;
  if (upstream !== undefined) {
    await Promise.resolve()
      .then(async () => await upstream.dispose())
      .then(
        () => {
          upstreamClosed = true;
        },
        (error: unknown) => {
          errors.push(new Error('Managed CDP upstream cleanup failed', { cause: error }));
        },
      );
  }
  if (runtime !== undefined && upstreamClosed) {
    await Promise.resolve()
      .then(async () => await runtime.dispose())
      .catch((error: unknown) => {
        errors.push(new Error('Managed CDP runtime cleanup failed', { cause: error }));
      });
  }

  if (releaseLease && errors.length === 0) {
    try {
      await proxy.release();
    } catch (error) {
      errors.push(new Error('Managed CDP proxy release failed', { cause: error }));
    }
  }
  if (errors.length > 0) throw new AggregateError(errors, 'Managed CDP cleanup was incomplete');
}

function observeBackgroundCleanup(
  cleanup: Promise<unknown>,
  onCleanupError: ManagedCdpSessionDependencies['onCleanupError'],
  label: string,
): void {
  cleanup.catch((error: unknown) =>
    onCleanupError?.(new Error(`Managed CDP ${label} cleanup failed`, { cause: error })),
  );
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function normalizeDeadlineError(error: unknown, signal: AbortSignal): Error {
  if (signal.aborted) return new Error('Managed CDP bootstrap timed out');
  return normalizeError(error);
}

function validateExternalDiscoveryUrl(discoveryUrl: string, capability: string): void {
  let parsed: URL;
  try {
    parsed = new URL(discoveryUrl);
  } catch {
    throw new Error('External CDP discovery URL is invalid');
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.pathname !== `/cdp/${capability}` ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('External CDP discovery URL is invalid');
  }
}
