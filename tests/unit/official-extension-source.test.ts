import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { prepareOfficialExtension } from '@tests/helpers/browser-extension.js';
import type { FreeBrowserRuntime } from '@tests/helpers/browser-test-runtime.js';

const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  const removal = { recursive: true, force: true };
  for (const root of roots.splice(0)) await rm(root, removal);
});

async function runtime(): Promise<FreeBrowserRuntime> {
  const temporary = tmpdir();
  const prefix = path.join(temporary, 'official-extension-source-');
  const root = await mkdtemp(prefix);
  roots.push(root);
  return { root, env: {}, ownChild: vi.fn(), ownCleanup: vi.fn(), dispose: async () => undefined };
}

it('cancels an HTTP failure without extracting or saving its response', async () => {
  let cancelled = false;
  const streamOptions = {
    cancel: () => {
      cancelled = true;
    },
  };
  const body = new ReadableStream<Uint8Array>(streamOptions);
  const responseOptions = { status: 403 };
  const response = new Response(body, responseOptions);
  const request = vi.fn(async () => response);
  vi.stubGlobal('fetch', request);
  const owner = await runtime();
  const preparing = prepareOfficialExtension(owner);
  await expect(preparing).rejects.toThrow('HTTP 403');
  expect(cancelled).toBe(true);
  expect(owner.ownChild).not.toHaveBeenCalled();
  const entries = await readdir(owner.root);
  const expected = ['playwright'];
  expect(entries).toEqual(expected);
});

it('rejects changed source bytes before writing an archive or spawning tar', async () => {
  const response = new Response('Untrusted archive bytes');
  const request = vi.fn(async () => response);
  vi.stubGlobal('fetch', request);
  const owner = await runtime();
  const preparing = prepareOfficialExtension(owner);
  await expect(preparing).rejects.toThrow('checksum mismatch');
  expect(response.body?.locked).toBe(false);
  expect(owner.ownChild).not.toHaveBeenCalled();
  const entries = await readdir(owner.root);
  const expected = ['playwright'];
  expect(entries).toEqual(expected);
});

it('bounds streamed archive data and cancels the reader before extraction', async () => {
  let cancelled = false;
  let chunks = 0;
  const chunkSize = 1024 * 1024;
  const chunk = new Uint8Array(chunkSize);
  const streamOptions = {
    pull: (controller: ReadableStreamDefaultController<Uint8Array>) => {
      if (chunks++ < 100) controller.enqueue(chunk);
      else controller.close();
    },
    cancel: () => {
      cancelled = true;
    },
  };
  const body = new ReadableStream<Uint8Array>(streamOptions);
  const response = new Response(body);
  const request = vi.fn(async () => response);
  vi.stubGlobal('fetch', request);
  const owner = await runtime();
  const preparing = prepareOfficialExtension(owner);
  await expect(preparing).rejects.toThrow('exceeds size limit');
  expect(cancelled).toBe(true);
  expect(body.locked).toBe(false);
  expect(owner.ownChild).not.toHaveBeenCalled();
  const entries = await readdir(owner.root);
  const expected = ['playwright'];
  expect(entries).toEqual(expected);
});
