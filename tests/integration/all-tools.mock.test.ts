import { mkdtempSync, rmSync } from 'node:fs';
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

describe('all registered tools integration coverage', () => {
  let dir: string;
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'cbmcp-all-tools-'));
    const config = configSchema.parse({
      outputDir: dir,
      logLevel: 'silent',
      capabilities: {
        allowScreenshots: true,
        allowPdf: true,
        allowStorageMutation: true,
        allowNetworkInterception: true,
        allowDevtoolsExperimental: true,
        allowCoordinateInput: true,
        allowBinaryInstall: true,
      },
    });
    server = createServer({
      config,
      adapter: new MockBrowserAdapter(sampleFixtures),
      logger: createLogger('silent'),
    });
  });

  afterEach(async () => {
    await server.dispose();
    rmSync(dir, { recursive: true, force: true });
  });

  it('has a successful integration scenario for every registered tool', async () => {
    const covered = new Set<string>();
    const registered = server.registry
      .list()
      .map((tool) => tool.name)
      .sort();

    const callTool = async (name: string, input: Record<string, unknown> = {}) => {
      const result = await server.registry.call(name, input);
      expect(result.isError, `${name} failed: ${result.content[0]?.text ?? 'empty result'}`).toBeFalsy();
      covered.add(name);
      return result;
    };

    await callTool('browser_get_config');
    await callTool('cloakbrowser_binary_info');
    await callTool('cloakbrowser_install_binary');
    await callTool('browser_tabs', { action: 'list' });

    await callTool('browser_resize', { width: 1024, height: 768 });
    await callTool('browser_navigate', { url: 'https://example.test/' });
    await callTool('browser_trace_start');
    await callTool('browser_snapshot');
    await callTool('browser_console_messages');

    await callTool('browser_verify_text', { text: 'Welcome' });
    await callTool('browser_verify_selector_count', { selector: '#login', count: 1 });
    await callTool('browser_verify_url', { url: 'https://example.test/' });

    await callTool('browser_pdf_save', { filename: 'page.pdf' });
    await callTool('browser_set_cookies', {
      cookies: [{ name: 'session', value: 'abc123', url: 'https://example.test/' }],
    });
    await callTool('browser_clear_storage');
    await callTool('browser_network_route', { action: 'block', url: '**/*.png' });
    await callTool('browser_network_route', { action: 'continue', url: '**/api/**' });
    const fulfilled = await callTool('browser_network_route', {
      action: 'fulfill',
      url: '**/mock',
      status: 201,
      contentType: 'application/json',
      body: '{"ok":true}',
      headers: { 'x-test': 'true' },
    });
    const fulfilledPayload = fulfilled.structuredContent?.value as { route: { id: string } };
    await callTool('browser_network_route', { action: 'clear', id: fulfilledPayload.route.id });
    await callTool('browser_network_route', { action: 'clear' });

    await callTool('browser_click', { selector: '#login' });
    await callTool('browser_hover', { selector: '#login' });
    await callTool('browser_type', { selector: 'input[name=user]', text: 'alice' });
    await callTool('browser_fill_form', {
      fields: [{ selector: 'input[name=pass]', value: 'secret' }],
    });
    await callTool('browser_select_option', { selector: 'select[name=role]', values: ['admin'] });
    await callTool('browser_press_key', { key: 'Enter' });
    await callTool('browser_handle_dialog', { accept: true, promptText: 'yes' });

    await callTool('browser_evaluate', { function: '() => document.title' });
    await callTool('browser_run_code_unsafe', { code: 'async (page) => await page.title()' });
    await callTool('browser_drag', { startSelector: '#drop-source', endSelector: '#drop-target' });
    await callTool('browser_drop', { target: '#drop-target', data: { 'text/plain': 'payload' } });
    await callTool('browser_mouse_click', { x: 10, y: 20 });
    await callTool('browser_mouse_move', { x: 20, y: 30 });
    await callTool('browser_mouse_drag', { startX: 20, startY: 30, endX: 40, endY: 50 });
    await callTool('browser_mouse_wheel', { deltaY: 120 });

    await callTool('browser_click', { selector: '#file-input' });
    await callTool('browser_file_upload', { paths: [thisFile] });

    await callTool('browser_network_requests');
    await callTool('browser_network_request', { index: 1 });
    await callTool('browser_take_screenshot');
    await callTool('browser_har_save', { filename: 'network.har' });
    await callTool('browser_video_save', { filename: 'video.webm' });
    await callTool('browser_trace_stop', { filename: 'trace.zip' });
    await callTool('browser_wait_for', { text: 'Welcome' });

    await callTool('browser_navigate', { url: 'https://example.test/welcome' });
    await callTool('browser_navigate_back');
    await callTool('browser_close');

    expect([...covered].sort()).toEqual(registered);
  });
});
