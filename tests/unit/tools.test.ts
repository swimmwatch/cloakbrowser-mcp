import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';
import { type BridgeRuntime } from '@/bridge/config.js';
import {
  callLocalTool,
  createLocalTools,
  isLocalTool,
  LOCAL_TOOL_BINARY_INFO,
  LOCAL_TOOL_BRIDGE_INFO,
} from '@/bridge/tools.js';
import { fakeCloakBinaryPath, fakeConfigPath, fakeOutputDir, fakeRuntimeDir } from '@tests/helpers/paths.js';

const runtime: BridgeRuntime = {
  browserEngine: 'cloak',
  configPath: fakeConfigPath,
  tempDir: fakeRuntimeDir,
  outputDir: fakeOutputDir,
  cloakBinaryPath: fakeCloakBinaryPath,
  childEnv: {},
  config: {},
  dispose() {},
};

describe('local Cloak tools', () => {
  it('declares the expected introspection tools', () => {
    const tools = createLocalTools();
    expect(tools.map((tool) => tool.name)).toEqual([LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO]);
    expect(tools.find((tool) => tool.name === LOCAL_TOOL_BRIDGE_INFO)?.outputSchema).toMatchObject({
      required: expect.arrayContaining(['cdp']),
      properties: { cdp: { anyOf: expect.any(Array) } },
    });
    expect(isLocalTool(LOCAL_TOOL_BINARY_INFO)).toBe(true);
    expect(isLocalTool('browser_snapshot')).toBe(false);
  });

  it('returns structured bridge metadata', () => {
    const result = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 24);
    expectBridgeInfoMatchesSchema(result);

    expect(result.structuredContent).toMatchObject({
      runtime: 'playwright-mcp-bridge',
      browserEngine: 'cloak',
      upstream: {
        package: '@playwright/mcp',
        toolCount: 24,
      },
      cdp: { enabled: false },
    });
    expect(result.content[0]?.type).toBe('text');
  });

  it('returns redacted session-local managed CDP discovery metadata', () => {
    const result = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 24, {
      activeConnections: 2,
      advertisedHost: null,
      bindHost: '127.0.0.1',
      discoveryUrl: 'https://127.0.0.1:9900/cdp/public-capability',
      enabled: true,
      generation: 3,
      port: 9900,
      state: 'ready',
    });
    expectBridgeInfoMatchesSchema(result);

    expect(result.structuredContent).toMatchObject({
      cdp: {
        activeConnections: 2,
        advertisedHost: null,
        bindHost: '127.0.0.1',
        discoveryUrl: 'https://127.0.0.1:9900/cdp/public-capability',
        enabled: true,
        generation: 3,
        port: 9900,
        state: 'ready',
      },
    });
    expect(JSON.stringify(result.structuredContent)).not.toContain('upstreamHost');
    expect(JSON.stringify(result.structuredContent)).not.toContain('browserWebSocketUrl');
  });

  it('returns an unavailable managed CDP generation without a discovery credential', () => {
    const result = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 24, {
      activeConnections: 0,
      advertisedHost: 'cdp.example.test',
      bindHost: '0.0.0.0',
      discoveryUrl: null,
      enabled: true,
      generation: 4,
      port: 9901,
      state: 'unavailable',
    });
    expectBridgeInfoMatchesSchema(result);

    expect(result.structuredContent).toMatchObject({
      cdp: {
        activeConnections: 0,
        discoveryUrl: null,
        enabled: true,
        generation: 4,
        state: 'unavailable',
      },
    });
  });

  it('rejects ready CDP metadata without a discovery URL', () => {
    expectBridgeInfoCdpFailsSchema({
      activeConnections: 0,
      advertisedHost: null,
      bindHost: '127.0.0.1',
      discoveryUrl: null,
      enabled: true,
      generation: 1,
      port: 9900,
      state: 'ready',
    });
  });

  it('rejects unavailable CDP metadata with active connections and a discovery URL', () => {
    expectBridgeInfoCdpFailsSchema({
      activeConnections: 3,
      advertisedHost: null,
      bindHost: '127.0.0.1',
      discoveryUrl: 'http://127.0.0.1:9900/cdp/public-capability',
      enabled: true,
      generation: 1,
      port: 9900,
      state: 'unavailable',
    });
  });

  it('returns structured binary metadata', () => {
    const result = callLocalTool(LOCAL_TOOL_BINARY_INFO, runtime, 24);

    expect(result.structuredContent).toMatchObject({
      browserEngine: 'cloak',
      executablePath: fakeCloakBinaryPath,
      outputDir: fakeOutputDir,
    });
  });
});

function expectBridgeInfoMatchesSchema(result: ReturnType<typeof callLocalTool>): void {
  const schema = createLocalTools().find((tool) => tool.name === LOCAL_TOOL_BRIDGE_INFO)?.outputSchema;
  expect(schema).toBeDefined();
  const validate = new Ajv({ strict: false }).compile(schema ?? {});
  expect(validate(result.structuredContent)).toBe(true);
  expect(validate.errors).toBeNull();
}

function expectBridgeInfoCdpFailsSchema(cdp: Record<string, unknown>): void {
  const schema = createLocalTools().find((tool) => tool.name === LOCAL_TOOL_BRIDGE_INFO)?.outputSchema;
  expect(schema).toBeDefined();
  const validate = new Ajv({ strict: false }).compile(schema ?? {});
  const bridgeInfo = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 24).structuredContent ?? {};

  expect(validate({ ...bridgeInfo, cdp })).toBe(false);
  expect(validate.errors).not.toBeNull();
}
