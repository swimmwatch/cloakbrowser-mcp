import { describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { isCdpCapability } from '@/cdp/capability.js';
import {
  createManagedCdpChallenge,
  type ManagedCdpSessionDependencies,
  startManagedCdpSession,
} from '@/cdp/session.js';
describe('managed CDP generation coordinator', () => {
  it('places and cleans hostile challenge strings as data without executing them', async () => {
    const propertyName = '__challenge";globalThis.injected=true;//</script>\u2028';
    const value = '";globalThis.injected=true;//</script>\u2029';
    const discoverError = new Error('Discovery failed after placement');
    const options = { discoverError };
    const harness = createHarness(options);
    harness.dependencies.createChallenge = () => ({ propertyName, value });
    const startup = startManagedCdpSession(harness.dependencies);
    await expect(startup).rejects.toThrow(discoverError);
    const evaluations = harness.callTool.mock.calls.filter(([name]) => name === 'browser_evaluate');
    expect(evaluations).toHaveLength(2);
    const setTimeout = vi.fn();
    const sandbox: Record<string, unknown> = { injected: false, unrelated: 'retained', setTimeout };
    for (const [index, [, arguments_]] of evaluations.entries()) {
      const source = arguments_.function;
      if (typeof source !== 'string') throw new Error('Expected a bootstrap function');
      expect(source).not.toMatch(/<\/script|[\u2028\u2029]/iu);
      const expression = `(${source})()`;
      runInNewContext(expression, sandbox);
      const expectedValue = index === 0 ? value : undefined;
      expect(sandbox[propertyName]).toBe(expectedValue);
    }
    const remains = Object.hasOwn(sandbox, propertyName);
    expect(remains).toBe(false);
    expect(sandbox.injected).toBe(false);
    expect(sandbox.unrelated).toBe('retained');
    const callback = expect.any(Function);
    expect(setTimeout).toHaveBeenCalledWith(callback, 60000);
  });
  it('creates independent challenge property and value material with capability entropy', () => {
    const challenge = createManagedCdpChallenge();
    expect(challenge.propertyName).toMatch(/^__cloak_mcp_[A-Za-z0-9_-]{43}$/u);
    const sliceResult = challenge.propertyName.slice('__cloak_mcp_'.length);
    const isCdpCapabilityResult = isCdpCapability(sliceResult);
    expect(isCdpCapabilityResult).toBe(true);
    const isCdpCapabilityResult2 = isCdpCapability(challenge.value);
    expect(isCdpCapabilityResult2).toBe(true);
    expect(challenge.propertyName).not.toContain(challenge.value);
  });
  it('holds the internal reservation through connection and publishes only after challenge and readiness', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);
    const receiverActual = harness.events;
    const values: string[] = [
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
    ];
    expect(receiverActual).toEqual(values);
    const snapshotResult = session.snapshot();
    const receiver2Actual = snapshotResult;
    const toEqualOptions = {
      browserWebSocketUrl: 'ws://127.0.0.1:43123/devtools/browser/browser-1',
      capability: 'capability-1',
      discoveryUrl: 'http://127.0.0.1:9222/cdp/capability-1',
      generation: 1,
      state: 'ready',
      upstreamHost: '127.0.0.1',
      upstreamPort: 43123,
    } as const;
    expect(receiver2Actual).toEqual(toEqualOptions);
    expect(harness.callTool).toHaveBeenCalledTimes(2);
    await session.dispose();
  });
  it('rolls back every provisional owner when the challenge is wrong', async () => {
    const createHarnessOptions = { challengeResult: 'wrong-value' } as const;
    const harness = createHarness(createHarnessOptions);
    const startManagedCdpSessionResult = startManagedCdpSession(harness.dependencies);
    await expect(startManagedCdpSessionResult).rejects.toThrow('ownership challenge');
    const receiver3Actual = harness.events;
    const values2: string[] = [
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
    ];
    expect(receiver3Actual).toEqual(values2);
  });
  const values3: readonly (
    | {
        name: string;
        options: {
          tabsResult: {
            isError: boolean;
          };
          evaluateResult?: undefined;
        };
      }
    | {
        name: string;
        options: {
          evaluateResult: {
            isError: boolean;
          };
          tabsResult?: undefined;
        };
      }
  )[] = [
    { name: 'browser_tabs', options: { tabsResult: { isError: true } } },
    { name: 'browser_evaluate', options: { evaluateResult: { isError: true } } },
  ];
  it.each(values3)('fails immediately when $name returns an MCP tool error', async ({ name, options }) => {
    const harness = createHarness(options);
    const startManagedCdpSessionResult2 = startManagedCdpSession(harness.dependencies);
    const receiver4Actual = startManagedCdpSessionResult2;
    const message2 = `Managed CDP bootstrap tool ${name} failed`;
    await expect(receiver4Actual).rejects.toThrow(message2);
    expect(harness.events).not.toContain('discover');
    expect(harness.events).toContain('proxy-close');
    expect(harness.events).toContain('upstream-dispose');
    expect(harness.events).toContain('runtime-dispose');
  });
  it('reports native bootstrap termination codes without upstream secrets or launch arguments', async () => {
    const options = {
      tabsResult: {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'launch --proxy-server=http://fixture-secret@proxy.invalid signal=SIGFIXTURESECRET exitCode=12345678901234567890 <process did exit: exitCode=133, signal=SIGTRAP> exitCode=133',
          },
          { type: 'image', data: 'untrusted' },
          null,
        ],
      },
    };
    const harness = createHarness(options);
    const starting = startManagedCdpSession(harness.dependencies);
    const expected = 'Managed CDP bootstrap tool browser_tabs failed (exitCode=133, signal=SIGTRAP)';
    const expectedError = { message: expected };
    await expect(starting).rejects.toMatchObject(expectedError);
    expect(harness.events).toContain('upstream-dispose');
    expect(harness.events).toContain('runtime-dispose');
  });
  it('uses one absolute deadline and rolls back a hung bootstrap', async () => {
    const createHarnessOptions2 = { hangTabs: true, initialTimeoutMs: 20 } as const;
    const harness = createHarness(createHarnessOptions2);
    const startedAt = Date.now();
    const startManagedCdpSessionResult3 = startManagedCdpSession(harness.dependencies);
    await expect(startManagedCdpSessionResult3).rejects.toThrow('timed out');
    const computedValue = Date.now() - startedAt;
    expect(computedValue).toBeLessThan(500);
    expect(harness.events).toContain('proxy-close');
    expect(harness.events).toContain('upstream-dispose');
    expect(harness.events).toContain('runtime-dispose');
  });
  it('does not reset the absolute deadline between bootstrap phases', async () => {
    const createHarnessOptions3 = { initialTimeoutMs: 400, phaseDelayMs: 150 } as const;
    const harness = createHarness(createHarnessOptions3);
    const startManagedCdpSessionResult4 = startManagedCdpSession(harness.dependencies);
    await expect(startManagedCdpSessionResult4).rejects.toThrow('timed out');
    expect(harness.events).toContain('browser_tabs');
    expect(harness.events).toContain('browser_evaluate:set');
    expect(harness.events).toContain('discover');
    expect(harness.events).toContain('proxy-close');
  });
  it('removes a placed challenge and rolls back when discovery fails', async () => {
    const createHarnessOptions4 = { discoverError: new Error('missing page target') } as const;
    const harness = createHarness(createHarnessOptions4);
    const startManagedCdpSessionResult5 = startManagedCdpSession(harness.dependencies);
    await expect(startManagedCdpSessionResult5).rejects.toThrow('missing page target');
    expect(harness.events).toContain('browser_evaluate:delete');
    expect(harness.events).toContain('proxy-clear');
    const sliceResult2 = harness.events.slice(-3);
    const receiver5Actual = sliceResult2;
    const values4: string[] = ['proxy-close', 'upstream-dispose', 'runtime-dispose'];
    expect(receiver5Actual).toEqual(values4);
  });
  it('rolls back a provisional generation when external readiness fails', async () => {
    const createHarnessOptions5 = { verifyExternalError: new Error('external discovery unusable') } as const;
    const harness = createHarness(createHarnessOptions5);
    const startManagedCdpSessionResult6 = startManagedCdpSession(harness.dependencies);
    await expect(startManagedCdpSessionResult6).rejects.toThrow('external discovery unusable');
    expect(harness.events).toContain('stage:capability-1');
    expect(harness.events).not.toContain('publish:capability-1');
    expect(harness.events).toContain('proxy-clear');
    expect(harness.events).toContain('proxy-close');
  });
  it('invalidates changed identity and publishes a monotonic replacement generation', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);
    harness.browserIdentity = 'ws://127.0.0.1:43123/devtools/browser/browser-2';
    const probeGenerationResult = session.probeGeneration();
    await expect(probeGenerationResult).resolves.toBe(false);
    const snapshotResult2 = session.snapshot();
    const receiver6Actual = snapshotResult2;
    const toEqualOptions2 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver6Actual).toEqual(toEqualOptions2);
    harness.nextCapability = 'capability-2';
    await session.bootstrapGeneration();
    const snapshotResult3 = session.snapshot();
    const receiver7Actual = snapshotResult3;
    const toMatchObjectOptions = {
      browserWebSocketUrl: harness.browserIdentity,
      capability: 'capability-2',
      generation: 2,
      state: 'ready',
    } as const;
    expect(receiver7Actual).toMatchObject(toMatchObjectOptions);
    await session.dispose();
  });
  it('replaces a lost browser before forwarding the next browser tool', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);
    harness.browserIdentity = 'ws://127.0.0.1:43123/devtools/browser/browser-2';
    harness.nextCapability = 'capability-2';
    const runBrowserToolResult = session.runBrowserTool(async (owner) => {
      const callToolOptions = {} as const;
      return await owner.callTool('browser_navigate', callToolOptions);
    });
    const receiver8Actual = runBrowserToolResult;
    const toEqualOptions3 = {} as const;
    await expect(receiver8Actual).resolves.toEqual(toEqualOptions3);
    const snapshotResult4 = session.snapshot();
    const receiver9Actual = snapshotResult4;
    const toMatchObjectOptions2 = { capability: 'capability-2', generation: 2 } as const;
    expect(receiver9Actual).toMatchObject(toMatchObjectOptions2);
    const indexOfResult = harness.events.indexOf('publish:capability-2');
    const receiver10Actual = indexOfResult;
    const indexOfResult2 = harness.events.indexOf('tool:browser_navigate');
    expect(receiver10Actual).toBeLessThan(indexOfResult2);
    await session.dispose();
  });
  it('invalidates a generation lost during a browser tool without rewriting its result', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);
    const runBrowserToolResult2 = session.runBrowserTool(async () => {
      harness.browserIdentity = 'ws://127.0.0.1:43123/devtools/browser/browser-2';
      return 'forwarded-result';
    });
    await expect(runBrowserToolResult2).resolves.toBe('forwarded-result');
    const snapshotResult5 = session.snapshot();
    const receiver11Actual = snapshotResult5;
    const toEqualOptions4 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver11Actual).toEqual(toEqualOptions4);
    await session.dispose();
  });
  it('invalidates the active generation when browser tool transport fails', async () => {
    const harness = createHarness();
    const session = await startManagedCdpSession(harness.dependencies);
    const runBrowserToolResult3 = session.runBrowserTool(async () => {
      throw new Error('upstream transport closed');
    });
    await expect(runBrowserToolResult3).rejects.toThrow('upstream transport closed');
    const snapshotResult6 = session.snapshot();
    const receiver12Actual = snapshotResult6;
    const toEqualOptions5 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver12Actual).toEqual(toEqualOptions5);
    await session.dispose();
  });
  it('invalidates a generation explicitly and coalesces concurrent replacement bootstrap', async () => {
    const createHarnessOptions6 = { phaseDelayMs: 5 } as const;
    const harness = createHarness(createHarnessOptions6);
    const session = await startManagedCdpSession(harness.dependencies);
    session.invalidateGeneration();
    const snapshotResult7 = session.snapshot();
    const receiver13Actual = snapshotResult7;
    const toEqualOptions6 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver13Actual).toEqual(toEqualOptions6);
    harness.nextCapability = 'capability-2';
    const values5: [Promise<void>, Promise<void>] = [
      session.bootstrapGeneration(),
      session.bootstrapGeneration(),
    ];
    await Promise.all(values5);
    const snapshotResult8 = session.snapshot();
    const receiver14Actual = snapshotResult8;
    const toMatchObjectOptions3 = {
      capability: 'capability-2',
      generation: 2,
      state: 'ready',
    } as const;
    expect(receiver14Actual).toMatchObject(toMatchObjectOptions3);
    const filteredValues = harness.events.filter((event) => event === 'stage:capability-2');
    expect(filteredValues).toHaveLength(1);
    const filteredValues2 = harness.events.filter((event) => event === 'publish:capability-2');
    expect(filteredValues2).toHaveLength(1);
    const filteredValues3 = harness.events.filter((event) => event === 'reserve-internal');
    expect(filteredValues3).toHaveLength(2);
    const filteredValues4 = harness.events.filter((event) => event === 'connect-upstream');
    expect(filteredValues4).toHaveLength(2);
    const filteredValues5 = harness.events.filter((event) => event === 'upstream-dispose');
    expect(filteredValues5).toHaveLength(1);
    const filteredValues6 = harness.events.filter((event) => event === 'runtime-dispose');
    expect(filteredValues6).toHaveLength(1);
    const indexOfResult3 = harness.events.indexOf('upstream-dispose');
    const receiver15Actual = indexOfResult3;
    const lastIndexOfResult = harness.events.lastIndexOf('reserve-internal');
    expect(receiver15Actual).toBeLessThan(lastIndexOfResult);
    await session.dispose();
  });
  it('does not restart on loss or tool listing and forwards concurrent browser calls once', async () => {
    const createHarnessOptions7 = { phaseDelayMs: 5 } as const;
    const harness = createHarness(createHarnessOptions7);
    const session = await startManagedCdpSession(harness.dependencies);
    session.invalidateGeneration();
    await session.runWithCurrentUpstream(async (owner) => await owner.listTools());
    const filteredValues7 = harness.events.filter((event) => event === 'reserve-internal');
    expect(filteredValues7).toHaveLength(1);
    expect(harness.events).toContain('list-tools');
    harness.nextCapability = 'capability-2';
    const values6: [Promise<unknown>, Promise<unknown>] = [
      session.runBrowserTool(async (owner) => {
        const callToolOptions2 = {} as const;
        return await owner.callTool('browser_navigate', callToolOptions2);
      }),
      session.runBrowserTool(async (owner) => {
        const callToolOptions3 = {} as const;
        return await owner.callTool('browser_snapshot', callToolOptions3);
      }),
    ];
    await Promise.all(values6);
    const filteredValues8 = harness.events.filter((event) => event === 'reserve-internal');
    expect(filteredValues8).toHaveLength(2);
    const filteredValues9 = harness.callTool.mock.calls.filter(([name]) => name === 'browser_navigate');
    expect(filteredValues9).toHaveLength(1);
    const filteredValues10 = harness.callTool.mock.calls.filter(([name]) => name === 'browser_snapshot');
    expect(filteredValues10).toHaveLength(1);
    const indexOfResult4 = harness.events.indexOf('publish:capability-2');
    const receiver16Actual = indexOfResult4;
    const indexOfResult5 = harness.events.indexOf('tool:browser_navigate');
    expect(receiver16Actual).toBeLessThan(indexOfResult5);
    expect(harness.events).not.toContain('proxy-release');
    const snapshotResult9 = session.snapshot();
    const receiver17Actual = snapshotResult9;
    const toMatchObjectOptions4 = { capability: 'capability-2', generation: 2 } as const;
    expect(receiver17Actual).toMatchObject(toMatchObjectOptions4);
    await session.dispose();
  });
  it('forwards nothing on replacement failure and permits a later bounded attempt', async () => {
    const options: Parameters<typeof createHarness>[0] = {};
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    const forward = vi.fn(async () => 'forwarded');
    session.invalidateGeneration();
    options.discoverError = new Error('replacement discovery failed');
    const runBrowserToolResult4 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult4).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    const snapshotResult10 = session.snapshot();
    const receiver18Actual = snapshotResult10;
    const toEqualOptions7 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver18Actual).toEqual(toEqualOptions7);
    options.discoverError = undefined;
    harness.nextCapability = 'capability-2';
    const runBrowserToolResult5 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult5).resolves.toBe('forwarded');
    expect(forward).toHaveBeenCalledTimes(1);
    const filteredValues11 = harness.events.filter((event) => event === 'reserve-internal');
    expect(filteredValues11).toHaveLength(3);
    const snapshotResult11 = session.snapshot();
    const receiver19Actual = snapshotResult11;
    const toMatchObjectOptions5 = { capability: 'capability-2', generation: 2 } as const;
    expect(receiver19Actual).toMatchObject(toMatchObjectOptions5);
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
    const runBrowserToolResult6 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult6).rejects.toThrow('Managed CDP browser replacement failed');
    options.upstreamDisposeErrorAt = undefined;
    harness.nextCapability = 'capability-2';
    const runBrowserToolResult7 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult7).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    const filteredValues12 = harness.events.filter((event) => event === 'connect-upstream');
    expect(filteredValues12).toHaveLength(1);
    const filteredValues13 = harness.events.filter((event) => event.startsWith('prepare-runtime:'));
    expect(filteredValues13).toHaveLength(1);
    expect(harness.events).not.toContain('runtime-dispose');
    const snapshotResult12 = session.snapshot();
    const receiver20Actual = snapshotResult12;
    const toEqualOptions8 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver20Actual).toEqual(toEqualOptions8);
    const disposeResult = session.dispose();
    await expect(disposeResult).rejects.toThrow('cleanup was incomplete');
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
    const runBrowserToolResult8 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult8).rejects.toThrow('Managed CDP browser replacement failed');
    options.discoverError = undefined;
    options.upstreamDisposeErrorAt = undefined;
    harness.nextCapability = 'capability-2';
    const runBrowserToolResult9 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult9).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    const filteredValues14 = harness.events.filter((event) => event === 'connect-upstream');
    expect(filteredValues14).toHaveLength(2);
    const filteredValues15 = harness.events.filter((event) => event.startsWith('prepare-runtime:'));
    expect(filteredValues15).toHaveLength(2);
    const snapshotResult13 = session.snapshot();
    const receiver21Actual = snapshotResult13;
    const toEqualOptions9 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver21Actual).toEqual(toEqualOptions9);
    const disposeResult2 = session.dispose();
    await expect(disposeResult2).rejects.toThrow('cleanup was incomplete');
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
      const message3 = `${phase} failed`;
      options[phase] = new Error(message3);
      const runBrowserToolResult10 = session.runBrowserTool(forward);
      await expect(runBrowserToolResult10).rejects.toThrow('Managed CDP browser replacement failed');
      expect(forward).not.toHaveBeenCalled();
      const snapshotResult14 = session.snapshot();
      const receiver22Actual = snapshotResult14;
      const toEqualOptions10 = { generation: 1, state: 'unavailable' } as const;
      expect(receiver22Actual).toEqual(toEqualOptions10);
      expect(harness.events).not.toContain('publish:capability-2');
      options[phase] = undefined;
      harness.nextCapability = 'capability-2';
      const runBrowserToolResult11 = session.runBrowserTool(forward);
      await expect(runBrowserToolResult11).resolves.toBe(phase);
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
    const runBrowserToolResult12 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult12).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    options.upstreamDisposeDelayMs = undefined;
    harness.nextCapability = 'capability-2';
    await session.runBrowserTool(forward);
    const indexOfResult6 = harness.events.indexOf('upstream-dispose');
    const receiver23Actual = indexOfResult6;
    const lastIndexOfResult2 = harness.events.lastIndexOf('reserve-internal');
    expect(receiver23Actual).toBeLessThan(lastIndexOfResult2);
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
    const runBrowserToolResult13 = session.runBrowserTool(forward);
    await expect(runBrowserToolResult13).rejects.toThrow('Managed CDP browser replacement failed');
    expect(forward).not.toHaveBeenCalled();
    const snapshotResult15 = session.snapshot();
    const receiver24Actual = snapshotResult15;
    const toEqualOptions11 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver24Actual).toEqual(toEqualOptions11);
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
    const browserCall = session.runBrowserTool(async (owner) => {
      const callToolOptions4 = {} as const;
      return await owner.callTool('browser_navigate', callToolOptions4);
    });
    await vi.waitFor(() => {
      const filteredValues16 = harness.events.filter((event) => event === 'browser_tabs');
      return expect(filteredValues16).toHaveLength(2);
    });
    const listTools = session.runWithCurrentUpstream(async (owner) => await owner.listTools());
    await delay(5);
    expect(harness.events).not.toContain('list-tools');
    releaseTabs?.();
    const values7: [Promise<unknown>, Promise<unknown>] = [browserCall, listTools];
    await Promise.all(values7);
    const filteredValues17 = harness.events.filter((event) => event === 'list-tools');
    expect(filteredValues17).toHaveLength(1);
    const indexOfResult7 = harness.events.indexOf('publish:capability-2');
    const receiver25Actual = indexOfResult7;
    const indexOfResult8 = harness.events.indexOf('list-tools');
    expect(receiver25Actual).toBeLessThan(indexOfResult8);
    await session.dispose();
  });
  it('cancels an in-flight restart before releasing the external lease', async () => {
    const options: Parameters<typeof createHarness>[0] = { initialTimeoutMs: 200 };
    const harness = createHarness(options);
    const session = await startManagedCdpSession(harness.dependencies);
    session.invalidateGeneration();
    harness.nextCapability = 'capability-2';
    options.hangTabs = true;
    const browserCall = session.runBrowserTool(async (owner) => {
      const callToolOptions5 = {} as const;
      return await owner.callTool('browser_navigate', callToolOptions5);
    });
    await vi.waitFor(() => {
      const filteredValues18 = harness.events.filter((event) => event === 'browser_tabs');
      return expect(filteredValues18).toHaveLength(2);
    });
    const startedAt = Date.now();
    await session.dispose();
    const computedValue2 = Date.now() - startedAt;
    expect(computedValue2).toBeLessThan(100);
    await expect(browserCall).rejects.toThrow('Managed CDP browser replacement failed');
    expect(harness.events).not.toContain('publish:capability-2');
    const atResult = harness.events.at(-1);
    expect(atResult).toBe('proxy-release');
    const filteredValues19 = harness.events.filter((event) => event === 'connect-upstream');
    expect(filteredValues19).toHaveLength(2);
    const filteredValues20 = harness.events.filter((event) => event === 'upstream-dispose');
    expect(filteredValues20).toHaveLength(2);
    const filteredValues21 = harness.events.filter((event) => event === 'runtime-dispose');
    expect(filteredValues21).toHaveLength(2);
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
    await vi.waitFor(() => {
      const filteredValues22 = harness.events.filter((event) => event === 'connect-upstream');
      return expect(filteredValues22).toHaveLength(2);
    });
    const disposal = session.dispose();
    await delay(10);
    expect(harness.events).not.toContain('proxy-release');
    releaseConnect?.();
    await vi.waitFor(() => {
      const filteredValues23 = harness.events.filter((event) => event === 'upstream-dispose');
      return expect(filteredValues23).toHaveLength(2);
    });
    expect(harness.events).not.toContain('proxy-release');
    releaseRuntime?.();
    await disposal;
    const receiver26Actual = browserCall;
    const objectContainingOptions = {
      message: 'Managed CDP browser replacement failed',
    } as const;
    const objectContainingResult = expect.objectContaining(objectContainingOptions);
    await expect(receiver26Actual).resolves.toEqual(objectContainingResult);
    const atResult2 = harness.events.at(-1);
    expect(atResult2).toBe('proxy-release');
    const filteredValues24 = harness.events.filter((event) => event === 'release-internal');
    expect(filteredValues24).toHaveLength(2);
    const filteredValues25 = harness.events.filter((event) => event === 'runtime-dispose');
    expect(filteredValues25).toHaveLength(2);
  });
  it('disposes a resource that resolves after the admission deadline', async () => {
    const createHarnessOptions8 = { createProxyDelayMs: 30, initialTimeoutMs: 10 } as const;
    const harness = createHarness(createHarnessOptions8);
    const startManagedCdpSessionResult7 = startManagedCdpSession(harness.dependencies);
    await expect(startManagedCdpSessionResult7).rejects.toThrow('timed out');
    await vi.waitFor(() => expect(harness.events).toContain('proxy-close'));
    expect(harness.events).not.toContain('reserve-internal');
  });
  it('does not wait past the admission deadline for a hung reservation handoff', async () => {
    const createHarnessOptions9 = { hangReservationClose: true, initialTimeoutMs: 10 } as const;
    const harness = createHarness(createHarnessOptions9);
    const startedAt = Date.now();
    const startManagedCdpSessionResult8 = startManagedCdpSession(harness.dependencies);
    await expect(startManagedCdpSessionResult8).rejects.toThrow('timed out');
    const computedValue3 = Date.now() - startedAt;
    expect(computedValue3).toBeLessThan(500);
    await vi.waitFor(() => {
      expect(harness.events).toContain('proxy-close');
      expect(harness.events).toContain('upstream-dispose');
      expect(harness.events).toContain('runtime-dispose');
    });
  });
  it('preserves runtime ownership and the external lease when upstream cleanup fails', async () => {
    const createHarnessOptions10 = {
      proxyCloseError: new Error('proxy close failed'),
      runtimeDisposeError: new Error('runtime dispose failed'),
      upstreamDisposeError: new Error('upstream dispose failed'),
    } as const;
    const harness = createHarness(createHarnessOptions10);
    const session = await startManagedCdpSession(harness.dependencies);
    const disposeResult3 = session.dispose();
    await expect(disposeResult3).rejects.toThrow('cleanup was incomplete');
    const sliceResult3 = harness.events.slice(-2);
    const receiver27Actual = sliceResult3;
    const values8: string[] = ['proxy-stop', 'upstream-dispose'];
    expect(receiver27Actual).toEqual(values8);
    expect(harness.events).not.toContain('runtime-dispose');
    expect(harness.events).not.toContain('proxy-release');
    const receiver28Actual = harness.cleanupErrors;
    const objectContainingOptions2 = { message: 'Managed CDP cleanup was incomplete' } as const;
    const objectContainingResult2 = expect.objectContaining(objectContainingOptions2);
    const values9 = [objectContainingResult2];
    expect(receiver28Actual).toEqual(values9);
    const eventCount = harness.events.length;
    const disposeResult4 = session.dispose();
    await expect(disposeResult4).rejects.toThrow('cleanup was incomplete');
    expect(harness.events).toHaveLength(eventCount);
  });
  it('stops the proxy before owner cleanup and releases its lease last', async () => {
    const createHarnessOptions11 = {
      proxyStopDelayMs: 5,
      runtimeDisposeDelayMs: 15,
      upstreamDisposeDelayMs: 25,
    } as const;
    const harness = createHarness(createHarnessOptions11);
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
    const bootstrapGenerationResult = session.bootstrapGeneration();
    await expect(bootstrapGenerationResult).rejects.toThrow('challenge cleanup was incomplete');
    expect(harness.events).toContain('browser_evaluate:delete');
    const snapshotResult16 = session.snapshot();
    const receiver29Actual = snapshotResult16;
    const toEqualOptions12 = { generation: 1, state: 'unavailable' } as const;
    expect(receiver29Actual).toEqual(toEqualOptions12);
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
    tabsResult?: unknown;
    tabsGate?: Promise<void>;
    evaluateResult?: unknown;
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
    const argumentValue =
      name === 'browser_tabs'
        ? 'browser_tabs'
        : name !== 'browser_evaluate'
          ? `tool:${name}`
          : source.includes('delete globalThis')
            ? 'browser_evaluate:delete'
            : 'browser_evaluate:set';
    events.push(argumentValue);
    if (name === 'browser_tabs' && options.tabsError !== undefined) throw options.tabsError;
    if (name === 'browser_tabs' && options.tabsGate !== undefined) await options.tabsGate;
    if (name === 'browser_tabs' && options.hangTabs === true) await new Promise(() => undefined);
    if (name === 'browser_tabs' && options.tabsResult !== undefined) return options.tabsResult;
    if (
      name === 'browser_evaluate' &&
      !source.includes('delete globalThis') &&
      options.evaluateResult !== undefined
    ) {
      return options.evaluateResult;
    }
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
        publishGeneration: ({ capability }) => {
          const message4 = `publish:${capability}`;
          return events.push(message4);
        },
        setUnavailableCapability: (capability) => {
          const message5 = `unavailable:${capability}`;
          return events.push(message5);
        },
        stageGeneration: ({ capability }) => {
          const message6 = `stage:${capability}`;
          events.push(message6);
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
    onStateChange: (snapshot) => {
      const message7 = `state:${snapshot.state}:${snapshot.generation}`;
      return events.push(message7);
    },
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
      const message8 = `prepare-runtime:${internalPort}`;
      events.push(message8);
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
            const message9 = `upstream ${String(ownerNumber)} cleanup failed`;
            throw new Error(message9);
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
        const message10 = `read-delete:${propertyName}`;
        events.push(message10);
        return options.challengeResult ?? 'challenge-value';
      },
    }),
    verifyExternal: async ({ capability }) => {
      const message11 = `verify-external:${capability}`;
      events.push(message11);
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
