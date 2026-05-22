#!/usr/bin/env node
import { createServer } from 'node:http';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const image = process.argv[2] ?? 'cloakbrowser-mcp:dev';
const baselineImage = process.env.PLAYWRIGHT_MCP_BASELINE_IMAGE ?? 'mcr.microsoft.com/playwright/mcp:v0.0.75';
const localToolNames = ['cloakbrowser_binary_info', 'cloakbrowser_bridge_info'];
const expectedDefaultTools = [
  'browser_click',
  'browser_close',
  'browser_console_messages',
  'browser_drag',
  'browser_drop',
  'browser_evaluate',
  'browser_file_upload',
  'browser_fill_form',
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
  'browser_wait_for',
];

const fixtureServer = await startFixtureServer();
const baseline = await startMcpContainer('playwright', baselineImage, false);
const cloak = await startMcpContainer('cloak', image, true);

try {
  const baselineRun = await runScenario(baseline, fixtureServer.url);
  const cloakRun = await runScenario(cloak, fixtureServer.url);
  compareRuns(baselineRun, cloakRun);
  await assertLocalTools(cloak);
  printSummary(baselineRun, cloakRun);
} finally {
  await baseline.close();
  await cloak.close();
  await fixtureServer.close();
}

async function startMcpContainer(mode, containerImage, useCloakWrapper) {
  const dataDir = mkdtempSync(path.join(tmpdir(), `pwmcp-${mode}-`));
  chmodSync(dataDir, 0o777);
  writeFileSync(path.join(dataDir, 'upload.txt'), `upload from ${mode}\n`);

  const dockerArgs = ['run', '--rm', '-i', '--network', 'host', '-v', `${dataDir}:/data`];
  if (useCloakWrapper) {
    dockerArgs.push(
      '-e',
      'PLAYWRIGHT_MCP_HEADLESS=true',
      '-e',
      'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
      '-e',
      'PLAYWRIGHT_MCP_OUTPUT_MODE=stdout',
      '-e',
      'PLAYWRIGHT_MCP_VIEWPORT_SIZE=1280x720',
      '-e',
      'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=true',
      containerImage,
    );
  } else {
    dockerArgs.push(
      containerImage,
      '--headless',
      '--output-dir',
      '/data',
      '--output-mode',
      'stdout',
      '--viewport-size',
      '1280x720',
    );
  }

  const client = new Client({ name: `compare-${mode}`, version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: 'docker',
    args: dockerArgs,
    stderr: 'pipe',
  });
  transport.stderr?.on('data', (chunk) => process.stderr.write(`[${mode}] ${chunk}`));
  await client.connect(transport);

  return {
    mode,
    client,
    uploadPath: '/data/upload.txt',
    async close() {
      await client.close().catch(() => undefined);
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

async function runScenario(target, fixtureUrl) {
  const { tools } = await target.client.listTools();
  const toolNames = tools.map((tool) => tool.name).sort();
  const upstreamToolNames = toolNames.filter((name) => !localToolNames.includes(name));
  const calls = [];

  assertEqual(upstreamToolNames, expectedDefaultTools, `${target.mode} upstream tool list`);
  for (const name of localToolNames) {
    if (target.mode === 'cloak' && !toolNames.includes(name)) {
      throw new Error(`cloak tool list is missing ${name}`);
    }
  }

  const call = async (name, args = {}) => {
    if (process.env.PLAYWRIGHT_MCP_COMPARE_TRACE === '1') {
      process.stderr.write(`[${target.mode}] call ${name}\n`);
    }
    const started = Date.now();
    try {
      const result = await target.client.callTool({ name, arguments: args });
      const text =
        result.content?.map((item) => (item.type === 'text' ? item.text : `[${item.type}]`)).join('\n') ?? '';
      calls.push({ name, ok: !result.isError, ms: Date.now() - started, text: normalizeText(text) });
      if (result.isError) throw new Error(`${name} returned an MCP error: ${text}`);
      return result;
    } catch (error) {
      calls.push({ name, ok: false, ms: Date.now() - started, text: normalizeText(error.message) });
      throw error;
    }
  };

  await call('browser_resize', { width: 1280, height: 720 });
  await call('browser_navigate', { url: fixtureUrl });
  await call('browser_snapshot');
  await call('browser_console_messages', { level: 'info', all: true });
  await call('browser_wait_for', { text: 'Cloak MCP fixture' });
  await call('browser_evaluate', { function: '() => document.title' });
  await call('browser_fill_form', {
    fields: [
      { name: 'Name', type: 'textbox', target: '#name', value: 'Ada' },
      { name: 'Agree', type: 'checkbox', target: '#agree', value: 'true' },
    ],
  });
  await call('browser_type', { target: '#notes', text: 'typed text' });
  await call('browser_select_option', { target: '#role', values: ['admin'] });
  await call('browser_press_key', { key: 'Tab' });
  await call('browser_hover', { target: '#login' });
  await call('browser_click', { target: '#login' });
  await call('browser_drag', { startTarget: '#drag-source', endTarget: '#drop-target' });
  await call('browser_drop', { target: '#drop-target', data: { 'text/plain': 'dropped payload' } });
  await call('browser_click', { target: '#file-input' });
  await call('browser_file_upload', { paths: [target.uploadPath] });
  await call('browser_take_screenshot', { type: 'png', filename: 'page.png' });
  await call('browser_network_requests', { static: false });
  await call('browser_network_request', { index: 1, part: 'response-body' });
  await call('browser_run_code_unsafe', { code: 'async (page) => await page.title()' });
  await call('browser_tabs', { action: 'list' });
  await call('browser_tabs', { action: 'new', url: `${fixtureUrl}?tab=2` });
  await call('browser_tabs', { action: 'select', index: 0 });
  await call('browser_tabs', { action: 'close', index: 1 });
  await call('browser_navigate', { url: `${fixtureUrl}?page=2` });
  await call('browser_navigate_back');
  await call('browser_click', { target: '#dialog-button' });
  await call('browser_handle_dialog', { accept: true, promptText: 'accepted' });
  await call('browser_close');

  const covered = [...new Set(calls.map((entry) => entry.name))].sort();
  assertEqual(covered, expectedDefaultTools, `${target.mode} covered tools`);

  return { mode: target.mode, tools: upstreamToolNames, calls };
}

function compareRuns(baselineRun, cloakRun) {
  assertEqual(cloakRun.tools, baselineRun.tools, 'upstream tool list parity');
  assertEqual(
    cloakRun.calls.map((call) => call.name),
    baselineRun.calls.map((call) => call.name),
    'tool call sequence parity',
  );

  for (const [index, call] of cloakRun.calls.entries()) {
    const baseline = baselineRun.calls[index];
    if (baseline.ok !== call.ok) throw new Error(`${call.name} success mismatch at call ${index + 1}`);
    if (baseline.text !== call.text) {
      throw new Error(
        `${call.name} response mismatch at call ${index + 1}\n` +
          `baseline: ${baseline.text}\n` +
          `cloak: ${call.text}`,
      );
    }
  }
}

async function assertLocalTools(target) {
  for (const name of localToolNames) {
    const result = await target.client.callTool({ name, arguments: {} });
    if (result.isError) throw new Error(`${name} returned an error`);
    if (!result.structuredContent) throw new Error(`${name} did not return structured content`);
  }
}

function printSummary(baselineRun, cloakRun) {
  const width = Math.max(...baselineRun.calls.map((call) => call.name.length));
  process.stdout.write(
    `Compared ${baselineRun.tools.length} upstream Playwright MCP tools\nBaseline image: ${baselineImage}\nCloak image: ${image}\n`,
  );
  process.stdout.write(`${'Tool'.padEnd(width)}  baseline   cloak\n`);
  for (const [index, call] of baselineRun.calls.entries()) {
    const cloakCall = cloakRun.calls[index];
    process.stdout.write(
      `${call.name.padEnd(width)}  ${call.ok ? 'ok' : 'fail'} ${String(call.ms).padStart(5)}ms  ${
        cloakCalg.ok ? 'ok' : 'fail'
      } ${String(cloakCall.ms).padStart(5)}ms\n`,
    );
  }
}

async function startFixtureServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/api/data') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true, path: url.pathname }));
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(fixtureHtml());
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function fixtureHtml() {
  return `<!doctype html>
<html>
  <head>
    <title>Cloak MCP fixture</title>
    <style>
      body { font-family: sans-serif; padding: 24px; }
      #drop-target { border: 2px dashed #0f766e; height: 96px; margin-top: 12px; padding: 12px; }
    </style>
  </head>
  <body>
    <h1>Cloak MCP fixture</h1>
    <form>
      <label>Name <input id="name" name="name" /></label>
      <label>Agree <input id="agree" type="checkbox" /></label>
      <label>Notes <textarea id="notes"></textarea></label>
      <label>Role
        <select id="role"><option value="user">User</option><option value="admin">Admin</option></select>
      </label>
      <input id="file-input" type="file" />
    </form>
    <button id="login" type="button">Login</button>
    <button id="dialog-button" type="button">Dialog</button>
    <div id="drag-source" draggable="true">Drag source</div>
    <div id="drop-target">Drop target</div>
    <pre id="status">ready</pre>
    <script>
      console.log('fixture-loaded');
      fetch('/api/data').then(r => r.json()).then(data => {
        document.querySelector('#status').textContent = 'api:' + data.ok;
      });
      document.querySelector('#login').addEventListener('click', () => {
        document.body.dataset.clicked = 'true';
      });
      document.querySelector('#dialog-button').addEventListener('click', () => {
        prompt('Dialog question', 'default');
      });
      document.querySelector('#file-input').addEventListener('change', event => {
        document.body.dataset.file = event.target.files[0]?.name || '';
      });
      document.querySelector('#drag-source').addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', 'dragged');
      });
      document.querySelector('#drop-target').addEventListener('dragover', event => event.preventDefault());
      document.querySelector('#drop-target').addEventListener('drop', event => {
        event.preventDefault();
        document.querySelector('#drop-target').textContent =
          event.dataTransfer.getData('text/plain') || 'dropped';
      });
    </script>
  </body>
</html>`;
}

function normalizeText(value) {
  return value
    .replaceAll(/\n### Events\n(?:- .*(?:\n|$))+/g, '')
    .replaceAll(/\/data\/[^\s)"']+/g, '/data/<artifact>')
    .replaceAll(/page-\d+\.(png|jpeg|pdf)/g, 'page-<timestamp>.$1')
    .replaceAll(/\d{3,}ms/g, '<duration>ms');
}

function assertEqual(actual, expected, label) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${label} mismatch\nactual:   ${actualText}\nexpected: ${expectedText}`);
  }
}
