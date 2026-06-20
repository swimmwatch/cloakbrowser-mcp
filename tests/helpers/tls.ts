import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

export const tlsCertPath = fileURLToPath(new URL('../fixtures/tls/localhost-cert.pem', import.meta.url));
export const tlsKeyPath = fileURLToPath(new URL('../fixtures/tls/localhost-key.pem', import.meta.url));
const tlsCertificate = readFileSync(tlsCertPath);

export const tlsConfig = {
  cert: tlsCertPath,
  key: tlsKeyPath,
} as const;

export async function fetchWithTestTls(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const isRequest = input instanceof Request;
  const request = isRequest ? input : undefined;
  const url = new URL(isRequest ? input.url : input);
  const headers = mergeHeaders(request?.headers, init?.headers);
  const body = await requestBodyBytes(init?.body ?? request);

  return new Promise<Response>((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = send(
      url,
      {
        method: init?.method ?? request?.method ?? 'GET',
        headers,
        ca: url.protocol === 'https:' ? tlsCertificate : undefined,
      },
      (res) => {
        resolve(
          new Response(Readable.toWeb(res) as ReadableStream, {
            status: res.statusCode ?? 0,
            statusText: res.statusMessage,
            headers: responseHeaders(res.headers),
          }),
        );
      },
    );
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
  if (body instanceof Request) return Buffer.from(await body.arrayBuffer());
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof URLSearchParams) return Buffer.from(body.toString());
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  throw new TypeError(`Unsupported test fetch body type: ${Object.prototype.toString.call(body)}`);
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
