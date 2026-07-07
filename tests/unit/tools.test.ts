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
    expect(createLocalTools().map((tool) => tool.name)).toEqual([
      LOCAL_TOOL_BINARY_INFO,
      LOCAL_TOOL_BRIDGE_INFO,
    ]);
    expect(isLocalTool(LOCAL_TOOL_BINARY_INFO)).toBe(true);
    expect(isLocalTool('browser_snapshot')).toBe(false);
  });

  it('returns structured bridge metadata', () => {
    const result = callLocalTool(LOCAL_TOOL_BRIDGE_INFO, runtime, 23);

    expect(result.structuredContent).toMatchObject({
      runtime: 'playwright-mcp-bridge',
      browserEngine: 'cloak',
      upstream: {
        package: '@playwright/mcp',
        toolCount: 23,
      },
    });
    expect(result.content[0]?.type).toBe('text');
  });

  it('returns structured binary metadata', () => {
    const result = callLocalTool(LOCAL_TOOL_BINARY_INFO, runtime, 23);

    expect(result.structuredContent).toMatchObject({
      browserEngine: 'cloak',
      executablePath: fakeCloakBinaryPath,
      outputDir: fakeOutputDir,
    });
  });
});
