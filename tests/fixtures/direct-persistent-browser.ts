import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { BrowserContext } from 'playwright';
import type { PlaywrightMcpBridgeConfig } from '@/bridge/config.js';

const [upstreamCli, configPath, url] = process.argv.slice(2);
if (!upstreamCli || !configPath || !url) throw new Error('Missing lifecycle fixture arguments');
const requireFromUpstream = createRequire(upstreamCli);
const { chromium } = requireFromUpstream('playwright-core') as typeof import('playwright');
const source = await readFile(configPath, 'utf8');
const config = JSON.parse(source) as PlaywrightMcpBridgeConfig;
const browser = config.browser;
if (!browser?.userDataDir || !browser.launchOptions) throw new Error('Missing persistent browser config');
const args = [...(browser.launchOptions.args ?? [])];
if (!args.some((arg) => arg.includes('--disable-blink-features')))
  args.push('--disable-blink-features=AutomationControlled');
// Match upstream defaults; the comparison checks observed native process command lines.
const options = {
  ...browser.launchOptions,
  ...browser.contextOptions,
  args,
  handleSIGINT: false,
  handleSIGTERM: false,
  ignoreDefaultArgs: ['--disable-extensions', ...(browser.launchOptions.ignoreDefaultArgs ?? [])],
};
let context: BrowserContext | undefined;
let phase = 'cold-launch';
const observations: Array<{
  url: string;
  marker: string | null;
  viewport: unknown;
  pid: number;
  args: string[];
}> = [];
let failure: { phase: string; message: string; stack?: string } | undefined;
let cleanupFailure: string | undefined;
try {
  for (const mode of ['cold', 'reopen']) {
    phase = `${mode}-launch`;
    context = await chromium.launchPersistentContext(browser.userDataDir, options);
    const page = context.pages()[0];
    if (!page) throw new Error('Persistent context did not expose its initial page');
    phase = `${mode}-navigate`;
    await page.goto(url);
    const heading = page.locator('h1');
    const marker = await heading.textContent();
    const ownedBrowser = context.browser();
    if (!ownedBrowser) throw new Error('Missing persistent browser');
    const session = await ownedBrowser.newBrowserCDPSession();
    let pid: number;
    try {
      const info = await session.send('SystemInfo.getProcessInfo');
      const processInfo = info.processInfo.find((item) => item.type === 'browser');
      if (!processInfo) throw new Error('Missing browser process information');
      pid = processInfo.id;
    } finally {
      await session.detach();
    }
    const commandPath = `/proc/${pid}/cmdline`;
    const command = await readFile(commandPath, 'utf8');
    const actualArgs = command.split('\0').filter(Boolean);
    const observation = { url: page.url(), marker, viewport: page.viewportSize(), pid, args: actualArgs };
    observations.push(observation);
    phase = `${mode}-close`;
    await context.close();
    context = undefined;
  }
} catch (cause) {
  const message = cause instanceof Error ? cause.message : String(cause);
  const stack = cause instanceof Error ? cause.stack : undefined;
  failure = { phase, message, stack };
  const primary = JSON.stringify({ primaryFailure: failure });
  const line = `${primary}\n`;
  process.stderr.write(line);
} finally {
  try {
    await context?.close();
  } catch (cause) {
    cleanupFailure = cause instanceof Error ? cause.message : String(cause);
  }
}
const evidence = { observations, failure, cleanupFailure };
const encoded = JSON.stringify(evidence);
process.stdout.write(encoded);
if (failure || cleanupFailure) process.exitCode = 1;
