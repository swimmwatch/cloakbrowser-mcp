import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';

export interface NpmBrowserFixture {
  url: string;
  getState: () => { uploads: string[]; failures: number; apiRequests: number };
  close: () => Promise<void>;
}

export async function startNpmBrowserFixture(): Promise<NpmBrowserFixture> {
  const uploads: string[] = [];
  let failures = 0;
  let apiRequests = 0;
  const sockets = new Set<Socket>();
  const server = createServer((request, response) => {
    switch (request.url) {
      case '/api':
        apiRequests += 1;
        response.setHeader('Content-Type', 'application/json');
        response.end('{"fixture":true}');
        break;
      case '/download':
        response.setHeader('Content-Type', 'text/plain');
        response.setHeader('Content-Disposition', 'attachment; filename="fixture-download.txt"');
        response.end('Controlled fixture download\n');
        break;
      case '/upload':
        receiveUpload(request, response, uploads);
        break;
      case '/failure':
        failures += 1;
        response.writeHead(503);
        response.end('Controlled fixture failure');
        break;
      default: {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        const page = request.url === '/frame' ? frameHtml : request.url === '/humanize' ? humanizeHtml : html;
        response.end(page);
      }
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => {
      sockets.delete(socket);
    });
  });
  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closing ??= new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
      for (const socket of sockets) socket.destroy();
      server.closeAllConnections();
    });
    return closing;
  };
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Fixture server did not bind a TCP port');
    return {
      url: `http://127.0.0.1:${address.port}`,
      getState: () => ({ uploads: [...uploads], failures, apiRequests }),
      close,
    };
  } catch (error) {
    for (const socket of sockets) socket.destroy();
    if (server.listening) await close();
    throw error;
  }
}

function receiveUpload(request: IncomingMessage, response: ServerResponse, uploads: string[]): void {
  if (request.method !== 'POST') {
    response.writeHead(405);
    response.end('POST required');
    return;
  }
  let bytes = 0;
  const chunks: Buffer[] = [];
  request.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes <= MAX_UPLOAD_BYTES) chunks.push(chunk);
  });
  request.once('end', () => {
    if (bytes > MAX_UPLOAD_BYTES) {
      response.writeHead(413);
      response.end('Fixture upload too large');
      return;
    }
    const body = Buffer.concat(chunks);
    const text = body.toString('utf8');
    uploads.push(text);
    response.end('Uploaded');
  });
  request.on('error', () => {
    response.destroy();
  });
}

export const MAX_UPLOAD_BYTES = 1024 * 1024;
const pageUrl = new URL('../fixtures/npm-browser/index.html', import.meta.url);
const html = readFileSync(pageUrl, 'utf8');
const frameUrl = new URL('../fixtures/npm-browser/frame.html', import.meta.url);
const frameHtml = readFileSync(frameUrl, 'utf8');
const humanizeUrl = new URL('../fixtures/npm-browser/humanize.html', import.meta.url);
const humanizeHtml = readFileSync(humanizeUrl, 'utf8');
