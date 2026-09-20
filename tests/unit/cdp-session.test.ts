import { describe, expect, it, vi } from 'vitest';

import { isCdpCapability } from '@/cdp/capability.js';
import {
  createManagedCdpChallenge,
  type ManagedCdpSessionDependencies,
  startManagedCdpSession,
} from '@/cdp/session.js';

describe('managed CDP generation coordinator', () => {
  it('creates independent challenge property and value material with capability entropy', () => {
    const challenge = createManagedCdpChallenge();

    expect(challenge.propertyName).toMatch(/^__cloak_mcp_[A-Za-z0-9_-]{43}$/u);
    expect(isCdpCapability(challenge.propertyName.slice('__cloak_mcp_'.length))).toBe(true);
    expect(isCdpCapability(challenge.value)).toBe(true);
    expect(challenge.propertyName).not.toContain(challenge.value);
  });

  it('holds the internal reservation through connection and publishes only after challenge and readiness', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);

    expect(harness.events).toEqual([
      'create-proxy',
      'reserve-internal',
      'prepare-runtime:43123',
      'connect-upstream',
      'release-internal',
      'browser_tabs',
      'browser_evaluate:set',
      'discover',
      'read-delete:__cloak_challenge',
      'stage:capability-1',
      'verify-external:capability-1',
      'publish:capability-1',
      'state:ready:1',
    ]);
    expect(session.snapshot()).toEqual({
      browserWebSocketUrl: 'ws://127.0.0.1:43123/devtools/browser/browser-1',
      capability: 'capability-1',
      discoveryUrl: 'http://127.0.0.1:9222/cdp/capability-1',
      generation: 1,
      state: 'ready',
      upstreamHost: '127.0.0.1',
      upstreamPort: 43123,
    });
    expect(harness.callTool).toHaveBeenCalledTimes(2);

    await session.dispose();
  });

  it('rolls back every provisional owner when the challenge is wrong', async () => {
    const harness = createHarness({ challengeResult: 'wrong-value' });

    await expect(startManagedCdpSession(harness.dependencies)).rejects.toThrow('ownership challenge');
    expect(harness.events).toEqual([
      'create-proxy',
      'reserve-internal',
      'prepare-runtime:43123',
      'connect-upstream',
      'release-internal',
      'browser_tabs',
      'browser_evaluate:set',
      'discover',
      'read-delete:__cloak_challenge',
      'proxy-clear',
      'proxy-close',
      'upstream-dispose',
      'runtime-dispose',
    ]);
  });

  it('uses one absolute deadline and rolls back a hung bootstrap', async () => {
    const harness = createHarness({ hangTabs: true, initialTimeoutMs: 20 });
    const startedAt = Date.now();

    await expect(startManagedCdpSession(harness.dependencies)).rejects.toThrow('timed out');
    expect(Date.now() - startedAt).toBeLessThan(500);
    expect(harness.events).toContain('proxy-close');
    expect(harness.events).toContain('upstream-dispose');
    expect(harness.events).toContain('runtime-dispose');
  });

  it('does not reset the absolute deadline between bootstrap phases', async () => {
    const harness = createHarness({ initialTimeoutMs: 45, phaseDelayMs: 20 });

    await expect(startManagedCdpSession(harness.dependencies)).rejects.toThrow('timed out');
    expect(harness.events).toContain('browser_tabs');
    expect(harness.events).toContain('browser_evaluate:set');
    expect(harness.events).toContain('discover');
    expect(harness.events).toContain('proxy-close');
  });

  it('removes a placed challenge and rolls back when discovery fails', async () => {
    const harness = createHarness({ discoverError: new Error('missing page target') });

    await expect(startManagedCdpSession(harness.dependencies)).rejects.toThrow('missing page target');
    expect(harness.events).toContain('browser_evaluate:delete');
    expect(harness.events).toContain('proxy-clear');
    expect(harness.events.slice(-3)).toEqual(['proxy-close', 'upstream-dispose', 'runtime-dispose']);
  });

  it('rolls back a provisional generation when external readiness fails', async () => {
    const harness = createHarness({ verifyExternalError: new Error('external discovery unusable') });

    await expect(startManagedCdpSession(harness.dependencies)).rejects.toThrow('external discovery unusable');
    expect(harness.events).toContain('stage:capability-1');
    expect(harness.events).not.toContain('publish:capability-1');
    expect(harness.events).toContain('proxy-clear');
    expect(harness.events).toContain('proxy-close');
  });

  it('invalidates changed identity and publishes a monotonic replacement generation', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);

    harness.browserIdentity = 'ws://127.0.0.1:43123/devtools/browser/browser-2';
    await expect(session.probeGeneration()).resolves.toBe(false);
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });

    harness.nextCapability = 'capability-2';
    await session.bootstrapGeneration();
    expect(session.snapshot()).toMatchObject({
      browserWebSocketUrl: harness.browserIdentity,
      capability: 'capability-2',
      generation: 2,
      state: 'ready',
    });

    await session.dispose();
  });

  it('replaces a lost browser before forwarding the next browser tool', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);
    harness.browserIdentity = 'ws://127.0.0.1:43123/devtools/browser/browser-2';
    harness.nextCapability = 'capability-2';

    await expect(
      session.runBrowserTool(async (owner) => await owner.callTool('browser_navigate', {})),
    ).resolves.toEqual({});

    expect(session.snapshot()).toMatchObject({ capability: 'capability-2', generation: 2 });
    expect(harness.events.indexOf('publish:capability-2')).toBeLessThan(
      harness.events.indexOf('tool:browser_navigate'),
    );
    await session.dispose();
  });

  it('invalidates a generation lost during a browser tool without rewriting its result', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);

    await expect(
      session.runBrowserTool(async () => {
        harness.browserIdentity = 'ws://127.0.0.1:43123/devtools/browser/browser-2';
        return 'forwarded-result';
      }),
    ).resolves.toBe('forwarded-result');
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });
    await session.dispose();
  });

  it('invalidates the active generation when browser tool transport fails', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);

    await expect(
      session.runBrowserTool(async () => {
        throw new Error('upstream transport closed');
      }),
    ).rejects.toThrow('upstream transport closed');
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });
    await session.dispose();
  });

  it('invalidates a generation explicitly and coalesces concurrent replacement bootstrap', async () => {
    const harness = createHarness({ phaseDelayMs: 5 });
    const session = await startManagedCdpSession(harness.dependencies);

    session.invalidateGeneration();
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });

    harness.nextCapability = 'capability-2';
    await Promise.all([session.bootstrapGeneration(), session.bootstrapGeneration()]);

    expect(session.snapshot()).toMatchObject({
      capability: 'capability-2',
      generation: 2,
      state: 'ready',
    });
    expect(harness.events.filter((event) => event === 'stage:capability-2')).toHaveLength(1);
    expect(harness.events.filter((event) => event === 'publish:capability-2')).toHaveLength(1);
    expect(harness.events.filter((event) => event === 'reserve-internal')).toHaveLength(2);
    expect(harness.events.filter((event) => event === 'connect-upstream')).toHaveLength(2);
    expect(harness.events.filter((event) => event === 'upstream-dispose')).toHaveLength(1);
    expect(harness.events.filter((event) => event === 'runtime-dispose')).toHaveLength(1);
    expect(harness.events.indexOf('upstream-dispose')).toBeLessThan(
      harness.events.lastIndexOf('reserve-internal'),
    );

    await session.dispose();
  });

  it('does not restart on loss or tool listing and forwards concurrent browser calls once', async () => {
    const harness = createHarness({ phaseDelayMs: 5 });
    const session = await startManagedCdpSession(harness.dependencies);

    session.invalidateGeneration();
    await session.runWithCurrentUpstream(async (owner) => await owner.listTools());
    expect(harness.events.filter((event) => event === 'reserve-internal')).toHaveLength(1);
    expect(harness.events).toContain('list-tools');

    harness.nextCapability = 'capability-2';
    await Promise.all([
      session.runBrowserTool(async (owner) => await owner.callTool('browser_navigate', {})),
      session.runBrowserTool(async (owner) => await owner.callTool('browser_snapshot', {})),
    ]);

    expect(harness.events.filter((event) => event === 'reserve-internal')).toHaveLength(2);
    expect(harness.callTool.mock.calls.filter(([name]) => name === 'browser_navigate')).toHaveLength(1);
    expect(harness.callTool.mock.calls.filter(([name]) => name === 'browser_snapshot')).toHaveLength(1);
    expect(harness.events.indexOf('publish:capability-2')).toBeLessThan(
      harness.events.indexOf('tool:browser_navigate'),
    );
    expect(harness.events).not.toContain('proxy-release');
    expect(session.snapshot()).toMatchObject({ capability: 'capability-2', generation: 2 });
    await session.dispose();
  });

  it('forwards nothing on replacement failure and permits a later bounded attempt', async () => {
    const options: Parameters<typeof createHarness>[0] = {};
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    const forward = vi.fn(async () => 'forwarded');

    session.invalidateGeneration();
    options.discoverError = new Error('replacement discovery failed');
    await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });

    options.discoverError = undefined;
    harness.nextCapability = 'capability-2';
    await expect(session.runBrowserTool(forward)).resolves.toBe('forwarded');
    expect(forward).toHaveBeenCalledTimes(1);
    expect(harness.events.filter((event) => event === 'reserve-internal')).toHaveLength(3);
    expect(session.snapshot()).toMatchObject({ capability: 'capability-2', generation: 2 });
    await session.dispose();
  });

  it('does not create a replacement after old-owner cleanup fails', async () => {
    const options: Parameters<typeof createHarness>[0] = {
      upstreamDisposeErrorAt: 1,
    };
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    const forward = vi.fn(async () => 'forwarded');

    session.invalidateGeneration();
    await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
    options.upstreamDisposeErrorAt = undefined;
    harness.nextCapability = 'capability-2';

    await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    expect(harness.events.filter((event) => event === 'connect-upstream')).toHaveLength(1);
    expect(harness.events.filter((event) => event.startsWith('prepare-runtime:'))).toHaveLength(1);
    expect(harness.events).not.toContain('runtime-dispose');
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });

    await expect(session.dispose()).rejects.toThrow('cleanup was incomplete');
    expect(harness.events).not.toContain('proxy-release');
  });

  it('does not forget a provisional replacement whose cleanup fails', async () => {
    const options: Parameters<typeof createHarness>[0] = {
      upstreamDisposeErrorAt: 2,
    };
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    const forward = vi.fn(async () => 'forwarded');

    session.invalidateGeneration();
    options.discoverError = new Error('replacement discovery failed');
    await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
    options.discoverError = undefined;
    options.upstreamDisposeErrorAt = undefined;
    harness.nextCapability = 'capability-2';

    await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    expect(harness.events.filter((event) => event === 'connect-upstream')).toHaveLength(2);
    expect(harness.events.filter((event) => event.startsWith('prepare-runtime:'))).toHaveLength(2);
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });

    await expect(session.dispose()).rejects.toThrow('cleanup was incomplete');
    expect(harness.events).not.toContain('proxy-release');
  });

  it('cleans every pre-forward replacement phase and retries only on a later call', async () => {
    const phases = [
      'reserveError',
      'prepareRuntimeError',
      'connectUpstreamError',
      'tabsError',
      'discoverError',
      'verifyExternalError',
    ] as const;

    for (const phase of phases) {
      const options: Parameters<typeof createHarness>[0] = {};
      const harness = createHarness(options);
      const session = await startManagedCdpSession(harness.dependencies);
      const forward = vi.fn(async () => phase);
      session.invalidateGeneration();
      options[phase] = new Error(`${phase} failed`);

      await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
      expect(forward).not.toHaveBeenCalled();
      expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });
      expect(harness.events).not.toContain('publish:capability-2');

      options[phase] = undefined;
      harness.nextCapability = 'capability-2';
      await expect(session.runBrowserTool(forward)).resolves.toBe(phase);
      expect(forward).toHaveBeenCalledTimes(1);
      await session.dispose();
    }
  });

  it('keeps the absolute restart deadline while waiting for old-owner cleanup', async () => {
    const options: Parameters<typeof createHarness>[0] = { initialTimeoutMs: 20 };
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    session.invalidateGeneration();
    options.upstreamDisposeDelayMs = 35;

    const forward = vi.fn(async () => undefined);
    await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();

    options.upstreamDisposeDelayMs = undefined;
    harness.nextCapability = 'capability-2';
    await session.runBrowserTool(forward);
    expect(harness.events.indexOf('upstream-dispose')).toBeLessThan(
      harness.events.lastIndexOf('reserve-internal'),
    );
    await session.dispose();
  });

  it('uses one absolute deadline for old-owner cleanup and replacement readiness', async () => {
    const options: Parameters<typeof createHarness>[0] = { initialTimeoutMs: 35 };
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    session.invalidateGeneration();
    options.upstreamDisposeDelayMs = 20;
    options.phaseDelayMs = 10;

    const forward = vi.fn(async () => undefined);
    await expect(session.runBrowserTool(forward)).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });
    options.phaseDelayMs = undefined;
    options.upstreamDisposeDelayMs = undefined;
    await session.dispose();
  });

  it('waits for an in-flight restart before listing through the current owner', async () => {
    const options: Parameters<typeof createHarness>[0] = {};
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    session.invalidateGeneration();
    harness.nextCapability = 'capability-2';
    let releaseTabs: (() => void) | undefined;
    options.tabsGate = new Promise<void>((resolve) => {
      releaseTabs = resolve;
    });

    const browserCall = session.runBrowserTool(async (owner) => await owner.callTool('browser_navigate', {}));
    await vi.waitFor(() =>
      expect(harness.events.filter((event) => event === 'browser_tabs')).toHaveLength(2),
    );
    const listTools = session.runWithCurrentUpstream(async (owner) => await owner.listTools());
    await delay(5);
    expect(harness.events).not.toContain('list-tools');
    releaseTabs?.();
    await Promise.all([browserCall, listTools]);

    expect(harness.events.filter((event) => event === 'list-tools')).toHaveLength(1);
    expect(harness.events.indexOf('publish:capability-2')).toBeLessThan(harness.events.indexOf('list-tools'));
    await session.dispose();
  });

  it('cancels an in-flight restart before releasing the external lease', async () => {
    const options: Parameters<typeof createHarness>[0] = { initialTimeoutMs: 200 };
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    session.invalidateGeneration();
    harness.nextCapability = 'capability-2';
    options.hangTabs = true;

    const browserCall = session.runBrowserTool(async (owner) => await owner.callTool('browser_navigate', {}));
    await vi.waitFor(() =>
      expect(harness.events.filter((event) => event === 'browser_tabs')).toHaveLength(2),
    );
    const startedAt = Date.now();
    await session.dispose();
    expect(Date.now() - startedAt).toBeLessThan(100);
    await expect(browserCall).rejects.toThrow('Managed CDP browser replacement failed');

    expect(harness.events).not.toContain('publish:capability-2');
    expect(harness.events.at(-1)).toBe('proxy-release');
    expect(harness.events.filter((event) => event === 'connect-upstream')).toHaveLength(2);
    expect(harness.events.filter((event) => event === 'upstream-dispose')).toHaveLength(2);
    expect(harness.events.filter((event) => event === 'runtime-dispose')).toHaveLength(2);
  });

  it('waits for a cancelled replacement connection and provisional cleanup before releasing the lease', async () => {
    const options: Parameters<typeof createHarness>[0] = { initialTimeoutMs: 200 };
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    let releaseConnect: (() => void) | undefined;
    let releaseRuntime: (() => void) | undefined;
    options.replacementConnectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    options.replacementRuntimeDisposeGate = new Promise<void>((resolve) => {
      releaseRuntime = resolve;
    });
    session.invalidateGeneration();

    const browserCall = session
      .runBrowserTool(async () => 'forwarded')
      .then(
        () => undefined,
        (error: unknown) => error,
      );
    await vi.waitFor(() =>
      expect(harness.events.filter((event) => event === 'connect-upstream')).toHaveLength(2),
    );
    const disposal = session.dispose();
    await delay(10);
    expect(harness.events).not.toContain('proxy-release');

    releaseConnect?.();
    await vi.waitFor(() =>
      expect(harness.events.filter((event) => event === 'upstream-dispose')).toHaveLength(2),
    );
    expect(harness.events).not.toContain('proxy-release');

    releaseRuntime?.();
    await disposal;
    await expect(browserCall).resolves.toEqual(
      expect.objectContaining({
        message: 'Managed CDP browser replacement failed',
      }),
    );
    expect(harness.events.at(-1)).toBe('proxy-release');
    expect(harness.events.filter((event) => event === 'release-internal')).toHaveLength(2);
    expect(harness.events.filter((event) => event === 'runtime-dispose')).toHaveLength(2);
  });

  it('disposes a resource that resolves after the admission deadline', async () => {
    const harness = createHarness({ createProxyDelayMs: 30, initialTimeoutMs: 10 });

    await expect(startManagedCdpSession(harness.dependencies)).rejects.toThrow('timed out');
    await vi.waitFor(() => expect(harness.events).toContain('proxy-close'));
    expect(harness.events).not.toContain('reserve-internal');
  });

  it('does not wait past the admission deadline for a hung reservation handoff', async () => {
    const harness = createHarness({ hangReservationClose: true, initialTimeoutMs: 10 });
    const startedAt = Date.now();

    await expect(startManagedCdpSession(harness.dependencies)).rejects.toThrow('timed out');
    expect(Date.now() - startedAt).toBeLessThan(500);
    await vi.waitFor(() => {
      expect(harness.events).toContain('proxy-close');
      expect(harness.events).toContain('upstream-dispose');
      expect(harness.events).toContain('runtime-dispose');
    });
  });

  it('preserves runtime ownership and the external lease when upstream cleanup fails', async () => {
    const harness = createHarness({
      proxyCloseError: new Error('proxy close failed'),
      runtimeDisposeError: new Error('runtime dispose failed'),
      upstreamDisposeError: new Error('upstream dispose failed'),
    });
    const session = await startManagedCdpSession(harness.dependencies);

    await expect(session.dispose()).rejects.toThrow('cleanup was incomplete');
    expect(harness.events.slice(-2)).toEqual(['proxy-stop', 'upstream-dispose']);
    expect(harness.events).not.toContain('runtime-dispose');
    expect(harness.events).not.toContain('proxy-release');
    expect(harness.cleanupErrors).toEqual([
      expect.objectContaining({ message: 'Managed CDP cleanup was incomplete' }),
    ]);
    const eventCount = harness.events.length;
    await expect(session.dispose()).rejects.toThrow('cleanup was incomplete');
    expect(harness.events).toHaveLength(eventCount);
  });

  it('stops the proxy before owner cleanup and releases its lease last', async () => {
    const harness = createHarness({
      proxyStopDelayMs: 5,
      runtimeDisposeDelayMs: 15,
      upstreamDisposeDelayMs: 25,
    });
    const session = await startManagedCdpSession(harness.dependencies);

    await session.dispose();

    const stopIndex = harness.events.indexOf('proxy-stop');
    const runtimeIndex = harness.events.indexOf('runtime-dispose');
    const upstreamIndex = harness.events.indexOf('upstream-dispose');
    const releaseIndex = harness.events.indexOf('proxy-release');
    expect(stopIndex).toBeGreaterThan(-1);
    expect(runtimeIndex).toBeGreaterThan(stopIndex);
    expect(upstreamIndex).toBeGreaterThan(stopIndex);
    expect(runtimeIndex).toBeGreaterThan(upstreamIndex);
    expect(releaseIndex).toBeGreaterThan(runtimeIndex);
    expect(releaseIndex).toBeGreaterThan(upstreamIndex);
  });

  it('surfaces replacement challenge cleanup failure and leaves CDP unavailable', async () => {
    const options: Parameters<typeof createHarness>[0] = {};
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    options.discoverError = new Error('replacement discovery failed');
    options.deleteChallengeError = new Error('challenge cleanup failed');
    session.invalidateGeneration();

    await expect(session.bootstrapGeneration()).rejects.toThrow('challenge cleanup was incomplete');
    expect(harness.events).toContain('browser_evaluate:delete');
    expect(session.snapshot()).toEqual({ generation: 1, state: 'unavailable' });

    options.proxyCloseError = undefined;
    await session.dispose();
  });
});

function createHarness(
  options: {
    challengeResult?: string;
    connectUpstreamError?: Error;
    createProxyDelayMs?: number;
    deleteChallengeError?: Error;
    discoverError?: Error;
    hangTabs?: boolean;
    hangReservationClose?: boolean;
    initialTimeoutMs?: number;
    phaseDelayMs?: number;
    prepareRuntimeError?: Error;
    proxyCloseError?: Error;
    proxyStopDelayMs?: number;
    runtimeDisposeDelayMs?: number;
    runtimeDisposeError?: Error;
    reserveError?: Error;
    replacementConnectGate?: Promise<void>;
    replacementRuntimeDisposeGate?: Promise<void>;
    tabsError?: Error;
    tabsGate?: Promise<void>;
    upstreamDisposeDelayMs?: number;
    upstreamDisposeError?: Error;
    upstreamDisposeErrorAt?: number;
    verifyExternalError?: Error;
  } = {},
): {
  browserIdentity: string;
  callTool: ReturnType<typeof vi.fn>;
  cleanupErrors: Error[];
  dependencies: ManagedCdpSessionDependencies;
  events: string[];
  nextCapability: string;
} {
  const state = {
    browserIdentity: 'ws://127.0.0.1:43123/devtools/browser/browser-1',
    nextCapability: 'capability-1',
  };
  const events: string[] = [];
  const cleanupErrors: Error[] = [];
  let runtimeCount = 0;
  let upstreamCount = 0;
  const callTool = vi.fn(async (name: string, arguments_: Record<string, unknown>) => {
    const functionValue = arguments_.function;
    const source = typeof functionValue === 'string' ? functionValue : '';
    events.push(
      name === 'browser_tabs'
        ? 'browser_tabs'
        : name !== 'browser_evaluate'
          ? `tool:${name}`
          : source.includes('delete globalThis')
            ? 'browser_evaluate:delete'
            : 'browser_evaluate:set',
    );
    if (name === 'browser_tabs' && options.tabsError !== undefined) throw options.tabsError;
    if (name === 'browser_tabs' && options.tabsGate !== undefined) await options.tabsGate;
    if (name === 'browser_tabs' && options.hangTabs === true) await new Promise(() => undefined);
    if (source.includes('delete globalThis') && options.deleteChallengeError !== undefined) {
      throw options.deleteChallengeError;
    }
    if (options.phaseDelayMs !== undefined) await delay(options.phaseDelayMs);
    return {};
  });
  const dependencies: ManagedCdpSessionDependencies = {
    initialTimeoutMs: options.initialTimeoutMs,
    createCapability: () => state.nextCapability,
    createChallenge: () => ({ propertyName: '__cloak_challenge', value: 'challenge-value' }),
    createProxy: async () => {
      events.push('create-proxy');
      if (options.createProxyDelayMs !== undefined) await delay(options.createProxyDelayMs);
      return {
        activeConnections: 0,
        clearGeneration: () => events.push('proxy-clear'),
        close: async () => {
          events.push('proxy-close');
          if (options.proxyCloseError !== undefined) throw options.proxyCloseError;
        },
        port: 9222,
        publishGeneration: ({ capability }) => events.push(`publish:${capability}`),
        setUnavailableCapability: (capability) => events.push(`unavailable:${capability}`),
        stageGeneration: ({ capability }) => {
          events.push(`stage:${capability}`);
          return { 'x-cloakbrowser-cdp-readiness': 'probe-token' };
        },
        stop: async () => {
          if (options.proxyStopDelayMs !== undefined) await delay(options.proxyStopDelayMs);
          events.push('proxy-stop');
          if (options.proxyCloseError !== undefined) throw options.proxyCloseError;
        },
        release: async () => {
          events.push('proxy-release');
        },
      };
    },
    onCleanupError: (error) => cleanupErrors.push(error),
    onStateChange: (snapshot) => events.push(`state:${snapshot.state}:${snapshot.generation}`),
    reserveInternalPort: async () => {
      events.push('reserve-internal');
      if (options.reserveError !== undefined) throw options.reserveError;
      return {
        host: '127.0.0.1',
        port: 43123,
        close: async () => {
          events.push('release-internal');
          if (options.hangReservationClose === true) await new Promise(() => undefined);
        },
      };
    },
    prepareRuntime: async ({ internalPort }) => {
      runtimeCount += 1;
      const runtimeNumber = runtimeCount;
      events.push(`prepare-runtime:${internalPort}`);
      if (options.prepareRuntimeError !== undefined) throw options.prepareRuntimeError;
      return {
        dispose: async () => {
          if (runtimeNumber > 1 && options.replacementRuntimeDisposeGate !== undefined) {
            await options.replacementRuntimeDisposeGate;
          }
          if (options.runtimeDisposeDelayMs !== undefined) {
            await delay(options.runtimeDisposeDelayMs);
          }
          events.push('runtime-dispose');
          if (options.runtimeDisposeError !== undefined) throw options.runtimeDisposeError;
        },
      };
    },
    connectUpstream: async () => {
      upstreamCount += 1;
      const ownerNumber = upstreamCount;
      events.push('connect-upstream');
      if (options.connectUpstreamError !== undefined) throw options.connectUpstreamError;
      if (upstreamCount > 1 && options.replacementConnectGate !== undefined) {
        await options.replacementConnectGate;
      }
      return {
        callTool,
        dispose: async () => {
          if (options.upstreamDisposeDelayMs !== undefined) {
            await delay(options.upstreamDisposeDelayMs);
          }
          events.push('upstream-dispose');
          if (options.upstreamDisposeError !== undefined) throw options.upstreamDisposeError;
          if (options.upstreamDisposeErrorAt === ownerNumber) {
            throw new Error(`upstream ${String(ownerNumber)} cleanup failed`);
          }
        },
        listTools: async () => {
          events.push('list-tools');
          return { tools: [] };
        },
      };
    },
    createChromiumClient: () => ({
      discover: async () => {
        events.push('discover');
        if (options.phaseDelayMs !== undefined) await delay(options.phaseDelayMs);
        if (options.discoverError !== undefined) throw options.discoverError;
        return {
          browserWebSocketUrl: state.browserIdentity,
          pageWebSocketUrl: 'ws://127.0.0.1:43123/devtools/page/page-1',
        };
      },
      probe: async () => {
        events.push('probe');
        if (options.discoverError !== undefined) throw options.discoverError;
        return {
          browserWebSocketUrl: state.browserIdentity,
          pageWebSocketUrl: 'ws://127.0.0.1:43123/devtools/page/page-1',
        };
      },
      readAndDeleteChallenge: async (_pageUrl, propertyName) => {
        events.push(`read-delete:${propertyName}`);
        return options.challengeResult ?? 'challenge-value';
      },
    }),
    verifyExternal: async ({ capability }) => {
      events.push(`verify-external:${capability}`);
      if (options.verifyExternalError !== undefined) throw options.verifyExternalError;
      return `http://127.0.0.1:9222/cdp/${capability}`;
    },
  };

  return {
    get browserIdentity() {
      return state.browserIdentity;
    },
    set browserIdentity(value: string) {
      state.browserIdentity = value;
    },
    callTool,
    cleanupErrors,
    dependencies,
    events,
    get nextCapability() {
      return state.nextCapability;
    },
    set nextCapability(value: string) {
      state.nextCapability = value;
    },
  };
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
