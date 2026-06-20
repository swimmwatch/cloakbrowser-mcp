import { fileURLToPath } from 'node:url';

export const tlsCertPath = fileURLToPath(new URL('../fixtures/tls/localhost-cert.pem', import.meta.url));
export const tlsKeyPath = fileURLToPath(new URL('../fixtures/tls/localhost-key.pem', import.meta.url));
export const tlsConfig = {
  cert: tlsCertPath,
  key: tlsKeyPath,
} as const;

export async function withDisabledTlsVerification<T>(fn: () => Promise<T>): Promise<T> {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  }
}
