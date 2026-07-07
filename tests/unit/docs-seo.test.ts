import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

interface DocsSeoModule {
  decodeHtmlEntities(value: string): string;
  extractAttribute(
    html: string,
    tagName: string,
    markerAttribute: string,
    markerValue: string,
    targetAttribute: string,
  ): string | undefined;
  extractJsonLd(html: string): unknown[];
  findHtmlFiles(siteDir: string): string[];
  validateBuiltDocsSeo(siteDir: string, siteUrl: string): string[];
}

const seo = (await import(
  new URL('../../scripts/lib/docs-seo.mjs', import.meta.url).href
)) as unknown as DocsSeoModule;
const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-docs-seo-'));
  tempRoots.push(root);
  return root;
}

describe('docs SEO helpers', () => {
  it('extracts attributes, decodes HTML entities, and reads JSON-LD scripts', () => {
    const html = [
      '<meta name="description" content="CloakBrowser &amp; MCP">',
      '<script type="application/ld+json">{&quot;@type&quot;:&quot;WebSite&quot;}</script>',
    ].join('\n');

    expect(seo.decodeHtmlEntities('A &amp; B &#39;quoted&#39;')).toBe("A & B 'quoted'");
    expect(seo.extractAttribute(html, 'meta', 'name', 'description', 'content')).toBe('CloakBrowser & MCP');
    expect(seo.extractJsonLd(html)).toEqual([{ '@type': 'WebSite' }]);
  });

  it('finds HTML files while skipping 404 and verification files', () => {
    const root = createTempRoot();
    mkdirSync(path.join(root, 'nested'));
    writeFileSync(path.join(root, 'index.html'), '<html></html>');
    writeFileSync(path.join(root, '404.html'), '<html></html>');
    writeFileSync(path.join(root, 'google123.html'), 'verification');
    writeFileSync(path.join(root, 'nested', 'page.html'), '<html></html>');

    expect(seo.findHtmlFiles(root).map((filePath) => path.relative(root, filePath))).toEqual([
      'index.html',
      path.join('nested', 'page.html'),
    ]);
  });

  it('validates generated SEO files and metadata', () => {
    const root = createTempRoot();
    const siteUrl = 'https://example.com/docs/';
    writeFileSync(path.join(root, 'llms.txt'), 'llms');
    writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nSitemap: ${siteUrl}sitemap.xml\n`);
    writeFileSync(path.join(root, 'sitemap.xml'), `<urlset><url><loc>${siteUrl}</loc></url></urlset>`);
    writeFileSync(path.join(root, 'index.html'), createHtml(siteUrl, ['WebSite', 'SoftwareApplication']));
    mkdirSync(path.join(root, 'guide'));
    writeFileSync(
      path.join(root, 'guide', 'index.html'),
      createHtml(`${siteUrl}guide/`, ['WebSite', 'TechArticle', 'BreadcrumbList']),
    );

    expect(seo.validateBuiltDocsSeo(root, siteUrl)).toEqual([]);
    rmSync(path.join(root, 'llms.txt'));
    expect(seo.validateBuiltDocsSeo(root, siteUrl)).toContain('missing llms.txt');
  });
});

function createHtml(pageUrl: string, schemaTypes: string[]): string {
  const schemas = schemaTypes
    .map((type) => `<script type="application/ld+json">${JSON.stringify({ '@type': type })}</script>`)
    .join('\n');
  return `<!doctype html>
<html>
  <head>
    <title>CloakBrowser MCP</title>
    <meta name="description" content="CloakBrowser MCP bridge documentation for automation workflows.">
    <link rel="canonical" href="${pageUrl}">
    <meta name="robots" content="index, follow">
    <meta property="og:title" content="CloakBrowser MCP">
    <meta property="og:description" content="CloakBrowser MCP bridge documentation for automation workflows.">
    <meta property="og:image" content="${pageUrl}assets/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="CloakBrowser MCP">
    <meta name="twitter:description" content="CloakBrowser MCP bridge documentation for automation workflows.">
    <meta name="twitter:image" content="${pageUrl}assets/og.png">
    ${schemas}
  </head>
  <body></body>
</html>`;
}
