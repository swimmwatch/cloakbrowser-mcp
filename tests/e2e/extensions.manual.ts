import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  createFreeBrowserRuntime,
  type FreeBrowserRuntime,
  resolveFreeBrowserExecutable,
} from '@tests/helpers/browser-test-runtime.js';
import {
  cleanupDistributionE2e,
  createTempRoot,
  packAndInstallCurrentPackage,
} from '@tests/e2e/distributionHarness.js';
import { type NpmBrowserFixture, startNpmBrowserFixture } from '@tests/e2e/npm-browser-fixture.js';
import {
  observedValue,
  type OfficialExtension,
  prepareControlledExtension,
  prepareOfficialExtension,
  startExtensionBrowser,
  withExtensionClient,
} from '@tests/helpers/browser-extension.js';

let runtime: FreeBrowserRuntime;
let command: ReturnType<typeof packAndInstallCurrentPackage>;
let fixture: NpmBrowserFixture;
let official: OfficialExtension;
beforeAll(async () => {
  const started = Date.now();
  const progress = (step: string): void => {
    const elapsed = Date.now() - started;
    const message = `Extension E2E setup: ${step} at ${elapsed}ms\n`;
    process.stderr.write(message);
  };
  progress('resolve Free browser');
  const downloadRoot = createTempRoot('cloak-browser-download-');
  const binary = await resolveFreeBrowserExecutable(downloadRoot);
  const executable = binary.executable;
  const root = createTempRoot('cloak-extension-runtime-');
  const parentEnv = { ...process.env };
  for (const key of Object.keys(parentEnv)) {
    if (key.startsWith('PLAYWRIGHT_MCP_') || key.startsWith('CLOAK_PLAYWRIGHT_MCP_')) delete parentEnv[key];
  }
  const options = { root, freeExecutable: executable, parentEnv };
  runtime = await createFreeBrowserRuntime(options);
  progress('install packaged CLI');
  command = packAndInstallCurrentPackage();
  progress('start local fixture');
  fixture = await startNpmBrowserFixture();
  runtime.ownCleanup(fixture.close);
  progress('prepare official extension');
  official = await prepareOfficialExtension(runtime);
  progress('ready');
});
afterAll(async () => {
  try {
    if (runtime) {
      await runtime.dispose();
      const remaining = existsSync(runtime.root);
      if (remaining) throw new Error('Owned extension runtime survived cleanup');
    }
  } finally {
    cleanupDistributionE2e();
  }
});

async function act(client: Client): Promise<void> {
  const navigation = { name: 'browser_navigate', arguments: { url: fixture.url } };
  const result = await client.callTool(navigation);
  expect(result.isError).not.toBe(true);
  const click = {
    name: 'browser_run_code_unsafe',
    arguments: {
      code: 'async (page) => { await page.locator("#action").click(); return await page.locator("#result").textContent(); }',
    },
  };
  const clicked = await client.callTool(click);
  expect(clicked.isError).not.toBe(true);
  const value = observedValue(clicked);
  expect(value).toBe('Clicked');
}

const tokens = ['missing', 'wrong'] as const;
describe('packaged Free extensions', () => {
  it('loads an unpacked content script into the persistent profile', async (context) => {
    const url = await prepareControlledExtension(runtime);
    const profile = path.join(runtime.root, 'unpacked-profile');
    const options = { runtime, command, context, profile, unpacked: url };
    await withExtensionClient(options, async (client) => {
      await act(client);
      const request = {
        name: 'browser_evaluate',
        arguments: { function: '() => document.querySelector("h1")?.dataset.extension' },
      };
      const result = await client.callTool(request);
      const value = observedValue(result);
      expect(value).toBe('Controlled extension loaded');
    });
  });

  it('attaches the official extension and acts in the owned browser', async (context) => {
    const profile = path.join(runtime.root, 'official-profile');
    const options = { runtime, official, profile };
    const browser = await startExtensionBrowser(options);
    try {
      const clientOptions = { runtime, command, context, profile, token: browser.token };
      await withExtensionClient(clientOptions, async (client) => {
        await act(client);
        await browser.expectClicked(fixture.url);
        await browser.expectSameProcess();
      });
      await browser.expectUsable(fixture.url);
    } finally {
      await browser.close();
    }
  });

  it.for(tokens)('rejects %s token without an action and allows valid recovery', rejectsToken);

  it('reports extension disconnection during a call and recovers with fresh pairing', async (context) => {
    const profile = path.join(runtime.root, 'disconnect-profile');
    const options = { runtime, official, profile };
    const browser = await startExtensionBrowser(options);
    try {
      const clientOptions = { runtime, command, context, profile, token: browser.token };
      await withExtensionClient(clientOptions, async (client) => {
        await act(client);
        const request = {
          name: 'browser_run_code_unsafe',
          arguments: {
            code: 'async (page) => { await page.evaluate(() => { document.body.dataset.pending = "true"; }); await page.waitForTimeout(30000); return "unexpected completion"; }',
          },
        };
        const pending = client.callTool(request);
        // Observe the actual page effect before disconnecting through the official UI.
        await browser.expectPending(fixture.url);
        await browser.disconnect();
        const result = await pending;
        expect(result.isError).toBe(true);
        const text = browser.safeResult(result);
        expect(text).toMatch(/closed|disconnect|detach/iu);
      });
      await browser.expectUsable(fixture.url);
      const fresh = { runtime, command, context, profile, token: browser.token };
      await withExtensionClient(fresh, async (client) => {
        await act(client);
        await browser.expectClicked(fixture.url);
      });
    } finally {
      await browser.close();
    }
  });

  it('isolates profiles and rejects the neighbouring profile token', async (context) => {
    const firstProfile = path.join(runtime.root, 'isolation-a');
    const secondProfile = path.join(runtime.root, 'isolation-b');
    const firstOptions = { runtime, official, profile: firstProfile };
    const secondOptions = { runtime, official, profile: secondProfile };
    const first = await startExtensionBrowser(firstOptions);
    let second: Awaited<ReturnType<typeof startExtensionBrowser>> | undefined;
    try {
      second = await startExtensionBrowser(secondOptions);
      const sharedToken = first.token === second.token;
      expect(sharedToken).toBe(false);
      const page = await second.context.newPage();
      const responseUrl = `${fixture.url}/api`;
      const readiness = page.waitForResponse((response) => response.url() === responseUrl);
      await page.goto(fixture.url);
      await readiness;
      const initialRequests = fixture.getState().apiRequests;
      const bad = {
        runtime,
        command,
        context,
        profile: secondProfile,
        token: first.token,
        secrets: [second.token],
      };
      await withExtensionClient(bad, async (client) => {
        const request = { name: 'browser_navigate', arguments: { url: fixture.url } };
        const result = await client.callTool(request);
        expect(result.isError).toBe(true);
      });
      const finalRequests = fixture.getState().apiRequests;
      expect(finalRequests).toBe(initialRequests);
      const firstClient = { runtime, command, context, profile: firstProfile, token: first.token };
      await withExtensionClient(firstClient, async (client) => {
        await act(client);
        await first.expectClicked(fixture.url);
        const value = await page.locator('#result').textContent();
        expect(value).toBe('Ready');
      });
      const secondClient = { runtime, command, context, profile: secondProfile, token: second.token };
      await withExtensionClient(secondClient, async (client) => {
        await act(client);
        if (second) await second.expectClicked(fixture.url);
      });
    } finally {
      try {
        if (second) await second.close();
      } finally {
        await first.close();
      }
    }
  });

  it('cleans a partially started browser when extension readiness fails', async () => {
    const profile = path.join(runtime.root, 'partial-profile');
    const options = { runtime, official, profile, loadExtension: false, readinessTimeout: 500 };
    const startup = startExtensionBrowser(options);
    await expect(startup).rejects.toThrow(/serviceworker|extension.*ready|Timeout/iu);
    const remaining = existsSync(profile);
    expect(remaining).toBe(false);
  });
});

async function rejectsToken(
  mode: (typeof tokens)[number],
  context: import('vitest').TestContext,
): Promise<void> {
  const profile = path.join(runtime.root, `token-${mode}`);
  const options = { runtime, official, profile };
  const browser = await startExtensionBrowser(options);
  try {
    const page = await browser.context.newPage();
    const responseUrl = `${fixture.url}/api`;
    const readiness = page.waitForResponse((response) => response.url() === responseUrl);
    await page.goto(fixture.url);
    await readiness;
    const initialRequests = fixture.getState().apiRequests;
    const token = mode === 'wrong' ? 'synthetic-invalid-extension-token' : undefined;
    const clientOptions = { runtime, command, context, profile, token, secrets: [browser.token] };
    const reject = mode === 'missing' ? rejectMissingToken : rejectWrongToken;
    await reject(clientOptions, browser);
    const finalRequests = fixture.getState().apiRequests;
    expect(finalRequests).toBe(initialRequests);
    const value = await page.locator('#result').textContent();
    expect(value).toBe('Ready');
    await browser.expectUsable(fixture.url);
    const valid = { runtime, command, context, profile, token: browser.token };
    await withExtensionClient(valid, async (client) => {
      await act(client);
      await browser.expectClicked(fixture.url);
    });
  } finally {
    await browser.close();
  }
}

async function rejectMissingToken(options: Parameters<typeof withExtensionClient>[0]): Promise<void> {
  const startup = withExtensionClient(options, async () => {
    throw new Error('Missing token unexpectedly initialized');
  });
  await expect(startup).rejects.toThrow(/EXTENSION_TOKEN.*non-empty/u);
}
async function rejectWrongToken(
  options: Parameters<typeof withExtensionClient>[0],
  browser: Awaited<ReturnType<typeof startExtensionBrowser>>,
): Promise<void> {
  await withExtensionClient(options, async (client) => {
    const navigation = { name: 'browser_navigate', arguments: { url: fixture.url } };
    const result = await client.callTool(navigation);
    expect(result.isError).toBe(true);
    const text = browser.safeResult(result);
    expect(text).toMatch(/extension.*(?:connect|token)/iu);
    await browser.expectRejectedToken();
  });
}
