import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockBrowserAdapter } from '@/browser/mockAdapter.js';
import { configSchema } from '@/config/schema.js';
import { createLogger } from '@/logging/logger.js';
import { createServer } from '@/server.js';
import { sampleFixtures } from '../fixtures/mockPages.js';

const thisFile = fileURLToPath(import.meta.url);

describe('createServer with mock adapter (full tool flow)', () => {
  let dir: string;
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'cbmcp-it-'));
    const config = configSchema.parse({
      outputDir: dir,
      logLevel: 'silent',
      capabilities: { allowScreenshots: true },
    });
    const adapter = new MockBrowserAdapter(sampleFixtures);
    server = createServer({ config, adapter, logger: createLogger('silent') });
  });

  afterEach(async () => {
    await server.dispose();
    rmSync(dir, { recursive: true, force: true });
  });

  it('registers the Playwright-compatible surface plus default project tools', () => {
    const names = server.registry
      .list()
      .map((t) => t.name)
      .sort();
    expect(names).toEqual([
      'browser_click',
      'browser_close',
      'browser_console_messages',
      'browser_drag',
      'browser_drop',
      'browser_evaluate',
      'browser_file_upload',
      'browser_fill_form',
      'browser_get_config',
      'browser_handle_dialog',
      'browser_hover',
      'browser_navigate',
      'browser_navigate_back',
      'browser_network_request',
      'browser_network_requests',
      'browser_press_key',
      'browser_resize',
      'browser_run_code_unsafe',
      'browser_select_option',
      'browser_snapshot',
      'browser_tabs',
      'browser_take_screenshot',
      'browser_type',
      'browser_verify_selector_count',
      'browser_verify_text',
      'browser_verify_url',
      'browser_wait_for',
      'cloakbrowser_binary_info',
    ]);
  });

  it('browser_get_config returns redacted config', async () => {
    const res = await server.registry.call('browser_get_config', {});
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0]!.text) as Record<string, unknown>;
    expect(parsed.headless).toBe(true);
    expect(parsed.capabilities).toBeDefined();
  });

  it('navigates, snapshots, interacts, screenshots, navigates back', async () => {
    const nav = await server.registry.call('browser_navigate', { url: 'https://example.test/' });
    expect(nav.isError).toBeFalsy();

    const snap = await server.registry.call('browser_snapshot', {});
    expect(snap.isError).toBeFalsy();
    expect(snap.content[0]!.text).toContain('Example');

    const click = await server.registry.call('browser_click', { selector: '#login' });
    expect(click.isError).toBeFalsy();

    const type = await server.registry.call('browser_type', { selector: 'input[name=user]', text: 'alice' });
    expect(type.isError).toBeFalsy();

    const fill = await server.registry.call('browser_fill_form', {
      fields: [{ selector: 'input[name=pass]', value: 'secret' }],
    });
    expect(fill.isError).toBeFalsy();

    const sel = await server.registry.call('browser_select_option', {
      selector: 'select[name=role]',
      values: ['admin'],
    });
    expect(sel.isError).toBeFalsy();

    const press = await server.registry.call('browser_press_key', { key: 'Enter' });
    expect(press.isError).toBeFalsy();

    const shot = await server.registry.call('browser_take_screenshot', {});
    expect(shot.isError).toBeFalsy();

    const wait = await server.registry.call('browser_wait_for', { text: 'no-such-text-anywhere' });
    expect(wait.isError).toBe(true);
    expect(wait.content[0]!.text).toContain('TIMEOUT');

    const verifyText = await server.registry.call('browser_verify_text', { text: 'Welcome' });
    expect(verifyText.isError).toBeFalsy();

    const verifyCount = await server.registry.call('browser_verify_selector_count', {
      selector: '#login',
      count: 1,
    });
    expect(verifyCount.isError).toBeFalsy();

    const verifyUrl = await server.registry.call('browser_verify_url', { contains: 'example.test' });
    expect(verifyUrl.isError).toBeFalsy();

    const verifyTextAbsent = await server.registry.call('browser_verify_text', {
      text: 'not present',
      present: false,
    });
    expect(verifyTextAbsent.isError).toBeFalsy();

    const verifyCountRange = await server.registry.call('browser_verify_selector_count', {
      selector: '#login',
      min: 1,
      max: 1,
    });
    expect(verifyCountRange.isError).toBeFalsy();

    const verifyUrlRegex = await server.registry.call('browser_verify_url', { regex: 'example\\.test' });
    expect(verifyUrlRegex.isError).toBeFalsy();

    const verifyCountFailure = await server.registry.call('browser_verify_selector_count', {
      selector: '#login',
      count: 2,
    });
    expect(verifyCountFailure.isError).toBe(true);
    expect(verifyCountFailure.content[0]!.text).toContain('ASSERTION_FAILED');

    const verifyUrlFailure = await server.registry.call('browser_verify_url', { contains: 'wrong.test' });
    expect(verifyUrlFailure.isError).toBe(true);
    expect(verifyUrlFailure.content[0]!.text).toContain('ASSERTION_FAILED');

    const verifyUrlBadRegex = await server.registry.call('browser_verify_url', { regex: '[' });
    expect(verifyUrlBadRegex.isError).toBe(true);
    expect(verifyUrlBadRegex.content[0]!.text).toContain('INVALID_INPUT');

    const nav2 = await server.registry.call('browser_navigate', { url: 'https://example.test/welcome' });
    expect(nav2.isError).toBeFalsy();

    const back = await server.registry.call('browser_navigate_back', {});
    expect(back.isError).toBeFalsy();

    const console_ = await server.registry.call('browser_console_messages', {});
    expect(console_.isError).toBeFalsy();
  });

  it('accepts Playwright MCP-compatible input aliases for shared tools', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });

    const expectOk = async (promise: Promise<{ isError?: boolean }>) => {
      const result = await promise;
      expect(result.isError).toBeFalsy();
    };

    await expectOk(server.registry.call('browser_click', { target: '#login', doubleClick: true }));
    await expectOk(server.registry.call('browser_hover', { target: '#login', element: 'login button' }));
    await expectOk(
      server.registry.call('browser_type', { target: 'input[name=user]', text: 'alice', submit: true }),
    );
    await expectOk(
      server.registry.call('browser_fill_form', {
        fields: [{ target: 'input[name=pass]', name: 'Password', type: 'textbox', value: 'secret' }],
      }),
    );
    await expectOk(
      server.registry.call('browser_select_option', { target: 'select[name=role]', values: ['admin'] }),
    );
    await expectOk(
      server.registry.call('browser_drag', { startTarget: '#drop-source', endTarget: '#drop-target' }),
    );
    await expectOk(
      server.registry.call('browser_drop', { target: '#drop-target', data: { 'text/plain': 'hello' } }),
    );
    await expectOk(server.registry.call('browser_resize', { width: 1024, height: 768 }));
    await expectOk(server.registry.call('browser_wait_for', { time: 0.1 }));
    await expectOk(server.registry.call('browser_wait_for', { textGone: 'not present' }));
    await expectOk(
      server.registry.call('browser_take_screenshot', {
        target: '#login',
        type: 'jpeg',
        filename: 'compat.jpg',
      }),
    );
  });

  it('implements Playwright MCP evaluate and unsafe code tools', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });

    const evaluated = await server.registry.call('browser_evaluate', { function: '() => document.title' });
    expect(evaluated.isError).toBeFalsy();
    expect(evaluated.content[0]!.text).toContain('Example');

    const elementEvaluated = await server.registry.call('browser_evaluate', {
      target: '#login',
      element: 'login button',
      function: '(element) => element.textContent',
    });
    expect(elementEvaluated.isError).toBeFalsy();
    expect(elementEvaluated.content[0]!.text).toContain('#login');

    const unsafe = await server.registry.call('browser_run_code_unsafe', {
      code: 'async (page) => await page.title()',
    });
    expect(unsafe.isError).toBeFalsy();
    expect(unsafe.content[0]!.text).toContain('Example');
  });

  it('implements Playwright MCP file upload, drop, and network tools', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });

    const uploadWithoutChooser = await server.registry.call('browser_file_upload', { paths: [thisFile] });
    expect(uploadWithoutChooser.isError).toBe(true);
    expect(uploadWithoutChooser.content[0]!.text).toContain('no pending file chooser');

    await server.registry.call('browser_click', { target: '#file-input' });
    const upload = await server.registry.call('browser_file_upload', { paths: [thisFile] });
    expect(upload.isError).toBeFalsy();

    const drop = await server.registry.call('browser_drop', {
      target: '#drop-target',
      paths: [thisFile],
      data: { 'text/plain': 'payload' },
    });
    expect(drop.isError).toBeFalsy();

    const requests = await server.registry.call('browser_network_requests', {});
    expect(requests.isError).toBeFalsy();
    expect(requests.content[0]!.text).toContain('[1] GET 200 https://example.test/');

    const request = await server.registry.call('browser_network_request', { index: 1 });
    expect(request.isError).toBeFalsy();
    expect(request.content[0]!.text).toContain('"url": "https://example.test/"');

    const responseBody = await server.registry.call('browser_network_request', {
      index: 1,
      part: 'response-body',
      filename: 'network-response.txt',
    });
    expect(responseBody.isError).toBeFalsy();
    const responsePayload = responseBody.structuredContent?.value as { artifact: { path: string } };
    expect(readFileSync(responsePayload.artifact.path, 'utf8')).toContain('Welcome to the example page');
  });

  it('returns INVALID_INPUT for malformed network filters', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });

    const result = await server.registry.call('browser_network_requests', { filter: '[' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('INVALID_INPUT');
  });

  it('browser_resize creates a page when no page is active', async () => {
    const resized = await server.registry.call('browser_resize', { width: 1024, height: 768 });
    expect(resized.isError).toBeFalsy();
    expect(resized.structuredContent).toMatchObject({ width: 1024, height: 768 });

    const listed = await server.registry.call('browser_tabs', { action: 'list' });
    const data = JSON.parse(listed.content[0]!.text) as { pages: { active: boolean; url: string }[] };
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0]).toMatchObject({ active: true, url: 'about:blank' });
  });

  it('browser_close defaults to closing the browser', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });
    await server.registry.call('browser_tabs', { action: 'new', url: 'https://example.test/welcome' });

    const closed = await server.registry.call('browser_close', {});
    expect(closed.isError).toBeFalsy();
    expect(closed.content[0]!.text).toContain('browser closed');

    const listed = await server.registry.call('browser_tabs', { action: 'list' });
    const data = JSON.parse(listed.content[0]!.text) as { pages: unknown[] };
    expect(data.pages).toHaveLength(0);
  });

  it('browser_close can still close only the selected page', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });
    await server.registry.call('browser_tabs', { action: 'new', url: 'https://example.test/welcome' });

    const closed = await server.registry.call('browser_close', { scope: 'page' });
    expect(closed.isError).toBeFalsy();

    const listed = await server.registry.call('browser_tabs', { action: 'list' });
    const data = JSON.parse(listed.content[0]!.text) as { pages: { url: string }[] };
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0]!.url).toBe('https://example.test/');
  });

  it('browser_tabs supports Playwright-style index and new-tab url inputs', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });
    const list1 = await server.registry.call('browser_tabs', { action: 'list' });
    expect(list1.isError).toBeFalsy();

    const open = await server.registry.call('browser_tabs', {
      action: 'new',
      url: 'https://example.test/welcome',
    });
    expect(open.isError).toBeFalsy();

    const list2 = await server.registry.call('browser_tabs', { action: 'list' });
    const data = JSON.parse(list2.content[0]!.text) as { pages: { active: boolean; url: string }[] };
    expect(data.pages.length).toBe(2);
    expect(data.pages[1]).toMatchObject({ active: true, url: 'https://example.test/welcome' });

    const selected = await server.registry.call('browser_tabs', { action: 'select', index: 0 });
    expect(selected.isError).toBeFalsy();
    const afterSelect = JSON.parse(
      (await server.registry.call('browser_tabs', { action: 'list' })).content[0]!.text,
    ) as { pages: { active: boolean }[] };
    expect(afterSelect.pages[0]!.active).toBe(true);
    expect(afterSelect.pages[1]!.active).toBe(false);

    const closed = await server.registry.call('browser_tabs', { action: 'close', index: 1 });
    expect(closed.isError).toBeFalsy();
    const afterClose = JSON.parse(
      (await server.registry.call('browser_tabs', { action: 'list' })).content[0]!.text,
    ) as { pages: { url: string }[] };
    expect(afterClose.pages).toHaveLength(1);
    expect(afterClose.pages[0]!.url).toBe('https://example.test/');
  });

  it('returns INVALID_INPUT when selecting a tab without a valid page id or index', async () => {
    const result = await server.registry.call('browser_tabs', { action: 'select' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('INVALID_INPUT');
  });

  it('supports Playwright-style snapshot and console artifact options', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });

    const snapshot = await server.registry.call('browser_snapshot', {
      target: '#login',
      filename: 'snapshot.json',
      depth: 1,
      boxes: true,
    });
    expect(snapshot.isError).toBeFalsy();
    const snapshotPayload = snapshot.structuredContent?.value as { artifact: { path: string } };
    const snapshotArtifact = snapshotPayload.artifact;
    expect(existsSync(snapshotArtifact.path)).toBe(true);
    const snapshotJson = JSON.parse(readFileSync(snapshotArtifact.path, 'utf8')) as {
      boxesRequested: boolean;
      nodes: { depth: number }[];
      target: string;
    };
    expect(snapshotJson.target).toBe('#login');
    expect(snapshotJson.boxesRequested).toBe(true);
    expect(snapshotJson.nodes.every((node) => node.depth <= 1)).toBe(true);

    const errorsOnly = await server.registry.call('browser_console_messages', { level: 'error' });
    expect(errorsOnly.isError).toBeFalsy();
    const errorsData = JSON.parse(errorsOnly.content[0]!.text) as { messages: unknown[] };
    expect(errorsData.messages).toHaveLength(0);

    const consoleFile = await server.registry.call('browser_console_messages', {
      level: 'info',
      filename: 'console.txt',
    });
    expect(consoleFile.isError).toBeFalsy();
    const consolePayload = consoleFile.structuredContent?.value as { artifact: { path: string } };
    const consoleArtifact = consolePayload.artifact;
    expect(readFileSync(consoleArtifact.path, 'utf8')).toContain('navigated to https://example.test/');
  });

  it('browser_wait_for fails when textGone text is still present', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });
    const res = await server.registry.call('browser_wait_for', { textGone: 'Welcome' });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('TIMEOUT');
  });

  it('rejects unknown tools and forbidden non-Playwright aliases', async () => {
    expect(server.registry.has('browser_evaluate')).toBe(true);
    const r = await server.registry.call('browser_eval', {});
    expect(r.isError).toBe(true);
  });

  it('blocks navigation to denied origin', async () => {
    // Re-create server with allowedOrigins set.
    await server.dispose();
    const config = configSchema.parse({
      outputDir: dir,
      logLevel: 'silent',
      allowedOrigins: ['allowed.test'],
    });
    server = createServer({
      config,
      adapter: new MockBrowserAdapter(sampleFixtures),
      logger: createLogger('silent'),
    });
    const res = await server.registry.call('browser_navigate', { url: 'https://example.test/' });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('ORIGIN_DENIED');
  });

  it('does not register screenshot tool when capability disabled', async () => {
    await server.dispose();
    const config = configSchema.parse({
      outputDir: dir,
      logLevel: 'silent',
      capabilities: { allowScreenshots: false },
    });
    server = createServer({
      config,
      adapter: new MockBrowserAdapter(sampleFixtures),
      logger: createLogger('silent'),
    });
    expect(server.registry.has('browser_take_screenshot')).toBe(false);
  });

  it('handle_dialog arms a decision on the page', async () => {
    await server.registry.call('browser_navigate', { url: 'https://example.test/' });
    const r = await server.registry.call('browser_handle_dialog', { accept: true, promptText: 'yes' });
    expect(r.isError).toBeFalsy();
  });
});
