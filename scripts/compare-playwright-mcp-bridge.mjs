#!/usr/bin/env node
import { createServer } from 'node:https';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  assertEqual,
  expectedDefaultTools,
  localToolNames,
  normalizeToolResponseText,
} from '#scripts/lib/playwright-mcp-parity';

const { image, reportPath } = parseArgs(process.argv.slice(2));
const baselineImage =
  process.env.PLAYWRIGHT_MCP_BASELINE_IMAGE ??
  'mcr.microsoft.com/playwright/mcp:v0.0.80@sha256:dda1f7f9b812e22946635c8af7df9288b96d3b9e3f0f1b8576d6823e2031c1de';

const fixtureServer = await startFixtureServer();
const baseline = await startMcpContainer('playwright', baselineImage, false);
const cloak = await startMcpContainer('cloak', image, true);
const cloakHumanized = await startMcpContainer('cloak-humanized', image, true, true);
const baselineDevtools = await startMcpContainer(
  'playwright-devtools',
  baselineImage,
  false,
  false,
  'devtools',
);
const cloakDevtools = await startMcpContainer('cloak-devtools', image, true, false, 'devtools');

try {
  const baselineRun = await runScenario(baseline, fixtureServer.url);
  const cloakRun = await runScenario(cloak, fixtureServer.url);
  compareRuns(baselineRun, cloakRun);
  await assertLocalTools(cloak);
  const humanizationRun = await runHumanizationScenario(cloakHumanized, fixtureServer.url);
  const baselineDevtoolsRun = await runDevtoolsSchemaScenario(baselineDevtools);
  const cloakDevtoolsRun = await runDevtoolsSchemaScenario(cloakDevtools);
  compareDevtoolsSchemaRuns(baselineDevtoolsRun, cloakDevtoolsRun);
  if (reportPath) {
    writeReport(reportPath, createReport(baselineRun, cloakRun, humanizationRun, baselineDevtoolsRun));
  }
  printSummary(baselineRun, cloakRun, humanizationRun, baselineDevtoolsRun);
} finally {
  await baseline.close();
  await cloak.close();
  await cloakHumanized.close();
  await baselineDevtools.close();
  await cloakDevtools.close();
  await fixtureServer.close();
}

function parseArgs(args) {
  const parsed = {
    image: 'cloakbrowser-mcp:dev',
    reportPath: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--report') {
      const value = args[index + 1];
      if (!value) throw new Error('--report requires a file path');
      parsed.reportPath = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--report=')) {
      parsed.reportPath = arg.slice('--report='.length);
      if (!parsed.reportPath) throw new Error('--report requires a file path');
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`unknown option: ${arg}`);
    }
    parsed.image = arg;
  }

  return parsed;
}

async function startMcpContainer(mode, containerImage, useCloakWrapper, humanize = false, caps) {
  const dataDir = mkdtempSync(path.join(tmpdir(), `pwmcp-${mode}-`));
  chmodSync(dataDir, 0o777);
  writeFileSync(path.join(dataDir, 'upload.txt'), `upload from ${mode}\n`);

  const dockerArgs = ['run', '--rm', '--init', '-i', '--network', 'host', '-v', `${dataDir}:/data`];
  if (caps) dockerArgs.push('-e', `PLAYWRIGHT_MCP_CAPS=${caps}`);
  if (useCloakWrapper) {
    dockerArgs.push(
      '-e',
      'PLAYWRIGHT_MCP_HEADLESS=true',
      '-e',
      'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
      '-e',
      ['PLAYWRIGHT_MCP_CODEGEN', 'python'].join('='),
      '-e',
      'PLAYWRIGHT_MCP_SNAPSHOT_BOXES=true',
      '-e',
      'PLAYWRIGHT_MCP_TIMEOUT_SETTLE=750',
      '-e',
      'PLAYWRIGHT_MCP_VIEWPORT_SIZE=1280x720',
      '-e',
      'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=true',
      '-e',
      'PLAYWRIGHT_MCP_IGNORE_HTTPS_ERRORS=true',
      containerImage,
    );
    if (humanize) {
      dockerArgs.splice(-1, 0, '-e', 'CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true');
    }
  } else {
    dockerArgs.push(
      containerImage,
      '--headless',
      '--output-dir',
      '/data',
      '--codegen',
      'python',
      '--snapshot-boxes',
      '--timeout-settle',
      '750',
      '--viewport-size',
      '1280x720',
      '--ignore-https-errors',
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
  const screenshotSchema = assertScreenshotSchemaSupportsWebp(tools, target.mode);
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
      calls.push({
        name,
        ok: !result.isError,
        ms: Date.now() - started,
        text: normalizeToolResponseText(text),
      });
      if (result.isError) throw new Error(`${name} returned an MCP error: ${text}`);
      return result;
    } catch (error) {
      calls.push({
        name,
        ok: false,
        ms: Date.now() - started,
        text: normalizeToolResponseText(error.message),
      });
      throw error;
    }
  };

  await call('browser_resize', { width: 1280, height: 720 });
  await call('browser_navigate', { url: fixtureUrl });
  const snapshot = await call('browser_snapshot');
  assertSnapshotIncludesBoxes(snapshot, target.mode);
  await call('browser_find', { text: 'Cloak MCP fixture' });
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
  await call('browser_take_screenshot', { type: 'webp', filename: 'page.webp' });
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

  return { mode: target.mode, tools: upstreamToolNames, screenshotSchema, calls };
}

async function runHumanizationScenario(target, fixtureUrl) {
  const { tools } = await target.client.listTools();
  const upstreamToolNames = tools
    .map((tool) => tool.name)
    .filter((name) => !localToolNames.includes(name))
    .sort();
  assertEqual(upstreamToolNames, expectedDefaultTools, `${target.mode} upstream tool list`);

  const calls = [];
  const call = async (name, args = {}) => {
    const started = Date.now();
    const result = await target.client.callTool({ name, arguments: args });
    const text =
      result.content?.map((item) => (item.type === 'text' ? item.text : `[${item.type}]`)).join('\n') ?? '';
    calls.push({
      name,
      ok: !result.isError,
      ms: Date.now() - started,
      text: normalizeToolResponseText(text),
    });
    if (result.isError) throw new Error(`${name} returned an MCP error: ${text}`);
    return result;
  };

  await call('browser_resize', { width: 1280, height: 720 });
  await call('browser_navigate', { url: fixtureUrl });
  await call('browser_select_option', { target: '#role', values: ['admin'] });
  await call('browser_click', { target: '#login' });
  const nestedKeyPress = await call('browser_run_code_unsafe', { code: nestedDelayedKeyPressCode() });
  const nestedKeyPressText = normalizeToolResponseText(
    nestedKeyPress.content?.map((item) => (item.type === 'text' ? item.text : `[${item.type}]`)).join('\n') ??
      '',
  );
  if (!nestedKeyPressText.includes('nested delayed key press preserved')) {
    throw new Error(`nested delayed key press result was unexpected: ${nestedKeyPressText}`);
  }
  await call('browser_close');

  return { calls };
}

async function runDevtoolsSchemaScenario(target) {
  const { tools } = await target.client.listTools();
  const upstreamTools = tools
    .filter((tool) => !localToolNames.includes(tool.name))
    .map((tool) => ({ name: tool.name, inputSchema: tool.inputSchema }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const recordingToolNames = ['browser_start_recording', 'browser_stop_recording'];

  for (const name of recordingToolNames) {
    if (!upstreamTools.some((tool) => tool.name === name)) {
      throw new Error(`${target.mode} devtools tool list is missing ${name}`);
    }
  }

  return { tools: upstreamTools };
}

function compareDevtoolsSchemaRuns(baselineRun, cloakRun) {
  assertEqual(cloakRun.tools, baselineRun.tools, 'devtools upstream tool schema parity');
}

function nestedDelayedKeyPressCode() {
  return `async (page) => {
  const frame = page.frames().find((candidate) => candidate.url().endsWith('/nested-inner'));
  if (!frame) throw new Error('nested fixture frame was not found');
  await frame.evaluate(() => {
    const input = document.querySelector('#nested-key-input');
    if (!(input instanceof HTMLInputElement)) throw new Error('nested fixture input was not found');
    globalThis.__cloakbrowserMcpKeyEvents = [];
    input.addEventListener('keydown', () => globalThis.__cloakbrowserMcpKeyEvents.push(performance.now()), {
      once: true,
    });
    input.addEventListener('keyup', () => globalThis.__cloakbrowserMcpKeyEvents.push(performance.now()), {
      once: true,
    });
    input.focus();
  });
  await frame.locator('#nested-key-input').press('x', { delay: 100 });
  const result = await frame.evaluate(() => {
    const input = document.querySelector('#nested-key-input');
    const events = globalThis.__cloakbrowserMcpKeyEvents;
    return {
      delay: Array.isArray(events) && events.length === 2 ? events[1] - events[0] : 0,
      value: input instanceof HTMLInputElement ? input.value : '',
    };
  });
  if (result.value !== 'x' || result.delay < 60) {
    throw new Error('nested delayed key press failed: ' + JSON.stringify(result));
  }
  return 'nested delayed key press preserved';
}`;
}

function assertScreenshotSchemaSupportsWebp(tools, mode) {
  const screenshotTool = tools.find((tool) => tool.name === 'browser_take_screenshot');
  const typeSchema = screenshotTool?.inputSchema?.properties?.type;
  if (!Array.isArray(typeSchema?.enum) || !typeSchema.enum.includes('webp')) {
    throw new Error(`${mode} browser_take_screenshot schema does not support WebP`);
  }
  return screenshotTool.inputSchema;
}

function assertSnapshotIncludesBoxes(result, mode) {
  const text =
    result.content
      ?.filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n') ?? '';
  if (!text.includes('[box=')) {
    throw new Error(`${mode} browser_snapshot response does not include bounding boxes`);
  }
}

function compareRuns(baselineRun, cloakRun) {
  assertEqual(cloakRun.tools, baselineRun.tools, 'upstream tool list parity');
  assertEqual(cloakRun.screenshotSchema, baselineRun.screenshotSchema, 'screenshot schema parity');
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

function printSummary(baselineRun, cloakRun, humanizationRun, devtoolsRun) {
  const width = Math.max(...baselineRun.calls.map((call) => call.name.length));
  process.stdout.write(
    `Compared ${baselineRun.tools.length} upstream Playwright MCP tools\nBaseline image: ${baselineImage}\nCloak image: ${image}\n`,
  );
  process.stdout.write(`${'Tool'.padEnd(width)}  baseline   cloak\n`);
  for (const [index, call] of baselineRun.calls.entries()) {
    const cloakCall = cloakRun.calls[index];
    process.stdout.write(
      `${call.name.padEnd(width)}  ${call.ok ? 'ok' : 'fail'} ${String(call.ms).padStart(5)}ms  ${
        cloakCall.ok ? 'ok' : 'fail'
      } ${String(cloakCall.ms).padStart(5)}ms\n`,
    );
  }
  process.stdout.write(
    `Humanization: nested delayed key press verified (${
      humanizationRun.calls.find((call) => call.name === 'browser_run_code_unsafe')?.ms
    }ms)\n`,
  );
  process.stdout.write(
    `Devtools schemas: matched ${devtoolsRun.tools.length} upstream tools including browser_start_recording and browser_stop_recording\n`,
  );
  if (reportPath) {
    process.stdout.write(`Parity report: ${reportPath}\n`);
  }
}

function createReport(baselineRun, cloakRun, humanizationRun, devtoolsRun) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baselineImage,
    cloakImage: image,
    upstreamToolCount: baselineRun.tools.length,
    upstreamTools: baselineRun.tools,
    localTools: localToolNames,
    result: {
      matched: true,
      comparedCalls: baselineRun.calls.length,
    },
    humanization: {
      actionAfterNavigation: true,
      nestedDelayedKeyPress: {
        verified: true,
        durationMs: humanizationRun.calls.find((call) => call.name === 'browser_run_code_unsafe')?.ms,
      },
      selectOption: true,
    },
    devtools: {
      caps: 'devtools',
      recordingTools: ['browser_start_recording', 'browser_stop_recording'],
      toolSchemaCount: devtoolsRun.tools.length,
      schemasMatched: true,
    },
    calls: baselineRun.calls.map((baselineCall, index) => {
      const cloakCall = cloakRun.calls[index];
      return {
        name: baselineCall.name,
        baseline: {
          ok: baselineCall.ok,
          durationMs: baselineCall.ms,
        },
        cloak: {
          ok: cloakCall.ok,
          durationMs: cloakCall.ms,
        },
      };
    }),
  };
}

function writeReport(filePath, report) {
  mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

async function startFixtureServer() {
  const server = createServer(readFixtureTlsOptions(), (request, response) => {
    const url = new URL(request.url ?? '/', 'https://127.0.0.1');
    if (url.pathname === '/api/data') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true, path: url.pathname }));
      return;
    }
    if (url.pathname === '/nested-outer') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(nestedOuterFixtureHtml());
      return;
    }
    if (url.pathname === '/nested-inner') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(nestedInnerFixtureHtml());
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
    url: `https://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function readFixtureTlsOptions() {
  return {
    cert: readFileSync(new URL('../tests/fixtures/tls/localhost-cert.pem', import.meta.url)),
    key: readFileSync(new URL('../tests/fixtures/tls/localhost-key.pem', import.meta.url)),
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
    <iframe id="nested-outer" src="/nested-outer" title="Nested fixture"></iframe>
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

function nestedOuterFixtureHtml() {
  return `<!doctype html>
<html>
  <body>
    <iframe id="nested-inner" src="/nested-inner" title="Deep nested fixture"></iframe>
  </body>
</html>`;
}

function nestedInnerFixtureHtml() {
  return `<!doctype html>
<html>
  <body>
    <label>Nested key input <input id="nested-key-input" /></label>
  </body>
</html>`;
}
