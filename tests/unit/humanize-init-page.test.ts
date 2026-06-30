import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeBrowser = Record<symbol, unknown>;

interface FakeContext extends Record<symbol, unknown> {
  browser?: () => FakeBrowser | null;
}

interface FakePage {
  context(): FakeContext;
}

interface HumanizeOptions {
  humanize: boolean;
  humanPreset: string;
}

interface HumanizeInitPageDependencies {
  loadCloakBrowser(): Promise<{
    humanizeBrowser(browser: FakeBrowser, options: HumanizeOptions): Promise<void> | void;
  }>;
  loadCloakHuman(): Promise<{
    patchContext(context: FakeContext, config: unknown): void;
    resolveConfig(preset: string): unknown;
  }>;
}

interface HumanizeInitPageModule {
  _createHumanizeInitPageForTest(
    dependencies: HumanizeInitPageDependencies,
  ): (input: { page?: FakePage }) => Promise<void>;
}

const require = createRequire(import.meta.url);
const modulePath = fileURLToPath(new URL('../../src/runtime/humanize-init-page.cjs', import.meta.url));
const humanizeModule = require(modulePath) as HumanizeInitPageModule;

const originalPreset = process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalPreset === undefined) {
    delete process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET;
  } else {
    process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET = originalPreset;
  }
});

describe('humanize init page hook', () => {
  it('uses top-level humanizeBrowser once when the context exposes a browser', async () => {
    process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET = 'careful';
    const browser: FakeBrowser = {};
    const context: FakeContext = { browser: () => browser };
    const page: FakePage = { context: () => context };
    const humanizeBrowser = vi.fn(
      async (_browser: FakeBrowser, _options: HumanizeOptions): Promise<void> => undefined,
    );
    const loadCloakBrowser = vi.fn(async () => ({ humanizeBrowser }));
    const loadCloakHuman = vi.fn(async () => ({
      patchContext: vi.fn(),
      resolveConfig: vi.fn(),
    }));
    const initPage = humanizeModule._createHumanizeInitPageForTest({
      loadCloakBrowser,
      loadCloakHuman,
    });

    await initPage({ page });
    await initPage({ page });

    expect(loadCloakBrowser).toHaveBeenCalledTimes(1);
    expect(loadCloakHuman).not.toHaveBeenCalled();
    expect(humanizeBrowser).toHaveBeenCalledTimes(1);
    expect(humanizeBrowser).toHaveBeenCalledWith(browser, {
      humanize: true,
      humanPreset: 'careful',
    });
  });

  it('falls back to context patching once for persistent contexts without a browser', async () => {
    const context: FakeContext = { browser: () => null };
    const page: FakePage = { context: () => context };
    const humanizeBrowser = vi.fn();
    const patchContext = vi.fn((_context: FakeContext, _config: unknown): void => undefined);
    const resolveConfig = vi.fn((preset: string) => ({ preset }));
    const loadCloakBrowser = vi.fn(async () => ({ humanizeBrowser }));
    const loadCloakHuman = vi.fn(async () => ({ patchContext, resolveConfig }));
    const initPage = humanizeModule._createHumanizeInitPageForTest({
      loadCloakBrowser,
      loadCloakHuman,
    });

    await initPage({ page });
    await initPage({ page });

    expect(loadCloakBrowser).not.toHaveBeenCalled();
    expect(loadCloakHuman).toHaveBeenCalledTimes(1);
    expect(resolveConfig).toHaveBeenCalledTimes(1);
    expect(resolveConfig).toHaveBeenCalledWith('default');
    expect(patchContext).toHaveBeenCalledTimes(1);
    expect(patchContext).toHaveBeenCalledWith(context, { preset: 'default' });
  });
});
