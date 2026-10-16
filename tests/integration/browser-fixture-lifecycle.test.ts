import { once } from 'node:events';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, startNpmBrowserFixture } from '@tests/e2e/npm-browser-fixture.js';
import { createFreeBrowserRuntime } from '@tests/helpers/browser-test-runtime.js';

describe('local npm browser fixture lifecycle', () => {
  it('rejects unsupported and oversized uploads without recording them', async () => {
    const fixture = await startNpmBrowserFixture();
    try {
      const url = `${fixture.url}/upload`;
      const unsupported = await fetch(url);
      expect(unsupported.status).toBe(405);
      const oversizedLength = MAX_UPLOAD_BYTES + 1;
      const body = 'x'.repeat(oversizedLength);
      const request = { method: 'POST', body };
      const oversized = await fetch(url, request);
      expect(oversized.status).toBe(413);
      const state = fixture.getState();
      expect(state.uploads).toEqual([]);
    } finally {
      await fixture.close();
    }
  });

  it('releases an acquired server and root when subsequent startup fails', async () => {
    const temporaryDirectory = tmpdir();
    const prefix = path.join(temporaryDirectory, 'cloak-fixture-rollback-');
    const root = await mkdtemp(prefix);
    const options = { root, freeExecutable: process.execPath };
    const runtime = await createFreeBrowserRuntime(options);
    try {
      const fixture = await startNpmBrowserFixture();
      runtime.ownCleanup(fixture.close);
      const failStartup = async () => {
        try {
          throw new Error('Synthetic failure after server acquisition');
        } finally {
          await runtime.dispose();
        }
      };
      const startup = failStartup();
      await expect(startup).rejects.toThrow('failure after server acquisition');
      const checkingRoot = access(root);
      const missingRoot = { code: 'ENOENT' };
      await expect(checkingRoot).rejects.toMatchObject(missingRoot);
      const reconnecting = fetch(fixture.url);
      await expect(reconnecting).rejects.toThrow('fetch failed');
    } finally {
      await runtime.dispose();
      const removal = { recursive: true, force: true };
      await rm(root, removal);
    }
  });

  it('serves existing pages, download bytes and observes uploaded content', async () => {
    const fixture = await startNpmBrowserFixture();
    try {
      const page = await fetch(fixture.url);
      const contentType = page.headers.get('content-type');
      expect(contentType).toBe('text/html; charset=utf-8');
      const html = await page.text();
      expect(html).toContain('Release marker');
      expect(html).toContain('id="download"');
      const downloadUrl = `${fixture.url}/download`;
      const download = await fetch(downloadUrl);
      expect(download.headers.get('content-disposition')).toContain('fixture-download.txt');
      const downloadBody = await download.text();
      expect(downloadBody).toBe('Controlled fixture download\n');
      const uploadUrl = `${fixture.url}/upload`;
      const request = { method: 'POST', body: 'Controlled fixture upload' };
      const upload = await fetch(uploadUrl, request);
      expect(upload.status).toBe(200);
      const state = fixture.getState();
      expect(state.uploads).toEqual(['Controlled fixture upload']);
      state.uploads.push('Mutation outside the fixture');
      const freshState = fixture.getState();
      expect(freshState.uploads).toEqual(['Controlled fixture upload']);
    } finally {
      await fixture.close();
    }
  });

  const htmlRoutes = [
    ['/frame', ['Frame value']],
    ['/humanize', ['🌍 World', 'Éclair']],
  ] as const;
  it.each(htmlRoutes)('serves %s with explicit UTF-8 decoding', async (route, markers) => {
    const fixture = await startNpmBrowserFixture();
    try {
      const url = `${fixture.url}${route}`;
      const response = await fetch(url);
      expect(response.status).toBe(200);
      const contentType = response.headers.get('content-type');
      expect(contentType).toBe('text/html; charset=utf-8');
      const html = await response.text();
      for (const marker of markers) expect(html).toContain(marker);
    } finally {
      await fixture.close();
    }
  });

  it('reports controlled failure and serves a healthy page afterwards', async () => {
    const fixture = await startNpmBrowserFixture();
    try {
      const failureUrl = `${fixture.url}/failure`;
      const failure = await fetch(failureUrl);
      expect(failure.status).toBe(503);
      const healthy = await fetch(fixture.url);
      expect(healthy.status).toBe(200);
      const state = fixture.getState();
      expect(state.failures).toBe(1);
    } finally {
      await fixture.close();
    }
  });

  it('closes idle and active sockets, rejects reconnection and supports repeated close', async () => {
    const fixture = await startNpmBrowserFixture();
    const url = new URL(fixture.url);
    const port = Number(url.port);
    const options = { host: url.hostname, port };
    const socket = createConnection(options);
    try {
      await once(socket, 'connect');
      const partialRequest = 'GET / HTTP/1.1\r\nHost: fixture\r\n';
      socket.write(partialRequest);
      const socketErrors: Error[] = [];
      socket.on('error', (error) => {
        socketErrors.push(error);
      });
      const socketClosed = new Promise<void>((resolve) => {
        socket.once('close', resolve);
      });
      const closing = fixture.close();
      expect(fixture.close()).toBe(closing);
      await closing;
      await socketClosed;
      for (const error of socketErrors) expect(error).toHaveProperty('code', 'ECONNRESET');
      const reconnect = createConnection(options);
      const [error] = await once(reconnect, 'error');
      expect(error).toHaveProperty('code', 'ECONNREFUSED');
      reconnect.destroy();
    } finally {
      socket.destroy();
      await fixture.close();
    }
  });
});
