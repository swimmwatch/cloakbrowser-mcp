import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CloakBrowserAdapter } from '@/browser/cloakAdapter.js';
import { configSchema } from '@/config/schema.js';
import { startFixtureServer, type FixtureServer } from '../fixtures/httpServer.js';

const enabled = process.env.CLOAKBROWSER_MCP_REAL_BROWSER === '1';

describe.skipIf(!enabled)('real cloakbrowser smoke', () => {
  let fixture: FixtureServer;
  let adapter: CloakBrowserAdapter;

  beforeAll(async () => {
    fixture = await startFixtureServer();
    const config = configSchema.parse({
      logLevel: 'silent',
      capabilities: { allowScreenshots: true },
    });
    adapter = new CloakBrowserAdapter(config);
    await adapter.launch();
  });

  afterAll(async () => {
    try {
      await adapter?.close();
    } finally {
      await fixture?.close();
    }
  });

  it('navigates to fixture server and returns a non-empty title', async () => {
    const page = await adapter.newPage();
    await page.goto(`${fixture.url}/`);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  it('takes a screenshot of the fixture root page', async () => {
    const page = await adapter.newPage();
    await page.goto(`${fixture.url}/buttons`);
    const buf = await page.screenshot({ fullPage: true, format: 'png' });
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});
