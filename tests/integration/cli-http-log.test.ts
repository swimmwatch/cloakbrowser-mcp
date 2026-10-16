import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { fetchHealth } from '@tests/helpers/http.js';
const tempRoots: string[] = [];
const children: ChildProcessWithoutNullStreams[] = [];
afterEach(async () => {
  const mappedValues = children.splice(0).map((child) => terminateChild(child));
  await Promise.allSettled(mappedValues);
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-cli-http-log-test-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
describe('streamable HTTP CLI logging', () => {
  it('logs the listening URL and requests to stderr while keeping stdout protocol-safe', async () => {
    const root = createTempRoot();
    const argumentValue = process.execPath;
    const values: readonly string[] | undefined = [
      '--conditions',
      'development',
      '--import',
      'tsx',
      'src/cli.ts',
      '--transport',
      'streamable-http',
      '--http-host',
      '127.0.0.1',
      '--http-port',
      '0',
    ];
    const uRL = new URL('../..', import.meta.url);
    const fileURLToPathResult2 = fileURLToPath(uRL);
    const options = { ...process.env };
    const uRL2 = new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url);
    const fileURLToPathResult = fileURLToPath(uRL2);
    const propertyValue = 'playwright';
    const joinedPath2 = path.join(root, 'out');
    const propertyValue2 = 'false';
    const options2 = {
      ...options,
      PLAYWRIGHT_MCP_CLI_PATH: fileURLToPathResult,
      PLAYWRIGHT_MCP_BROWSER_ENGINE: propertyValue,
      PLAYWRIGHT_MCP_OUTPUT_DIR: joinedPath2,
      CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: propertyValue2,
    } as const;
    const spawnOptions = {
      cwd: fileURLToPathResult2,
      env: options2,
    } as const;
    const child = spawn(argumentValue, values, spawnOptions);
    children.push(child);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const stderrLine = await waitForLine(
      child,
      stderr,
      / INFO cloakbrowser-mcp streamable-http listening /u,
      () => stdout.text,
      20000,
    );
    expect(stderrLine).toMatch(
      /^\d{4}-\d{2}-\d{2}T\S+Z INFO cloakbrowser-mcp streamable-http listening url=http:\/\/127\.0\.0\.1:\d+\/mcp$/u,
    );
    const replaceResult = stderrLine.replace(/^.* url=/u, '');
    const fetchHealthResult = fetchHealth(replaceResult);
    const receiverActual = fetchHealthResult;
    const toMatchObjectOptions = {
      status: 200,
    } as const;
    await expect(receiverActual).resolves.toMatchObject(toMatchObjectOptions);
    const waitForLineResult = waitForLine(
      child,
      stderr,
      /^\d{4}-\d{2}-\d{2}T\S+Z INFO cloakbrowser-mcp http request duration_ms=\d+ method=GET path=\/healthz status=200$/u,
      () => stdout.text,
      10000,
    );
    await expect(waitForLineResult).resolves.toBeDefined();
    expect(stdout.text).toBe('');
  }, 45000);
});
interface CollectedStream {
  text: string;
  onData(listener: (chunk: string) => void): void;
  offData(listener: (chunk: string) => void): void;
}
function collectStream(stream: NodeJS.ReadableStream): CollectedStream {
  const collected: {
    text: string;
  } = { text: '' };
  stream.on('data', (chunk: string) => {
    collected.text += chunk;
  });
  return {
    get text() {
      return collected.text;
    },
    onData(listener) {
      stream.on('data', listener);
    },
    offData(listener) {
      stream.off('data', listener);
    },
  };
}
function waitForLine(
  child: ChildProcessWithoutNullStreams,
  stream: CollectedStream,
  pattern: RegExp,
  diagnostics?: () => string,
  timeoutMs = 5000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      const diagnosticText = diagnostics?.().trim();
      const joinedPath3 = [
        `Timed out waiting for line matching ${pattern}`,
        stream.text.trim() ? `stdout:\n${stream.text.trim()}` : undefined,
        diagnosticText ? `stderr:\n${diagnosticText}` : undefined,
      ]
        .filter((line) => line !== undefined)
        .join('\n');
      const error2 = new Error(joinedPath3);
      reject(error2);
    }, timeoutMs);
    const findLine = (): string | undefined => stream.text.split(/\r?\n/u).find((line) => pattern.test(line));
    const onData = (): void => {
      const line = findLine();
      if (!line) return;
      cleanup();
      resolve(line);
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      cleanup();
      const diagnosticText = diagnostics?.().trim();
      const joinedPath4 = [
        `CLI exited before logging HTTP URL: code=${code ?? 'null'} signal=${signal ?? 'null'}`,
        diagnosticText ? `stderr:\n${diagnosticText}` : undefined,
      ]
        .filter((line) => line !== undefined)
        .join('\n');
      const error3 = new Error(joinedPath4);
      reject(error3);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      clearTimeout(timeout);
      stream.offData(onData);
      child.off('exit', onExit);
      child.off('error', onError);
    };
    const existingLine = findLine();
    if (existingLine) {
      cleanup();
      resolve(existingLine);
      return;
    }
    stream.onData(onData);
    child.once('exit', onExit);
    child.once('error', onError);
  });
}
async function terminateChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      killChild(child, 'SIGKILL');
    }, 2000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    killChild(child, 'SIGTERM');
  });
}
function killChild(child: ChildProcessWithoutNullStreams, signal?: NodeJS.Signals): void {
  try {
    child.kill(signal);
  } catch {
    try {
      child.kill();
    } catch {
      // The process may have exited between the status check and kill call.
    }
  }
}
