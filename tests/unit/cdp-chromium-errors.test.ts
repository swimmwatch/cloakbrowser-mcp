import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import {
  createChromiumCdpClient,
  readAndDeletePageChallenge,
  readChromiumDiscovery,
} from '@/cdp/chromium.js';
import { CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES } from '@/cdp/limits.js';
import {
  type FakeChromiumCdpHandler,
  type FakeChromiumCdpServer,
  startFakeChromiumCdp,
} from '@tests/fixtures/fake-chromium-cdp.js';

const servers: FakeChromiumCdpServer[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  const closing = servers.splice(0).map((server) => server.close());
  await Promise.all(closing);
});

async function serve(handler: FakeChromiumCdpHandler): Promise<FakeChromiumCdpServer> {
  const server = await startFakeChromiumCdp(handler);
  servers.push(server);
  return server;
}

function discover(server: FakeChromiumCdpServer): Promise<unknown> {
  const signal = AbortSignal.timeout(2000);
  return readChromiumDiscovery(server.host, server.port, signal);
}

describe('Chromium CDP discovery failures', () => {
  const invalidVersions = ['null', '[]', '{}', '{"webSocketDebuggerUrl":7}'];
  it.each(invalidVersions)(
    'rejects an invalid version document %s before requesting targets',
    async (body) => {
      const fake = await serve((_request, response) => response.end(body));
      const discovery = discover(fake);
      await expect(discovery).rejects.toThrow('Chromium version discovery is invalid');
      expect(fake.requests).toHaveLength(1);
    },
  );
  it('rejects invalid JSON and oversized discovery responses', async () => {
    const bodies = ['{', 'x'.repeat(CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES + 1)];
    const messages = ['invalid JSON', 'too large'];
    for (const [index, body] of bodies.entries()) {
      const fake = await serve((_request, response) => response.end(body));
      const discovery = discover(fake);
      const message = messages[index];
      await expect(discovery).rejects.toThrow(message);
    }
  });
  it('rejects a response interrupted after headers without waiting for bootstrap timeout', async () => {
    const fake = await serve((_request, response) => {
      response.writeHead(200);
      response.flushHeaders();
      response.write('{');
      setImmediate(() => response.destroy());
    });
    const discovery = discover(fake);
    await expect(discovery).rejects.toThrow('aborted');
  });
  const invalidTargets: Array<[string, string]> = [
    ['{}', 'target discovery is invalid'],
    ['[]', 'has no page target'],
    ['[{"type":"worker","webSocketDebuggerUrl":"ws://foreign.test/"}]', 'has no page target'],
    ['[{"type":"page","webSocketDebuggerUrl":null}]', 'has no page target'],
  ];
  it.each(invalidTargets)('rejects unusable target discovery %s', async (targets, message) => {
    const fake = await serve((request, response) => {
      const version = { webSocketDebuggerUrl: `ws://${fake.host}:${fake.port}/devtools/browser/id` };
      const body = request.url === '/json/version' ? JSON.stringify(version) : targets;
      response.end(body);
    });
    const discovery = discover(fake);
    await expect(discovery).rejects.toThrow(message);
  });
  const unsafeUrls = [
    'not a URL',
    'http://127.0.0.1:PORT/devtools/browser/id',
    'ws://user:secret@127.0.0.1:PORT/devtools/browser/id',
    'ws://127.0.0.1:PORT/devtools/page/id',
    'ws://127.0.0.1:PORT/devtools/browser/id?token=secret',
    'ws://127.0.0.1:PORT/devtools/browser/id#fragment',
  ];
  it.each(unsafeUrls)('rejects unsafe discovery URL %s without exposing its contents', async (template) => {
    const fake = await serve((_request, response) => {
      const webSocketDebuggerUrl = template.replace('PORT', String(fake.port));
      const value = { webSocketDebuggerUrl };
      const body = JSON.stringify(value);
      response.end(body);
    });
    const discovery = discover(fake);
    const error = await discovery.catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw new Error('Discovery did not fail');
    expect(error.message).toMatch(/WebSocket URL is invalid|selected internal endpoint/u);
    expect(error.message).not.toContain('secret');
    expect(fake.requests).toHaveLength(1);
  });
  it('retries an HTTP unavailable response until valid discovery is published', async () => {
    let attempts = 0;
    const fake = await serve((request, response) => {
      if (request.url === '/json/version' && ++attempts === 1) {
        response.writeHead(503);
        response.end('Starting');
        return;
      }
      const url = `ws://${fake.host}:${fake.port}/devtools`;
      const value =
        request.url === '/json/version'
          ? { webSocketDebuggerUrl: `${url}/browser/id` }
          : [{ type: 'page', webSocketDebuggerUrl: `${url}/page/id` }];
      const body = JSON.stringify(value);
      response.end(body);
    });
    const client = createChromiumCdpClient(fake.host, fake.port);
    const signal = AbortSignal.timeout(2000);
    const result = await client.discover(signal);
    const expected = {
      browserWebSocketUrl: `ws://${fake.host}:${fake.port}/devtools/browser/id`,
      pageWebSocketUrl: `ws://${fake.host}:${fake.port}/devtools/page/id`,
    };
    expect(result).toEqual(expected);
    expect(attempts).toBe(2);
  });
  it('stops discovery retries on cancellation and preserves the caller reason', async () => {
    const controller = new AbortController();
    const reason = new Error('Caller cancelled discovery');
    const fake = await serve((_request, response) => {
      response.writeHead(503);
      response.end();
      if (fake.requests.length === 2) controller.abort(reason);
    });
    const client = createChromiumCdpClient(fake.host, fake.port);
    const result = client.discover(controller.signal);
    await expect(result).rejects.toBe(reason);
    expect(fake.requests).toHaveLength(2);
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(fake.requests).toHaveLength(2);
  });
});

describe('Chromium ownership challenge failures and cleanup', () => {
  it('reads and deletes hostile property names as data without executing them', async () => {
    const propertyName = '__challenge";globalThis.injected=true;//</script>\u2028\u2029';
    const sandbox: Record<string, unknown> = {
      [propertyName]: 'owned',
      unrelated: 'retained',
      injected: false,
    };
    let expression: string | undefined;
    const fake = await startFakeChromiumCdp(
      (_request, response) => response.end(),
      (socket) => {
        socket.once('message', (data) => {
          const serialized = Buffer.from(data as ArrayBuffer).toString();
          const command = JSON.parse(serialized) as { params: { expression: string } };
          expression = command.params.expression;
          const response = { id: 1, result: { result: { value: 'owned' } } };
          const message = JSON.stringify(response);
          socket.send(message);
        });
      },
    );
    servers.push(fake);
    const url = `ws://${fake.host}:${fake.port}/devtools/page/id`;
    const signal = AbortSignal.timeout(2000);
    const result = readAndDeletePageChallenge(url, propertyName, signal);
    await expect(result).resolves.toBe('owned');
    if (expression === undefined) throw new Error('Expected a challenge expression');
    expect(expression).not.toMatch(/<\/script|[\u2028\u2029]/iu);
    const observed = runInNewContext(expression, sandbox) as unknown;
    expect(observed).toBe('owned');
    const remains = Object.hasOwn(sandbox, propertyName);
    expect(remains).toBe(false);
    expect(sandbox.unrelated).toBe('retained');
    expect(sandbox.injected).toBe(false);
  });
  const failures: Array<[string, string]> = [
    ['{', 'challenge response is invalid'],
    ['{"id":1,"error":{"message":"private upstream details"}}', 'rejected the ownership challenge'],
    ['close', 'closed before challenge response'],
  ];
  it.each(failures)('rejects %s and closes the socket and abort listener', async (body, message) => {
    let markClosed: (() => void) | undefined;
    const closed = new Promise<void>((resolve) => {
      markClosed = resolve;
    });
    const fake = await startFakeChromiumCdp(
      (_request, response) => response.end(),
      (socket) => {
        socket.once('close', () => markClosed?.());
        socket.once('message', () => {
          if (body === 'close') socket.close();
          else socket.send(body);
        });
      },
    );
    servers.push(fake);
    const signal = AbortSignal.timeout(2000);
    const remove = vi.spyOn(signal, 'removeEventListener');
    const url = `ws://${fake.host}:${fake.port}/devtools/page/id`;
    const result = readAndDeletePageChallenge(url, '__challenge', signal);
    await expect(result).rejects.toThrow(message);
    await closed;
    expect(fake.webSockets.size).toBe(0);
    const anyFunction = expect.any(Function);
    expect(remove).toHaveBeenCalledWith('abort', anyFunction);
  });
  it('ignores notifications and responses for other commands before the challenge result', async () => {
    const fake = await startFakeChromiumCdp(
      (_request, response) => response.end(),
      (socket) => {
        socket.once('message', () => {
          socket.send('null');
          socket.send('{"method":"Runtime.consoleAPICalled"}');
          socket.send('{"id":2,"error":{"message":"unrelated"}}');
          socket.send('{"id":1,"result":{"result":{"value":"owned"}}}');
        });
      },
    );
    servers.push(fake);
    const url = `ws://${fake.host}:${fake.port}/devtools/page/id`;
    const signal = AbortSignal.timeout(2000);
    const result = readAndDeletePageChallenge(url, '__challenge', signal);
    await expect(result).resolves.toBe('owned');
  });
  it('reports an unavailable WebSocket endpoint', async () => {
    const fake = await serve((_request, response) => response.end());
    const url = `ws://${fake.host}:${fake.port}/devtools/page/id`;
    const signal = AbortSignal.timeout(2000);
    const result = readAndDeletePageChallenge(url, '__challenge', signal);
    await expect(result).rejects.toThrow('page target is unavailable');
  });
  it('aborts a connected challenge and removes its abort listener', async () => {
    const controller = new AbortController();
    let markClosed: (() => void) | undefined;
    const closed = new Promise<void>((resolve) => {
      markClosed = resolve;
    });
    const fake = await startFakeChromiumCdp(
      (_request, response) => response.end(),
      (socket) => {
        socket.once('close', () => markClosed?.());
        socket.once('message', () => controller.abort());
      },
    );
    servers.push(fake);
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const url = `ws://${fake.host}:${fake.port}/devtools/page/id`;
    const result = readAndDeletePageChallenge(url, '__challenge', controller.signal);
    await expect(result).rejects.toThrow('bootstrap timed out');
    await closed;
    expect(fake.webSockets.size).toBe(0);
    const anyFunction = expect.any(Function);
    expect(remove).toHaveBeenCalledWith('abort', anyFunction);
  });
  it('rejects an already aborted challenge without an unhandled connection error', async () => {
    const fake = await serve((_request, response) => response.end());
    const signal = AbortSignal.abort();
    const url = `ws://${fake.host}:${fake.port}/devtools/page/id`;
    const result = readAndDeletePageChallenge(url, '__challenge', signal);
    await expect(result).rejects.toThrow('bootstrap timed out');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(fake.webSockets.size).toBe(0);
  });
});
