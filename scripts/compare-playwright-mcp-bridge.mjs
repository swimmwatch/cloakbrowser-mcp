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
  supportsFindFilename,
} from '#scripts/lib/playwright-mcp-parity';
const sliceResult = process.argv.slice(2);
const { image, reportPath } = parseArgs(sliceResult);
const baselineImage =
  process.env.PLAYWRIGHT_MCP_BASELINE_IMAGE ??
  'mcr.microsoft.com/playwright/mcp:v0.0.83@sha256:690763cbb437ee7233f538a953bb5390bf03791eb5c965b471e59d17a6132fcb';
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
const baselineWebmcp = await startMcpContainer(
  'playwright-webmcp',
  baselineImage,
  false,
  false,
  undefined,
  true,
);
const bridgeWebmcp = await startMcpContainer('bridge-webmcp', image, true, false, undefined, true);
const bridgeWebmcpDisabled = await startMcpContainer(
  'bridge-webmcp-disabled',
  image,
  true,
  false,
  undefined,
  true,
  false,
);
try {
  const baselineRun = await runScenario(baseline, fixtureServer.url);
  const cloakRun = await runScenario(cloak, fixtureServer.url);
  compareRuns(baselineRun, cloakRun);
  await assertLocalTools(cloak);
  const humanizationRun = await runHumanizationScenario(cloakHumanized, fixtureServer.url);
  const baselineDevtoolsRun = await runDevtoolsSchemaScenario(baselineDevtools);
  const cloakDevtoolsRun = await runDevtoolsSchemaScenario(cloakDevtools);
  compareDevtoolsSchemaRuns(baselineDevtoolsRun, cloakDevtoolsRun);
  const baselineWebmcpRun = await runWebmcpScenario(baselineWebmcp, fixtureServer.url);
  const bridgeWebmcpRun = await runWebmcpScenario(bridgeWebmcp, fixtureServer.url);
  compareWebmcpRuns(baselineWebmcpRun, bridgeWebmcpRun);
  await assertWebmcpDisabled(bridgeWebmcpDisabled, fixtureServer.url);
  if (reportPath) {
    const reportResult = createReport(
      baselineRun,
      cloakRun,
      humanizationRun,
      baselineDevtoolsRun,
      baselineWebmcpRun,
    );
    writeReport(reportPath, reportResult);
  }
  printSummary(baselineRun, cloakRun, humanizationRun, baselineDevtoolsRun, baselineWebmcpRun);
} finally {
  await baseline.close();
  await cloak.close();
  await cloakHumanized.close();
  await baselineDevtools.close();
  await cloakDevtools.close();
  await baselineWebmcp.close();
  await bridgeWebmcp.close();
  await bridgeWebmcpDisabled.close();
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
      const message2 = `unknown option: ${arg}`;
      throw new Error(message2);
    }
    parsed.image = arg;
  }
  return parsed;
}
async function startMcpContainer(
  mode,
  containerImage,
  useCloakWrapper,
  humanize = false,
  caps,
  webmcp = false,
  webmcpEnabled = true,
) {
  const tmpdirResult = tmpdir();
  const message3 = `pwmcp-${mode}-`;
  const joinedPath = path.join(tmpdirResult, message3);
  const dataDir = mkdtempSync(joinedPath);
  chmodSync(dataDir, 0o777);
  const joinedPath2 = path.join(dataDir, 'upload.txt');
  const message4 = `upload from ${mode}\n`;
  writeFileSync(joinedPath2, message4);
  if (webmcp && !useCloakWrapper) {
    const joinedPath3 = path.join(dataDir, 'webmcp.config.json');
    const stringifyOptions = { browser: { launchOptions: { args: ['--enable-features=WebMCP'] } } };
    const templateValue = JSON.stringify(stringifyOptions);
    const message5 = `${templateValue}\n`;
    writeFileSync(joinedPath3, message5);
  }
  const dockerArgs = ['run', '--rm', '--init', '-i', '--network', 'host', '-v', `${dataDir}:/data`];
  if (caps) {
    const message6 = `PLAYWRIGHT_MCP_CAPS=${caps}`;
    dockerArgs.push('-e', message6);
  }
  if (useCloakWrapper) {
    const joinedPath4 = ['PLAYWRIGHT_MCP_CODEGEN', 'python'].join('=');
    dockerArgs.push(
      '-e',
      'PLAYWRIGHT_MCP_HEADLESS=true',
      '-e',
      'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
      '-e',
      joinedPath4,
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
    if (webmcp) {
      // CloakBrowser 146 predates Chromium's WebMCP implementation (landed in 154).
      // Exercise the bridge notification/cache path with the image's bundled Playwright Chromium.
      dockerArgs.splice(-1, 0, '-e', 'PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright');
      dockerArgs.splice(-1, 0, '-e', 'PLAYWRIGHT_MCP_NO_SANDBOX=true');
      dockerArgs.splice(-1, 0, '-e', 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS=--enable-features=WebMCP');
      if (!webmcpEnabled) dockerArgs.splice(-1, 0, '-e', 'PLAYWRIGHT_MCP_WEBMCP=false');
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
    if (webmcp) dockerArgs.push('--config', '/data/webmcp.config.json');
  }
  const clientOptions = { name: `compare-${mode}`, version: '1.0.0' };
  const client = new Client(clientOptions);
  const stdioClientTransportOptions = {
    command: 'docker',
    args: dockerArgs,
    stderr: 'pipe',
  };
  const transport = new StdioClientTransport(stdioClientTransportOptions);
  transport.stderr?.on('data', (chunk) => {
    const message7 = `[${mode}] ${chunk}`;
    return process.stderr.write(message7);
  });
  await client.connect(transport);
  return {
    mode,
    client,
    findOutputPath: path.join(dataDir, 'find-results.md'),
    uploadPath: '/data/upload.txt',
    async close() {
      await client.close().catch(() => undefined);
      const rmSyncOptions = { recursive: true, force: true };
      rmSync(dataDir, rmSyncOptions);
    },
  };
}
async function runScenario(target, fixtureUrl) {
  const { tools } = await target.client.listTools();
  const toolNames = tools.map((tool) => tool.name).sort();
  const upstreamTools = tools.filter((tool) => !localToolNames.includes(tool.name));
  const upstreamToolNames = upstreamTools.map((tool) => tool.name).sort();
  const screenshotSchema = assertScreenshotSchemaSupportsWebp(tools, target.mode);
  const findFilenameSupported = supportsFindFilename(tools);
  const calls = [];
  const message9 = `${target.mode} upstream tool list`;
  assertEqual(upstreamToolNames, expectedDefaultTools, message9);
  for (const name of localToolNames) {
    if (target.mode === 'cloak' && !toolNames.includes(name)) {
      const message10 = `cloak tool list is missing ${name}`;
      throw new Error(message10);
    }
  }
  const call = async (name, args = {}) => {
    if (process.env.PLAYWRIGHT_MCP_COMPARE_TRACE === '1') {
      const message11 = `[${target.mode}] call ${name}\n`;
      process.stderr.write(message11);
    }
    const started = Date.now();
    try {
      const callToolOptions = { name, arguments: args };
      const result = await target.client.callTool(callToolOptions);
      const text =
        result.content?.map((item) => (item.type === 'text' ? item.text : `[${item.type}]`)).join('\n') ?? '';
      const pushOptions = {
        name,
        ok: !result.isError,
        ms: Date.now() - started,
        text: normalizeToolResponseText(text),
      };
      calls.push(pushOptions);
      if (result.isError) {
        const message12 = `${name} returned an MCP error: ${text}`;
        throw new Error(message12);
      }
      return result;
    } catch (error) {
      const pushOptions2 = {
        name,
        ok: false,
        ms: Date.now() - started,
        text: normalizeToolResponseText(error.message),
      };
      calls.push(pushOptions2);
      throw error;
    }
  };
  const callOptions = { width: 1280, height: 720 };
  await call('browser_resize', callOptions);
  const callOptions2 = { url: fixtureUrl };
  await call('browser_navigate', callOptions2);
  const callOptions3 = {
    colorScheme: 'dark',
    media: 'screen',
    reducedMotion: 'reduce',
  };
  await call('browser_emulate_media', callOptions3);
  const snapshot = await call('browser_snapshot');
  assertSnapshotIncludesBoxes(snapshot, target.mode);
  const callOptions4 = { text: 'Cloak MCP fixture' };
  await call('browser_find', callOptions4);
  if (findFilenameSupported) {
    const callOptions5 = { text: 'Cloak MCP fixture', filename: '/data/find-results.md' };
    await call('browser_find', callOptions5);
    if (!readFileSync(target.findOutputPath, 'utf8').includes('Cloak MCP fixture')) {
      const message13 = `${target.mode} browser_find did not save the expected result`;
      throw new Error(message13);
    }
  }
  const callOptions6 = { text: 'Cloak MCP fixture' };
  await call('browser_wait_for', callOptions6);
  const callOptions7 = { function: '() => document.title' };
  await call('browser_evaluate', callOptions7);
  const callOptions8 = {
    fields: [
      { name: 'Name', type: 'textbox', target: '#name', value: 'Ada' },
      { name: 'Agree', type: 'checkbox', target: '#agree', value: 'true' },
    ],
  };
  await call('browser_fill_form', callOptions8);
  const callOptions9 = { target: '#notes', text: 'typed text' };
  await call('browser_type', callOptions9);
  const callOptions10 = { target: '#role', values: ['admin'] };
  await call('browser_select_option', callOptions10);
  const callOptions11 = { key: 'Tab' };
  await call('browser_press_key', callOptions11);
  const callOptions12 = { target: '#login' };
  await call('browser_hover', callOptions12);
  const callOptions13 = { target: '#login' };
  await call('browser_click', callOptions13);
  const callOptions14 = { startTarget: '#drag-source', endTarget: '#drop-target' };
  await call('browser_drag', callOptions14);
  const callOptions15 = { target: '#drop-target', data: { 'text/plain': 'dropped payload' } };
  await call('browser_drop', callOptions15);
  const callOptions16 = { target: '#file-input' };
  await call('browser_click', callOptions16);
  const callOptions17 = { paths: [target.uploadPath] };
  await call('browser_file_upload', callOptions17);
  const callOptions18 = { target: '#file-input' };
  await call('browser_click', callOptions18);
  const callOptions19 = { paths: [target.uploadPath] };
  await call('browser_file_upload', callOptions19);
  const callOptions20 = { type: 'webp', filename: 'page.webp' };
  await call('browser_take_screenshot', callOptions20);
  const callOptions21 = { static: false };
  await call('browser_network_requests', callOptions21);
  const callOptions22 = { index: 1, part: 'response-body' };
  await call('browser_network_request', callOptions22);
  const callOptions23 = { code: 'async (page) => await page.title()' };
  await call('browser_run_code_unsafe', callOptions23);
  const callOptions24 = { action: 'list' };
  await call('browser_tabs', callOptions24);
  const callOptions25 = { action: 'new', url: `${fixtureUrl}?tab=2` };
  await call('browser_tabs', callOptions25);
  const callOptions26 = { action: 'select', index: 0 };
  await call('browser_tabs', callOptions26);
  const callOptions27 = { action: 'close', index: 1 };
  await call('browser_tabs', callOptions27);
  const callOptions28 = { url: `${fixtureUrl}?page=2` };
  await call('browser_navigate', callOptions28);
  await call('browser_navigate_back');
  const callOptions29 = { target: '#dialog-button' };
  await call('browser_click', callOptions29);
  const callOptions30 = { accept: true, promptText: 'accepted' };
  await call('browser_handle_dialog', callOptions30);
  const callOptions31 = { level: 'debug', all: true };
  const consoleMessages = await call('browser_console_messages', callOptions31);
  assertConsoleMethods(consoleMessages, target.mode);
  const callOptions32 = { function: '() => document.body.dataset.consoleProbe' };
  await call('browser_evaluate', callOptions32);
  await call('browser_close');
  const mappedValues = calls.map((entry) => entry.name);
  const argumentValue = [...new Set(mappedValues)];
  const covered = [...argumentValue].sort();
  const message14 = `${target.mode} covered tools`;
  assertEqual(covered, expectedDefaultTools, message14);
  return {
    mode: target.mode,
    tools: upstreamToolNames,
    toolSchemas: upstreamTools,
    screenshotSchema,
    findFilenameSupported,
    calls,
  };
}
async function runHumanizationScenario(target, fixtureUrl) {
  const { tools } = await target.client.listTools();
  const upstreamToolNames = tools
    .map((tool) => tool.name)
    .filter((name) => !localToolNames.includes(name))
    .sort();
  const message15 = `${target.mode} upstream tool list`;
  assertEqual(upstreamToolNames, expectedDefaultTools, message15);
  const calls = [];
  const call = async (name, args = {}) => {
    const started = Date.now();
    const callToolOptions2 = { name, arguments: args };
    const result = await target.client.callTool(callToolOptions2);
    const text =
      result.content?.map((item) => (item.type === 'text' ? item.text : `[${item.type}]`)).join('\n') ?? '';
    const pushOptions3 = {
      name,
      ok: !result.isError,
      ms: Date.now() - started,
      text: normalizeToolResponseText(text),
    };
    calls.push(pushOptions3);
    if (result.isError) {
      const message16 = `${name} returned an MCP error: ${text}`;
      throw new Error(message16);
    }
    return result;
  };
  const callOptions33 = { width: 1280, height: 720 };
  await call('browser_resize', callOptions33);
  const callOptions34 = { url: fixtureUrl };
  await call('browser_navigate', callOptions34);
  const callOptions35 = { target: '#role', values: ['admin'] };
  await call('browser_select_option', callOptions35);
  const callOptions36 = { target: '#login' };
  await call('browser_click', callOptions36);
  const callOptions37 = { code: nestedDelayedKeyPressCode() };
  const nestedKeyPress = await call('browser_run_code_unsafe', callOptions37);
  const computedValue =
    nestedKeyPress.content?.map((item) => (item.type === 'text' ? item.text : `[${item.type}]`)).join('\n') ??
    '';
  const nestedKeyPressText = normalizeToolResponseText(computedValue);
  if (!nestedKeyPressText.includes('nested delayed key press preserved')) {
    const message17 = `nested delayed key press result was unexpected: ${nestedKeyPressText}`;
    throw new Error(message17);
  }
  await call('browser_close');
  return { calls };
}
async function runWebmcpScenario(target, fixtureUrl) {
  const dynamicNames = async () =>
    (await target.client.listTools()).tools
      .map((tool) => tool.name)
      .filter((name) => name.startsWith('webmcp_'))
      .sort();
  const expectDynamicNames = async (expected, label) => {
    const deadline = Date.now() + 2000;
    let actual = await dynamicNames();
    while (JSON.stringify(actual) !== JSON.stringify(expected) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      actual = await dynamicNames();
    }
    if (actual.length === 0 && expected.length > 0) {
      const callToolOptions3 = {
        name: 'browser_run_code_unsafe',
        arguments: {
          code: `async (page) => ({
            browserVersion: page.context().browser()?.version(),
            hasModelContext: await page.evaluate(() => Boolean(document.modelContext || navigator.modelContext))
          })`,
        },
      };
      const diagnostic = await target.client.callTool(callToolOptions3);
      const templateValue2 = label;
      const toolResultTextResult = toolResultText(diagnostic);
      const templateValue3 = normalizeToolResponseText(toolResultTextResult);
      const message18 = `${templateValue2} mismatch; browser diagnostic: ${templateValue3}`;
      throw new Error(message18);
    }
    assertEqual(actual, expected, label);
  };
  const values2 = [];
  const message19 = `${target.mode} initial WebMCP tools`;
  await expectDynamicNames(values2, message19);
  const callToolOptions4 = {
    name: 'browser_navigate',
    arguments: { url: new URL('webmcp', fixtureUrl).href },
  };
  await target.client.callTool(callToolOptions4);
  const values3 = ['webmcp_add'];
  const message20 = `${target.mode} first-tab WebMCP tools`;
  await expectDynamicNames(values3, message20);
  const addTool = (await target.client.listTools()).tools.find((tool) => tool.name === 'webmcp_add');
  if (addTool?.inputSchema?.properties?.a?.type !== 'number') {
    const message21 = `${target.mode} webmcp_add schema was not forwarded`;
    throw new Error(message21);
  }
  if (addTool.annotations?.readOnlyHint !== true) {
    const message22 = `${target.mode} webmcp_add annotations were not forwarded`;
    throw new Error(message22);
  }
  const callToolOptions5 = {
    name: 'webmcp_add',
    arguments: { a: 2, b: 40 },
  };
  const addResult = await target.client.callTool(callToolOptions5);
  if (addResult.isError || !toolResultText(addResult).includes('42')) {
    const message23 = `${target.mode} webmcp_add did not return 42`;
    throw new Error(message23);
  }
  const callToolOptions6 = {
    name: 'browser_tabs',
    arguments: { action: 'new', url: new URL('webmcp-second', fixtureUrl).href },
  };
  await target.client.callTool(callToolOptions6);
  const values4 = ['webmcp_echo'];
  const message24 = `${target.mode} second-tab WebMCP tools`;
  await expectDynamicNames(values4, message24);
  const callToolOptions7 = { name: 'browser_tabs', arguments: { action: 'select', index: 0 } };
  await target.client.callTool(callToolOptions7);
  const values5 = ['webmcp_add'];
  const message25 = `${target.mode} restored first-tab WebMCP tools`;
  await expectDynamicNames(values5, message25);
  const callToolOptions8 = {
    name: 'browser_navigate',
    arguments: { url: new URL('plain', fixtureUrl).href },
  };
  await target.client.callTool(callToolOptions8);
  const values6 = [];
  const message26 = `${target.mode} removed WebMCP tools`;
  await expectDynamicNames(values6, message26);
  const callToolOptions9 = {
    name: 'webmcp_add',
    arguments: { a: 1, b: 1 },
  };
  const removedResult = await target.client.callTool(callToolOptions9);
  if (removedResult.isError !== true) {
    const message27 = `${target.mode} removed WebMCP tool remained callable`;
    throw new Error(message27);
  }
  const callToolOptions10 = { name: 'browser_close', arguments: {} };
  await target.client.callTool(callToolOptions10);
  const propertyValue = addTool.inputSchema;
  const propertyValue2 = addTool.annotations;
  const toolResultTextResult2 = toolResultText(addResult);
  const normalizeToolResponseTextResult = normalizeToolResponseText(toolResultTextResult2);
  return {
    addSchema: propertyValue,
    addAnnotations: propertyValue2,
    addResponse: normalizeToolResponseTextResult,
  };
}
function compareWebmcpRuns(baselineRun, cloakRun) {
  assertEqual(cloakRun, baselineRun, 'WebMCP dynamic tool parity');
}
async function assertWebmcpDisabled(target, fixtureUrl) {
  const callToolOptions11 = {
    name: 'browser_navigate',
    arguments: { url: new URL('webmcp', fixtureUrl).href },
  };
  await target.client.callTool(callToolOptions11);
  const deadline = Date.now() + 2000;
  do {
    const dynamicTools = (await target.client.listTools()).tools.filter((tool) =>
      tool.name.startsWith('webmcp_'),
    );
    const values7 = [];
    const message28 = `${target.mode} disabled WebMCP tools`;
    assertEqual(dynamicTools, values7, message28);
    await new Promise((resolve) => setTimeout(resolve, 25));
  } while (Date.now() < deadline);
  const callToolOptions12 = { name: 'browser_close', arguments: {} };
  await target.client.callTool(callToolOptions12);
}
function toolResultText(result) {
  return result.content.map((item) => (item.type === 'text' ? item.text : `[${item.type}]`)).join('\n');
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
      const message29 = `${target.mode} devtools tool list is missing ${name}`;
      throw new Error(message29);
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
    const message30 = `${mode} browser_take_screenshot schema does not support WebP`;
    throw new Error(message30);
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
    const message31 = `${mode} browser_snapshot response does not include bounding boxes`;
    throw new Error(message31);
  }
}
function assertConsoleMethods(result, mode) {
  const text =
    result.content
      ?.filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n') ?? '';
  for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
    if (
      (() => {
        const message32 = `console-probe-${method}`;
        return !text.includes(message32);
      })()
    ) {
      const message33 = `${mode} console probe is missing console.${method}`;
      throw new Error(message33);
    }
  }
}
function compareRuns(baselineRun, cloakRun) {
  assertEqual(cloakRun.tools, baselineRun.tools, 'upstream tool list parity');
  assertEqual(cloakRun.toolSchemas, baselineRun.toolSchemas, 'upstream tool schema parity');
  assertEqual(cloakRun.screenshotSchema, baselineRun.screenshotSchema, 'screenshot schema parity');
  const mappedValues2 = cloakRun.calls.map((call) => call.name);
  const mappedValues3 = baselineRun.calls.map((call) => call.name);
  assertEqual(mappedValues2, mappedValues3, 'tool call sequence parity');
  for (const [index, call] of cloakRun.calls.entries()) {
    const baseline = baselineRun.calls[index];
    if (baseline.ok !== call.ok)
      throw (() => {
        const message34 = `${call.name} success mismatch at call ${index + 1}`;
        return new Error(message34);
      })();
    // Console history differs by browser engine; assertConsoleMethods validates the current page output.
    if (call.name === 'browser_console_messages') continue;
    if (baseline.text !== call.text) {
      const computedValue2 =
        `${call.name} response mismatch at call ${index + 1}\n` +
        `baseline: ${baseline.text}\n` +
        `cloak: ${call.text}`;
      throw new Error(computedValue2);
    }
  }
}
async function assertLocalTools(target) {
  for (const name of localToolNames) {
    const callToolOptions13 = { name, arguments: {} };
    const result = await target.client.callTool(callToolOptions13);
    if (result.isError)
      throw (() => {
        const message35 = `${name} returned an error`;
        return new Error(message35);
      })();
    if (!result.structuredContent)
      throw (() => {
        const message36 = `${name} did not return structured content`;
        return new Error(message36);
      })();
  }
}
function printSummary(baselineRun, cloakRun, humanizationRun, devtoolsRun, webmcpRun) {
  const spreadValues = [...baselineRun.calls.map((call) => call.name.length)];
  const width = Math.max(...spreadValues);
  const message37 = `Compared ${baselineRun.tools.length} upstream Playwright MCP tools\nBaseline image: ${baselineImage}\nCloak image: ${image}\n`;
  process.stdout.write(message37);
  const message38 = `${'Tool'.padEnd(width)}  baseline   cloak\n`;
  process.stdout.write(message38);
  for (const [index, call] of baselineRun.calls.entries()) {
    const cloakCall = cloakRun.calls[index];
    const message39 = `${call.name.padEnd(width)}  ${call.ok ? 'ok' : 'fail'} ${String(call.ms).padStart(5)}ms  ${cloakCall.ok ? 'ok' : 'fail'} ${String(cloakCall.ms).padStart(5)}ms\n`;
    process.stdout.write(message39);
  }
  const message40 = `Humanization: nested delayed key press verified (${humanizationRun.calls.find((call) => call.name === 'browser_run_code_unsafe')?.ms}ms)\n`;
  process.stdout.write(message40);
  const message41 = `Devtools schemas: matched ${devtoolsRun.tools.length} upstream tools including browser_start_recording and browser_stop_recording\n`;
  process.stdout.write(message41);
  const message42 = `WebMCP: dynamic add/call/remove and tab switching verified (${webmcpRun.addResponse})\n`;
  process.stdout.write(message42);
  if (reportPath) {
    const message43 = `Parity report: ${reportPath}\n`;
    process.stdout.write(message43);
  }
}
function createReport(baselineRun, cloakRun, humanizationRun, devtoolsRun, webmcpRun) {
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
      findFilenameSupported: baselineRun.findFilenameSupported,
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
    webmcp: {
      dynamicLifecycle: true,
      tabSwitching: true,
      disabledMode: true,
      addResponse: webmcpRun.addResponse,
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
  const resolvedValue = path.resolve(filePath);
  const dirnameResult = path.dirname(resolvedValue);
  const mkdirSyncOptions = { recursive: true };
  mkdirSync(dirnameResult, mkdirSyncOptions);
  const message44 = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(filePath, message44);
}
async function startFixtureServer() {
  const fixtureTlsOptionsResult = readFixtureTlsOptions();
  const server = createServer(fixtureTlsOptionsResult, (request, response) => {
    const computedValue3 = request.url ?? '/';
    const url = new URL(computedValue3, 'https://127.0.0.1');
    if (url.pathname === '/api/data') {
      const writeHeadOptions = { 'content-type': 'application/json' };
      response.writeHead(200, writeHeadOptions);
      const stringifyOptions2 = { ok: true, path: url.pathname };
      const serializedValue = JSON.stringify(stringifyOptions2);
      response.end(serializedValue);
      return;
    }
    if (url.pathname === '/nested-outer') {
      const writeHeadOptions2 = { 'content-type': 'text/html; charset=utf-8' };
      response.writeHead(200, writeHeadOptions2);
      const nestedOuterFixtureHtmlResult = nestedOuterFixtureHtml();
      response.end(nestedOuterFixtureHtmlResult);
      return;
    }
    if (url.pathname === '/nested-inner') {
      const writeHeadOptions3 = { 'content-type': 'text/html; charset=utf-8' };
      response.writeHead(200, writeHeadOptions3);
      const nestedInnerFixtureHtmlResult = nestedInnerFixtureHtml();
      response.end(nestedInnerFixtureHtmlResult);
      return;
    }
    if (url.pathname === '/webmcp') {
      const writeHeadOptions4 = { 'content-type': 'text/html; charset=utf-8' };
      response.writeHead(200, writeHeadOptions4);
      const webmcpFixtureHtmlResult = webmcpFixtureHtml('add');
      response.end(webmcpFixtureHtmlResult);
      return;
    }
    if (url.pathname === '/webmcp-second') {
      const writeHeadOptions5 = { 'content-type': 'text/html; charset=utf-8' };
      response.writeHead(200, writeHeadOptions5);
      const webmcpFixtureHtmlResult2 = webmcpFixtureHtml('echo');
      response.end(webmcpFixtureHtmlResult2);
      return;
    }
    if (url.pathname === '/plain') {
      const writeHeadOptions6 = { 'content-type': 'text/html; charset=utf-8' };
      response.writeHead(200, writeHeadOptions6);
      response.end('<!doctype html><title>Plain page</title><h1>No WebMCP tools</h1>');
      return;
    }
    const writeHeadOptions7 = { 'content-type': 'text/html; charset=utf-8' };
    response.writeHead(200, writeHeadOptions7);
    const fixtureHtmlResult = fixtureHtml();
    response.end(fixtureHtmlResult);
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
  const uRL = new URL('../tests/fixtures/tls/localhost-cert.pem', import.meta.url);
  const fileSyncResult = readFileSync(uRL);
  const uRL2 = new URL('../tests/fixtures/tls/localhost-key.pem', import.meta.url);
  const fileSyncResult2 = readFileSync(uRL2);
  return {
    cert: fileSyncResult,
    key: fileSyncResult2,
  };
}
function fixtureHtml() {
  const uRL3 = new URL('../tests/fixtures/bridge-comparison/index.html', import.meta.url);
  return readFileSync(uRL3, 'utf8');
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
function webmcpFixtureHtml(tool) {
  const message45 = `../tests/fixtures/bridge-comparison/webmcp-${tool}.html`;
  const uRL4 = new URL(message45, import.meta.url);
  return readFileSync(uRL4, 'utf8');
}
