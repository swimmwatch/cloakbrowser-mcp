import { describe, expect, it } from 'vitest';
import { type BridgeRuntime } from '../../src/bridge/config.js';
import { callLocalTool, createLocalTools, isLocalTool } from '../../src/bridge/tools.js';

const runtime: BridgeRuntime = {
  browserEngine: 'cloak',
  configPath: '/tmp/config.json',
  tempDir: '/tmp/runtime',
  outputDir: '/tmp/output',
  cloakBinaryPath: '/tmp/cloakbrowser/chrome',
  childEnv: {},
  config: {},
  dispose() {},
};

describe('local Cloak tools', () => {
  it('declares the expected introspection tools', () => {
    expect(createLocalTools().map((tool) => tool.name)).toEqual([
      'cloakbrowser_binary_info',
      'cloakbrowser_bridge_info',
    ]);
    expect(isLocalTool('cloakbrowser_binary_info')).toBe(true);
    expect(isLocalTool('browser_snapshot')).toBe(false);
  });

  it('returns structured bridge metadata', () => {
    const result = callLocalTool('cloakbrowser_bridge_info', runtime, 23);

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
    const result = callLocalTool('cloakbrowser_binary_info', runtime, 23);

    expect(result.structuredContent).toMatchObject({
      browserEngine: 'cloak',
      executablePath: '/tmp/cloakbrowser/chrome',
      outputDir: '/tmp/output',
    });
  });
});
