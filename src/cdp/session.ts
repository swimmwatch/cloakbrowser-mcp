import type { CdpHttpProxy } from '#src/cdp/httpProxy';
import { generateCdpCapability } from '#src/cdp/capability';
import { serializeJavaScriptString } from '#src/cdp/script';
import type {
  ChromiumCdpClient,
  ManagedCdpReadyGeneration,
  ManagedCdpRuntimeOwner,
  ManagedCdpSessionDependencies,
  ManagedCdpSessionSnapshot,
  ManagedCdpUpstreamOwner,
} from '#src/cdp/types';
export type { ManagedCdpSessionDependencies } from '#src/cdp/types';
/** A bootstrap failure whose message contains only tool names and safe native termination codes. */
export class ManagedCdpBootstrapToolError extends Error {}
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
  const computedValue = dependencies.initialTimeoutMs ?? 60000;
  const deadline = createDeadline(computedValue);
  let proxy: CdpHttpProxy | undefined;
  let session: ManagedCdpSessionRuntime | undefined;
  try {
    const proxyResult = dependencies.createProxy(deadline.signal);
    proxy = await acquireWithinDeadline(
      proxyResult,
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
      else {
        const disposeOwnedResourcesOptions2 = { proxy } as const;
        await disposeOwnedResources(disposeOwnedResourcesOptions2);
      }
    } catch (cleanupError) {
      if (dependencies.onCleanupError) {
        const normalizedCleanupError = normalizeError(cleanupError);
        dependencies.onCleanupError(normalizedCleanupError);
      }
      const values: Iterable<unknown> = [startupError, normalizeError(cleanupError)];
      const aggregateErrorOptions = { cause: cleanupError } as const;
      throw new AggregateError(
        values,
        'Managed CDP startup failed and cleanup was incomplete',
        aggregateErrorOptions,
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
    const disposeOwnedResourcesOptions3 = {
      proxy: this.#proxy,
      runtime: owner?.runtime,
      upstream: owner?.upstream,
    } as const;
    await disposeOwnedResources(disposeOwnedResourcesOptions3);
  }
  async bootstrapGeneration(): Promise<void> {
    this.#assertActive();
    if (this.#generation !== undefined) return;
    if (this.#restartPromise !== undefined) return await this.#restartPromise;
    const computedValue2 = this.#dependencies.initialTimeoutMs ?? 60000;
    const deadline = createDeadline(computedValue2);
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
      signal === undefined
        ? (() => {
            const computedValue3 = this.#dependencies.initialTimeoutMs ?? 60000;
            return createDeadline(computedValue3);
          })()
        : undefined;
    const probeSignal = signal ?? deadline?.signal;
    if (probeSignal === undefined) throw new Error('Managed CDP probe signal is unavailable');
    try {
      const probeResult = owner.chromium.probe(probeSignal);
      const discovery = await withinDeadline(probeResult, probeSignal);
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
        const normalizeErrorResult = normalizeError(error);
        errors.push(normalizeErrorResult);
      });
      this.#generation = undefined;
      this.#proxy.clearGeneration();
      const owner = this.#owner;
      this.#owner = undefined;
      const disposeOwnedResourcesOptions4 = {
        ordered: true,
        proxy: this.#proxy,
        releaseLease: errors.length === 0,
        runtime: owner?.runtime,
        upstream: owner?.upstream,
      } as const;
      await disposeOwnedResources(disposeOwnedResourcesOptions4).catch((error: unknown) => {
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
      const callToolOptions = { action: 'list' } as const;
      const toolResult = owner.upstream.callTool('browser_tabs', callToolOptions);
      const withinDeadlineResult = await withinDeadline(toolResult, signal);
      assertBootstrapToolSucceeded(withinDeadlineResult, 'browser_tabs');
      const argumentValue = challenge.propertyName;
      const argumentValue2 = challenge.value;
      const computedValue4 = this.#dependencies.initialTimeoutMs ?? 60000;
      const challengePlacementFunctionResult = createChallengePlacementFunction(
        argumentValue,
        argumentValue2,
        computedValue4,
      );
      const callToolOptions2 = {
        function: challengePlacementFunctionResult,
      } as const;
      const toolResult2 = owner.upstream.callTool('browser_evaluate', callToolOptions2);
      const withinDeadlineResult2 = await withinDeadline(toolResult2, signal);
      assertBootstrapToolSucceeded(withinDeadlineResult2, 'browser_evaluate');
      challengePlaced = true;
      const discoverResult = owner.chromium.discover(signal);
      const discovery = await withinDeadline(discoverResult, signal);
      const andDeleteChallengeResult = owner.chromium.readAndDeleteChallenge(
        discovery.pageWebSocketUrl,
        challenge.propertyName,
        signal,
      );
      const observed = await withinDeadline(andDeleteChallengeResult, signal);
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
      const verifyExternalOptions = { capability, headers, proxy: this.#proxy, signal } as const;
      const verifyExternalResult = this.#dependencies.verifyExternal(verifyExternalOptions);
      const discoveryUrl = await withinDeadline(verifyExternalResult, signal);
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
        const callToolOptions3 = {
          function: createChallengeDeletionFunction(challenge.propertyName),
        } as const;
        const cleanup = owner.upstream.callTool('browser_evaluate', callToolOptions3);
        try {
          await withinDeadline(cleanup, signal);
        } catch {
          if (signal.aborted) {
            observeBackgroundCleanup(cleanup, this.#dependencies.onCleanupError, 'challenge');
            throw normalizeDeadlineError(error, signal);
          }
          const values2: Iterable<unknown> = [
            normalizeError(error),
            new Error('Managed CDP challenge cleanup failed'),
          ];
          throw new AggregateError(
            values2,
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
      const reserveInternalPortResult = this.#dependencies.reserveInternalPort(signal);
      reservation = await acquireWithinDeadline(
        reserveInternalPortResult,
        signal,
        async (createdReservation) => await createdReservation.close(),
        this.#dependencies.onCleanupError,
        'reservation',
        (cleanup, label) => this.#trackCleanup(cleanup, label),
      );
      const prepareRuntimeOptions = { internalPort: reservation.port } as const;
      const prepareRuntimeResult = this.#dependencies.prepareRuntime(prepareRuntimeOptions, signal);
      runtime = await acquireWithinDeadline(
        prepareRuntimeResult,
        signal,
        async (createdRuntime) => await createdRuntime.dispose(),
        this.#dependencies.onCleanupError,
        'runtime',
        (cleanup, label) => this.#trackCleanup(cleanup, label),
      );
      const connectUpstreamResult = this.#dependencies.connectUpstream(runtime, signal);
      upstream = await acquireWithinDeadline(
        connectUpstreamResult,
        signal,
        async (createdUpstream) => await createdUpstream.dispose(),
        this.#dependencies.onCleanupError,
        'upstream',
        (cleanup, label) => this.#trackCleanup(cleanup, label),
      );
      const internalHost = reservation.host;
      const internalPort = reservation.port;
      const closeResult = reservation.close();
      await withinDeadline(closeResult, signal);
      reservation = undefined;
      const createChromiumClientOptions = {
        host: internalHost,
        port: internalPort,
      } as const;
      const chromiumClientResult = this.#dependencies.createChromiumClient(createChromiumClientOptions);
      const currentInternalHost = internalHost;
      const currentInternalPort = internalPort;
      const currentRuntime = runtime;
      const currentUpstream = upstream;
      return {
        chromium: chromiumClientResult,
        internalHost: currentInternalHost,
        internalPort: currentInternalPort,
        runtime: currentRuntime,
        upstream: currentUpstream,
      };
    } catch (error) {
      const disposeOwnedResourcesOptions5 = { reservation, runtime, upstream } as const;
      const cleanup = disposeOwnedResources(disposeOwnedResourcesOptions5);
      if (signal.aborted) {
        this.#trackCleanup(cleanup, 'owner');
      } else {
        await cleanup.catch((cleanupError) => {
          if (this.#dependencies.onCleanupError) {
            const normalizedCleanupError = normalizeError(cleanupError);
            this.#dependencies.onCleanupError(normalizedCleanupError);
          }
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
        const values3: Iterable<unknown> = [normalizedError, normalizedCleanupError];
        const aggregateErrorOptions2 = { cause: cleanupError } as const;
        throw new AggregateError(
          values3,
          'Managed CDP replacement failed and owner cleanup was incomplete',
          aggregateErrorOptions2,
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
    const promise2 = new Promise<void>((resolve) => {
      this.#ownerIdleWaiters.add(resolve);
    });
    await withinDeadline(promise2, signal);
  }
  async #drainPendingCleanups(signal?: AbortSignal): Promise<void> {
    const errors: Error[] = [];
    while (this.#pendingCleanups.size > 0) {
      const pending = [...this.#pendingCleanups];
      const completion = Promise.allSettled(pending);
      const results = signal === undefined ? await completion : await withinDeadline(completion, signal);
      for (const cleanup of pending) this.#pendingCleanups.delete(cleanup);
      for (const result of results) {
        if (result.status === 'rejected') {
          const normalizeErrorResult2 = normalizeError(result.reason);
          errors.push(normalizeErrorResult2);
        }
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
      if (this.#dependencies.onStateChange) {
        const snapshot = this.snapshot();
        this.#dependencies.onStateChange(snapshot);
      }
    } catch {
      // State observers are diagnostic and do not change lifecycle outcomes.
    }
  }
}
function assertBootstrapToolSucceeded(result: unknown, name: string): void {
  if (typeof result === 'object' && result !== null && 'isError' in result && result.isError === true) {
    // Expose only native termination codes, never upstream launch arguments, paths or credentials.
    const content: unknown[] = 'content' in result && Array.isArray(result.content) ? result.content : [];
    const codes: string[] = [];
    for (const item of content) {
      if (typeof item !== 'object' || item === null || !('text' in item) || typeof item.text !== 'string')
        continue;
      const matches = item.text.match(
        /\b(?:exitCode=-?\d{1,10}|signal=SIG(?:ABRT|BUS|FPE|ILL|INT|KILL|PIPE|SEGV|TERM|TRAP|XCPU|XFSZ)|EADDRINUSE|ECONNREFUSED)\b/gu,
      );
      if (matches) codes.push(...matches);
    }
    const codeSet = new Set(codes);
    const codeList = [...codeSet];
    const uniqueCodes = codeList.join(', ');
    const detail = uniqueCodes ? ` (${uniqueCodes})` : '';
    const message = `Managed CDP bootstrap tool ${name} failed${detail}`;
    throw new ManagedCdpBootstrapToolError(message);
  }
}
function createChallengePlacementFunction(propertyName: string, value: string, timeoutMs: number): string {
  const propertyLiteral = serializeJavaScriptString(propertyName);
  const valueLiteral = serializeJavaScriptString(value);
  const timeoutLiteral = String(timeoutMs);
  return `() => { globalThis[${propertyLiteral}] = ${valueLiteral}; const propertyName = ${propertyLiteral}; setTimeout(() => { Reflect.deleteProperty(globalThis, propertyName); }, ${timeoutLiteral}); }`;
}
function createChallengeDeletionFunction(propertyName: string): string {
  const propertyLiteral = serializeJavaScriptString(propertyName);
  return `() => { delete globalThis[${propertyLiteral}]; }`;
}
export function createManagedCdpChallenge(): {
  propertyName: string;
  value: string;
} {
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
    const onAbort = () => {
      const error2 = new Error('Managed CDP bootstrap timed out');
      return reject(error2);
    };
    const addEventListenerOptions = { once: true } as const;
    signal.addEventListener('abort', onAbort, addEventListenerOptions);
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        const normalizeErrorResult3 = normalizeError(error);
        reject(normalizeErrorResult3);
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
    const errorOptions = { cause: error } as const;
    throw new Error('Managed CDP upstream cleanup failed', errorOptions);
  }
  try {
    await owner.runtime.dispose();
  } catch (error) {
    const errorOptions2 = { cause: error } as const;
    throw new Error('Managed CDP runtime cleanup failed', errorOptions2);
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
    const argumentValue3 = resources.proxy;
    const argumentValue4 = resources.upstream;
    const argumentValue5 = resources.runtime;
    const computedValue5 = resources.releaseLease ?? true;
    return await disposeManagedResourcesInOrder(
      argumentValue3,
      argumentValue4,
      argumentValue5,
      computedValue5,
    );
  }
  const errors: Error[] = [];
  if (resources.proxy !== undefined) {
    await resources.proxy.close().catch((error: unknown) => {
      const errorOptions3 = { cause: error } as const;
      const error3 = new Error('Managed CDP proxy cleanup failed', errorOptions3);
      errors.push(error3);
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
          const errorOptions4 = { cause: error } as const;
          const error4 = new Error('Managed CDP upstream cleanup failed', errorOptions4);
          errors.push(error4);
        },
      );
  }
  if (resources.runtime !== undefined && upstreamClosed) {
    const runtime = resources.runtime;
    await Promise.resolve()
      .then(async () => await runtime.dispose())
      .catch((error: unknown) => {
        const errorOptions5 = { cause: error } as const;
        const error5 = new Error('Managed CDP runtime cleanup failed', errorOptions5);
        errors.push(error5);
      });
  }
  if (resources.reservation !== undefined) {
    await resources.reservation.close().catch((error: unknown) => {
      const errorOptions6 = { cause: error } as const;
      const error6 = new Error('Managed CDP reservation cleanup failed', errorOptions6);
      errors.push(error6);
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
    const error7 = new Error('Managed CDP proxy stop failed');
    errors.push(error7);
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
          const errorOptions7 = { cause: error } as const;
          const error8 = new Error('Managed CDP upstream cleanup failed', errorOptions7);
          errors.push(error8);
        },
      );
  }
  if (runtime !== undefined && upstreamClosed) {
    await Promise.resolve()
      .then(async () => await runtime.dispose())
      .catch((error: unknown) => {
        const errorOptions8 = { cause: error } as const;
        const error9 = new Error('Managed CDP runtime cleanup failed', errorOptions8);
        errors.push(error9);
      });
  }
  if (releaseLease && errors.length === 0) {
    try {
      await proxy.release();
    } catch (error) {
      const errorOptions9 = { cause: error } as const;
      const error10 = new Error('Managed CDP proxy release failed', errorOptions9);
      errors.push(error10);
    }
  }
  if (errors.length > 0) throw new AggregateError(errors, 'Managed CDP cleanup was incomplete');
}
function observeBackgroundCleanup(
  cleanup: Promise<unknown>,
  onCleanupError: ManagedCdpSessionDependencies['onCleanupError'],
  label: string,
): void {
  cleanup.catch((error: unknown) => {
    if (onCleanupError) {
      const message = `Managed CDP ${label} cleanup failed`;
      const errorOptions = { cause: error };
      const cleanupError = new Error(message, errorOptions);
      onCleanupError(cleanupError);
    }
  });
}
function normalizeError(error: unknown): Error {
  return error instanceof Error
    ? error
    : (() => {
        const stringResult = String(error);
        return new Error(stringResult);
      })();
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
