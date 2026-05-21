import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface WebManifest {
  name: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
}

describe('documentation branding assets', () => {
  const root = process.cwd();
  const brandDir = path.join(root, 'docs', 'assets', 'brand');

  it('keeps all MkDocs brand references backed by files', () => {
    const requiredAssets = [
      'logo.svg',
      'favicon.svg',
      'logo-wordmark.svg',
      'mask-icon.svg',
      'social-card.svg',
      'favicon-32.png',
      'favicon-192.png',
      'favicon-512.png',
      'apple-touch-icon.png',
      'social-card.png',
    ];

    for (const asset of requiredAssets) {
      expect(existsSync(path.join(brandDir, asset)), `${asset} should exist`).toBe(true);
    }
  });

  it('wires the documentation head and web manifest to generated icons', () => {
    const mkdocs = readFileSync(path.join(root, 'mkdocs.yml'), 'utf8');
    const headOverride = readFileSync(path.join(root, 'overrides', 'main.html'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(path.join(root, 'docs', 'site.webmanifest'), 'utf8'),
    ) as WebManifest;

    expect(mkdocs).toContain('custom_dir: overrides');
    expect(mkdocs).toContain('logo: assets/brand/logo.svg');
    expect(mkdocs).toContain('favicon: assets/brand/favicon.svg');
    expect(headOverride).toContain('apple-touch-icon.png');
    expect(headOverride).toContain('site.webmanifest');
    expect(headOverride).toContain('mask-icon.svg');
    expect(headOverride).toContain('social-card.png');
    expect(manifest.name).toBe('CloakBrowser MCP');
    expect(manifest.theme_color).toBe('#0f766e');
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: 'assets/brand/favicon-192.png',
          sizes: '192x192',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: 'assets/brand/favicon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        }),
      ]),
    );
  });

  it('keeps docs assets reproducible through npm scripts and CI', () => {
    const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const ci = readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
    const docsRelease = readFileSync(path.join(root, '.github', 'workflows', 'docs-release.yml'), 'utf8');

    expect(packageJson.scripts?.['docs:assets']).toBe('node scripts/generate-brand-assets.mjs');
    expect(ci).toContain('npm run docs:assets');
    expect(ci).toContain('npm run docs:build');
    expect(docsRelease).toContain('npm run docs:assets');
  });
});
