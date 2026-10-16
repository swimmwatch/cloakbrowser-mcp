import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const argumentValue = new URL('../../scripts/lib/docs-seo.mjs', import.meta.url).href;
const seo = (await import(argumentValue)) as unknown as DocsSeoModule;
const tempRoots: string[] = [];
afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-docs-seo-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
describe('docs SEO helpers', () => {
  it('extracts attributes, decodes HTML entities, and reads JSON-LD scripts', () => {
    const html = [
      '<meta name="description" content="CloakBrowser &amp; MCP">',
      '<script type="application/ld+json">{&quot;@type&quot;:&quot;WebSite&quot;}</script>',
    ].join('\n');
    const decodeHtmlEntitiesResult = seo.decodeHtmlEntities('A &amp; B &#39;quoted&#39;');
    expect(decodeHtmlEntitiesResult).toBe("A & B 'quoted'");
    const extractAttributeResult = seo.extractAttribute(html, 'meta', 'name', 'description', 'content');
    expect(extractAttributeResult).toBe('CloakBrowser & MCP');
    const extractJsonLdResult = seo.extractJsonLd(html);
    const receiverActual = extractJsonLdResult;
    const values: {
      '@type': string;
    }[] = [{ '@type': 'WebSite' }];
    expect(receiverActual).toEqual(values);
  });
  it('finds HTML files while skipping 404 and verification files', () => {
    const root = createTempRoot();
    const joinedPath2 = path.join(root, 'nested');
    mkdirSync(joinedPath2);
    const joinedPath3 = path.join(root, 'index.html');
    writeFileSync(joinedPath3, '<html></html>');
    const joinedPath4 = path.join(root, '404.html');
    writeFileSync(joinedPath4, '<html></html>');
    const joinedPath5 = path.join(root, 'google123.html');
    writeFileSync(joinedPath5, 'verification');
    const joinedPath6 = path.join(root, 'nested', 'page.html');
    writeFileSync(joinedPath6, '<html></html>');
    const mappedValues = seo.findHtmlFiles(root).map((filePath) => path.relative(root, filePath));
    const receiver2Actual = mappedValues;
    const values2: string[] = ['index.html', path.join('nested', 'page.html')];
    expect(receiver2Actual).toEqual(values2);
  });
  it('validates generated SEO files and metadata', () => {
    const root = createTempRoot();
    const siteUrl = 'https://example.com/docs/';
    const joinedPath7 = path.join(root, 'llms.txt');
    writeFileSync(joinedPath7, 'llms');
    const joinedPath8 = path.join(root, 'robots.txt');
    const message = `User-agent: *\nSitemap: ${siteUrl}sitemap.xml\n`;
    writeFileSync(joinedPath8, message);
    const joinedPath9 = path.join(root, 'sitemap.xml');
    const message2 = `<urlset><url><loc>${siteUrl}</loc></url></urlset>`;
    writeFileSync(joinedPath9, message2);
    const joinedPath10 = path.join(root, 'index.html');
    const values3: string[] = ['WebSite', 'SoftwareApplication'];
    const htmlResult = createHtml(siteUrl, values3);
    writeFileSync(joinedPath10, htmlResult);
    const joinedPath11 = path.join(root, 'guide');
    mkdirSync(joinedPath11);
    const joinedPath12 = path.join(root, 'guide', 'index.html');
    const message3 = `${siteUrl}guide/`;
    const values4: string[] = ['WebSite', 'TechArticle', 'BreadcrumbList'];
    const htmlResult2 = createHtml(message3, values4);
    writeFileSync(joinedPath12, htmlResult2);
    const validateBuiltDocsSeoResult = seo.validateBuiltDocsSeo(root, siteUrl);
    const receiver3Actual = validateBuiltDocsSeoResult;
    const values5: never[] = [];
    expect(receiver3Actual).toEqual(values5);
    const joinedPath13 = path.join(root, 'llms.txt');
    rmSync(joinedPath13);
    const validateBuiltDocsSeoResult2 = seo.validateBuiltDocsSeo(root, siteUrl);
    expect(validateBuiltDocsSeoResult2).toContain('missing llms.txt');
  });
});
function createHtml(pageUrl: string, schemaTypes: string[]): string {
  const schemas = schemaTypes
    .map((type) => {
      const stringifyOptions = { '@type': type } as const;
      const templateValue = JSON.stringify(stringifyOptions);
      return `<script type="application/ld+json">${templateValue}</script>`;
    })
    .join('\n');
  const uRL = new URL('../fixtures/docs-seo/page.html', import.meta.url);
  return readFileSync(uRL, 'utf8').replaceAll('{{pageUrl}}', pageUrl).replace('{{schemas}}', schemas);
}
