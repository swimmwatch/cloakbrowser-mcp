import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
const uRL = new URL('../fixtures/tls/localhost-cert.pem', import.meta.url);
export const tlsCertPath = fileURLToPath(uRL);
const uRL2 = new URL('../fixtures/tls/localhost-key.pem', import.meta.url);
export const tlsKeyPath = fileURLToPath(uRL2);
export const tlsCertificate = readFileSync(tlsCertPath);
export const tlsConfig = {
  cert: tlsCertPath,
  key: tlsKeyPath,
} as const;
export async function fetchWithTestTls(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const isRequest = input instanceof Request;
  const request = isRequest ? input : undefined;
  const argumentValue = isRequest ? input.url : input;
  const url = new URL(argumentValue);
  const headers = mergeHeaders(request?.headers, init?.headers);
  const computedValue = init?.body ?? request;
  const body = await requestBodyBytes(computedValue);
  return new Promise<Response>((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const sendOptions = {
      method: init?.method ?? request?.method ?? 'GET',
      headers,
      ca: url.protocol === 'https:' ? tlsCertificate : undefined,
    } as const;
    const req = send(url, sendOptions, (res) => {
      const toWebResult = Readable.toWeb(res) as ReadableStream;
      const responseOptions = {
        status: res.statusCode ?? 0,
        statusText: res.statusMessage,
        headers: responseHeaders(res.headers),
      } as const;
      const response = new Response(toWebResult, responseOptions);
      resolve(response);
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
function mergeHeaders(
  requestHeaders: Headers | undefined,
  initHeaders: ConstructorParameters<typeof Headers>[0] | undefined,
): Record<string, string> {
  const headers = new Headers(requestHeaders);
  for (const [name, value] of new Headers(initHeaders)) headers.set(name, value);
  return Object.fromEntries(headers);
}
async function requestBodyBytes(
  body: RequestInit['body'] | Request | null | undefined,
): Promise<Buffer | undefined> {
  if (!body) return undefined;
  if (body instanceof Request) {
    const buffer = await body.arrayBuffer();
    return Buffer.from(buffer);
  }
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof URLSearchParams) {
    const toStringResult = body.toString();
    return Buffer.from(toStringResult);
  }
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const message = `Unsupported test fetch body type: ${Object.prototype.toString.call(body)}`;
  throw new TypeError(message);
}
function responseHeaders(headers: NodeJS.Dict<string | string[]>): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) result.append(name, entry);
    } else {
      result.set(name, value);
    }
  }
  return result;
}
