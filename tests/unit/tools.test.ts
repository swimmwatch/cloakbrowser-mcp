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
    const mappedValues = tools.map((tool) => tool.name);
    const receiverActual = mappedValues;
    const values: ('cloakbrowser_binary_info' | 'cloakbrowser_bridge_info')[] = [
      LOCAL_TOOL_BINARY_INFO,
      LOCAL_TOOL_BRIDGE_INFO,
    ];
    expect(receiverActual).toEqual(values);
    const argumentValue = tools.find((tool) => tool.name === LOCAL_TOOL_BRIDGE_INFO)?.outputSchema;
    const receiver2Actual = argumentValue;
    const values2 = ['cdp'];
    const arrayContainingResult = expect.arrayContaining(values2);
    const options = { cdp: { anyOf: expect.any(Array) } } as const;
    const toMatchObjectOptions = {
      required: arrayContainingResult,
      properties: options,
    };
    expect(receiver2Actual).toMatchObject(toMatchObjectOptions);
    const isLocalToolResult = isLocalTool(LOCAL_TOOL_BINARY_INFO);
    expect(isLocalToolResult).toBe(true);
    const isLocalToolResult2 = isLocalTool('browser_snapshot');
    expect(isLocalToolResult2).toBe(false);
  });
  it('returns structured bridge metadata', () => {
    const result = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 25);
    expectBridgeInfoMatchesSchema(result);
    const receiver3Actual = result.structuredContent;
    const toMatchObjectOptions2 = {
      runtime: 'playwright-mcp-bridge',
      browserEngine: 'cloak',
      upstream: {
        package: '@playwright/mcp',
        toolCount: 25,
      },
      cdp: { enabled: false },
    } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions2);
    expect(result.content[0]?.type).toBe('text');
  });
  it('returns redacted session-local managed CDP discovery metadata', () => {
    const callLocalToolOptions = {
      activeConnections: 2,
      advertisedHost: null,
      bindHost: '127.0.0.1',
      discoveryUrl: 'https://127.0.0.1:9900/cdp/public-capability',
      enabled: true,
      generation: 3,
      port: 9900,
      state: 'ready',
    } as const;
    const result = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 24, callLocalToolOptions);
    expectBridgeInfoMatchesSchema(result);
    const receiver4Actual = result.structuredContent;
    const toMatchObjectOptions3 = {
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
    } as const;
    expect(receiver4Actual).toMatchObject(toMatchObjectOptions3);
    const serializedValue = JSON.stringify(result.structuredContent);
    expect(serializedValue).not.toContain('upstreamHost');
    const serializedValue2 = JSON.stringify(result.structuredContent);
    expect(serializedValue2).not.toContain('browserWebSocketUrl');
  });
  it('returns an unavailable managed CDP generation without a discovery credential', () => {
    const callLocalToolOptions2 = {
      activeConnections: 0,
      advertisedHost: 'cdp.example.test',
      bindHost: '0.0.0.0',
      discoveryUrl: null,
      enabled: true,
      generation: 4,
      port: 9901,
      state: 'unavailable',
    } as const;
    const result = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 24, callLocalToolOptions2);
    expectBridgeInfoMatchesSchema(result);
    const receiver5Actual = result.structuredContent;
    const toMatchObjectOptions4 = {
      cdp: {
        activeConnections: 0,
        discoveryUrl: null,
        enabled: true,
        generation: 4,
        state: 'unavailable',
      },
    } as const;
    expect(receiver5Actual).toMatchObject(toMatchObjectOptions4);
  });
  it('rejects ready CDP metadata without a discovery URL', () => {
    const expectBridgeInfoCdpFailsSchemaOptions = {
      activeConnections: 0,
      advertisedHost: null,
      bindHost: '127.0.0.1',
      discoveryUrl: null,
      enabled: true,
      generation: 1,
      port: 9900,
      state: 'ready',
    } as const;
    expectBridgeInfoCdpFailsSchema(expectBridgeInfoCdpFailsSchemaOptions);
  });
  it('rejects unavailable CDP metadata with active connections and a discovery URL', () => {
    const expectBridgeInfoCdpFailsSchemaOptions2 = {
      activeConnections: 3,
      advertisedHost: null,
      bindHost: '127.0.0.1',
      discoveryUrl: 'http://127.0.0.1:9900/cdp/public-capability',
      enabled: true,
      generation: 1,
      port: 9900,
      state: 'unavailable',
    } as const;
    expectBridgeInfoCdpFailsSchema(expectBridgeInfoCdpFailsSchemaOptions2);
  });
  it('returns structured binary metadata', () => {
    const result = callLocalTool(LOCAL_TOOL_BINARY_INFO, runtime, 24);
    const receiver6Actual = result.structuredContent;
    const toMatchObjectOptions5 = {
      browserEngine: 'cloak',
      executablePath: fakeCloakBinaryPath,
      outputDir: fakeOutputDir,
    } as const;
    expect(receiver6Actual).toMatchObject(toMatchObjectOptions5);
  });
});
function expectBridgeInfoMatchesSchema(result: ReturnType<typeof callLocalTool>): void {
  const schema = createLocalTools().find((tool) => tool.name === LOCAL_TOOL_BRIDGE_INFO)?.outputSchema;
  expect(schema).toBeDefined();
  const ajvOptions = { strict: false } as const;
  const receiver7 = new Ajv(ajvOptions);
  const computedValue = schema ?? {};
  const validate = receiver7.compile(computedValue);
  const validateResult = validate(result.structuredContent);
  expect(validateResult).toBe(true);
  expect(validate.errors).toBeNull();
}
function expectBridgeInfoCdpFailsSchema(cdp: Record<string, unknown>): void {
  const schema = createLocalTools().find((tool) => tool.name === LOCAL_TOOL_BRIDGE_INFO)?.outputSchema;
  expect(schema).toBeDefined();
  const ajvOptions2 = { strict: false } as const;
  const receiver8 = new Ajv(ajvOptions2);
  const computedValue2 = schema ?? {};
  const validate = receiver8.compile(computedValue2);
  const bridgeInfo = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 24).structuredContent ?? {};
  const validateOptions = { ...bridgeInfo, cdp } as const;
  const validateResult2 = validate(validateOptions);
  expect(validateResult2).toBe(false);
  expect(validate.errors).not.toBeNull();
}
