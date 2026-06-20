import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { fetchHealth } from '@tests/helpers/http.js';

const tempRoots: string[] = [];
const children: ChildProcessWithoutNullStreams[] = [];

afterEach(async () => {
  await Promise.allSettled(children.splice(0).map((child) => terminateChild(child)));
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-cli-http-log-test-'));
  tempRoots.push(root);
  return root;
}

describe('streamable HTTP CLI logging', () => {
  it('logs the listening URL and requests to stdout', async () => {
    const root = createTempRoot();
    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        'src/cli.ts',
        '--transport',
        'streamable-http',
        '--http-host',
        '127.0.0.1',
        '--http-port',
        '0',
      ],
      {
        cwd: fileURLToPath(new URL('../..', import.meta.url)),
        env: {
          ...process.env,
          PLAYWRIGHT_MCP_CLI_PATH: fileURLToPath(
            new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url),
          ),
          PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'out'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      },
    );
    children.push(child);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);

    const stdoutLine = await waitForLine(
      child,
      stdout,
      / INFO cloakbrowser-mcp streamable-http listening /u,
      () => stderr.text,
    );
    expect(stdoutLine).toMatch(
      /^\d{4}-\d{2}-\d{2}T\S+Z INFO cloakbrowser-mcp streamable-http listening url=http:\/\/127\.0\.0\.1:\d+\/mcp$/u,
    );

    await expect(fetchHealth(stdoutLine.replace(/^.* url=/u, ''))).resolves.toMatchObject({
      status: 200,
    });

    await expect(
      waitForLine(
        child,
        stdout,
        /^\d{4}-\d{2}-\d{2}T\S+Z INFO cloakbrowser-mcp http request duration_ms=\d+ method=GET path=\/healthz status=200$/u,
      ),
    ).resolves.toBeDefined();
    expect(stderr.text).toBe('');
  });
});

interface CollectedStream {
  text: string;
  onData(listener: (chunk: string) => void): void;
  offData(listener: (chunk: string) => void): void;
}

function collectStream(stream: NodeJS.ReadableStream): CollectedStream {
  const collected: { text: string } = { text: '' };
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
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for line matching ${pattern}`));
    }, 5_000);

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
      reject(
        new Error(
          [
            `CLI exited before logging HTTP URL: code=${code ?? 'null'} signal=${signal ?? 'null'}`,
            diagnosticText ? `stderr:\n${diagnosticText}` : undefined,
          ]
            .filter((line) => line !== undefined)
            .join('\n'),
        ),
      );
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
    }, 2_000);
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
