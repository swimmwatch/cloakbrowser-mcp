import { CloakMcpError } from '@/errors/index.js';
import type { ResolvedConfig } from '@/config/schema.js';

/**
 * Origin policy:
 *   - If `allowedOrigins` is set and non-empty, URL origin MUST match one entry (suffix match on host).
 *   - `blockedOrigins` always denies (overrides allowed).
 *   - Patterns are host suffixes, e.g. "example.com" matches "a.example.com" and "example.com".
 *   - "*" in allowedOrigins matches anything (but blockedOrigins still applies).
 *   - Only http(s) and file URLs are accepted; file URLs require allowFileAccess at the tool level.
 */
export function assertOriginAllowed(rawUrl: string, config: ResolvedConfig): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new CloakMcpError('INVALID_INPUT', `invalid URL: ${rawUrl}`);
  }
  if (!['http:', 'https:', 'file:', 'about:'].includes(url.protocol)) {
    throw new CloakMcpError('ORIGIN_DENIED', `unsupported URL scheme: ${url.protocol}`, { url: rawUrl });
  }
  if (url.protocol === 'file:' && !config.capabilities.allowFileAccess) {
    throw new CloakMcpError('CAPABILITY_DENIED', 'file: navigation requires allowFileAccess', {
      missing: ['allowFileAccess'],
      url: rawUrl,
    });
  }
  const host = url.hostname.toLowerCase();
  const blocked = (config.blockedOrigins ?? []).map((s) => s.toLowerCase());
  if (blocked.some((p) => matchHost(host, p))) {
    throw new CloakMcpError('ORIGIN_DENIED', `origin blocked: ${host}`, { url: rawUrl });
  }
  const allowed = config.allowedOrigins?.map((s) => s.toLowerCase());
  if (allowed && allowed.length > 0) {
    const ok = allowed.some((p) => p === '*' || matchHost(host, p));
    if (!ok) throw new CloakMcpError('ORIGIN_DENIED', `origin not allowed: ${host}`, { url: rawUrl });
  }
  return url;
}

function matchHost(host: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === host) return true;
  return host.endsWith('.' + pattern);
}
