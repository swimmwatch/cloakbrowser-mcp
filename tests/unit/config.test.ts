import { describe, expect, it } from 'vitest';
import { loadConfig, parseArgv, loadFromEnv } from '@/config/load.js';

describe('config loader', () => {
  it('applies defaults with no input', () => {
    const cfg = loadConfig({ argv: [], env: {} });
    expect(cfg.headless).toBe(true);
    expect(cfg.defaultTimeoutMs).toBe(5_000);
    expect(cfg.maxPages).toBe(10);
    expect(cfg.capabilities.allowScreenshots).toBe(true);
    expect(cfg.capabilities.allowPdf).toBe(false);
  });

  it('parses argv booleans, ints, and lists', () => {
    const args = parseArgv([
      '--no-headless',
      '--default-timeout-ms',
      '12000',
      '--max-pages=3',
      '--allowed-origins',
      'example.com,foo.test',
      '--cap-allow-pdf',
      '--no-cap-allow-screenshots',
    ]);
    expect(args.headless).toBe(false);
    expect(args.defaultTimeoutMs).toBe(12_000);
    expect(args.maxPages).toBe(3);
    expect(args.allowedOrigins).toEqual(['example.com', 'foo.test']);
    expect(args.capabilities).toEqual({ allowPdf: true, allowScreenshots: false });
  });

  it('reads env vars with prefix', () => {
    const args = loadFromEnv({
      CLOAKBROWSER_MCP_HEADLESS: 'false',
      CLOAKBROWSER_MCP_MAX_PAGES: '7',
      CLOAKBROWSER_MCP_ALLOWED_ORIGINS: 'a.com,b.com',
      CLOAKBROWSER_MCP_CAP_ALLOW_PDF: 'true',
    });
    expect(args.headless).toBe(false);
    expect(args.maxPages).toBe(7);
    expect(args.allowedOrigins).toEqual(['a.com', 'b.com']);
    expect(args.capabilities?.allowPdf).toBe(true);
  });

  it('cli overrides env (defaults < env < cli)', () => {
    const cfg = loadConfig({
      env: { CLOAKBROWSER_MCP_MAX_PAGES: '5' },
      argv: ['--max-pages', '9'],
    });
    expect(cfg.maxPages).toBe(9);
  });

  it('rejects invalid integers', () => {
    expect(() => parseArgv(['--max-pages', 'abc'])).toThrow(/integer/);
  });

  it('requires allowPersistentProfiles when userDataDir is set', () => {
    expect(() => loadConfig({ argv: ['--user-data-dir', '/tmp/profile'], env: {} })).toThrow(
      /allowPersistentProfiles/,
    );

    const cfg = loadConfig({
      argv: ['--user-data-dir', '/tmp/profile', '--cap-allow-persistent-profiles'],
      env: {},
    });
    expect(cfg.userDataDir).toBe('/tmp/profile');
    expect(cfg.capabilities.allowPersistentProfiles).toBe(true);
  });
});
