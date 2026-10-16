import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { URL } from 'node:url';
import { readText } from '#scripts/lib/files';
const values = [
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['#39', "'"],
];
const htmlEntityMap = new Map(values);
export function findHtmlFiles(siteDir) {
  const results = [];
  function visit(directory) {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      const stats = statSync(path);
      if (stats.isDirectory()) {
        visit(path);
      } else if (entry.endsWith('.html') && entry !== '404.html' && !isSearchVerificationFile(entry)) {
        results.push(path);
      }
    }
  }
  visit(siteDir);
  return results.sort();
}
export function decodeHtmlEntities(value) {
  return value.replace(/&([a-zA-Z]+|#[0-9]+);/g, (match, entity) => {
    if (entity.startsWith('#')) {
      const sliceResult = entity.slice(1);
      const parseIntResult = Number.parseInt(sliceResult, 10);
      return String.fromCodePoint(parseIntResult);
    }
    return htmlEntityMap.get(entity) ?? match;
  });
}
export function extractAttribute(html, tagName, markerAttribute, markerValue, targetAttribute) {
  const message2 = `<${escapeRegExp(tagName)}\\s+[^>]*>`;
  const tagPattern = new RegExp(message2, 'gi');
  for (const match of html.matchAll(tagPattern)) {
    const tag = match[0];
    if (readAttribute(tag, markerAttribute) === markerValue) {
      return readAttribute(tag, targetAttribute);
    }
  }
  return undefined;
}
export function extractJsonLd(html) {
  const scripts = [];
  const pattern =
    /<script\s+[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const trimResult = match[1].trim();
    const decodeHtmlEntitiesResult = decodeHtmlEntities(trimResult);
    const parsedValue = JSON.parse(decodeHtmlEntitiesResult);
    scripts.push(parsedValue);
  }
  return scripts;
}
/**
 * Validates the built MkDocs site files that search engines and social previews consume.
 */
export function validateBuiltDocsSeo(siteDir, siteUrl) {
  const errors = [];
  const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  const spreadValues = [...validateRequiredSeoFiles(siteDir, normalizedSiteUrl)];
  errors.push(...spreadValues);
  const htmlFiles = findHtmlFiles(siteDir);
  if (htmlFiles.length === 0) {
    errors.push('no HTML files found');
  }
  for (const filePath of htmlFiles) {
    const spreadValues2 = [...validateHtmlFileSeo(siteDir, filePath, normalizedSiteUrl)];
    errors.push(...spreadValues2);
  }
  return errors;
}
function validateRequiredSeoFiles(siteDir, normalizedSiteUrl) {
  return [
    ...validateLlmsFile(siteDir),
    ...validateRobotsFile(siteDir, normalizedSiteUrl),
    ...validateSitemapFile(siteDir, normalizedSiteUrl),
  ];
}
function validateLlmsFile(siteDir) {
  const joinResult = join(siteDir, 'llms.txt');
  return existsSync(joinResult) ? [] : ['missing llms.txt'];
}
function validateRobotsFile(siteDir, normalizedSiteUrl) {
  const robotsPath = join(siteDir, 'robots.txt');
  if (!existsSync(robotsPath)) return ['missing robots.txt'];
  const errors = [];
  const robots = readText(robotsPath);
  const expectedSitemap = `Sitemap: ${new URL('sitemap.xml', normalizedSiteUrl).toString()}`;
  if (!robots.includes('User-agent: *')) {
    errors.push('robots.txt does not include a global user-agent rule');
  }
  if (!robots.includes(expectedSitemap)) {
    const message3 = `robots.txt does not include ${expectedSitemap}`;
    errors.push(message3);
  }
  return errors;
}
function validateSitemapFile(siteDir, normalizedSiteUrl) {
  const sitemapPath = join(siteDir, 'sitemap.xml');
  if (!existsSync(sitemapPath)) return ['missing sitemap.xml'];
  const errors = [];
  const sitemap = readText(sitemapPath);
  if (!sitemap.includes('<urlset')) {
    errors.push('sitemap.xml does not contain a urlset');
  }
  const message4 = `<loc>${normalizedSiteUrl}`;
  if (!sitemap.includes(message4)) {
    const message5 = `sitemap.xml does not contain absolute URLs under ${normalizedSiteUrl}`;
    errors.push(message5);
  }
  return errors;
}
function validateHtmlFileSeo(siteDir, filePath, normalizedSiteUrl) {
  const label = relative(siteDir, filePath);
  const html = readText(filePath);
  const metadata = readHtmlMetadata(html);
  return [
    ...validateHtmlBasics(label, html, metadata, normalizedSiteUrl),
    ...validateSocialMetadata(label, metadata, normalizedSiteUrl),
    ...validateJsonLdSchemas(label, html),
  ];
}
function readHtmlMetadata(html) {
  return {
    canonical: extractAttribute(html, 'link', 'rel', 'canonical', 'href'),
    description: extractAttribute(html, 'meta', 'name', 'description', 'content'),
    robots: extractAttribute(html, 'meta', 'name', 'robots', 'content'),
    ogTitle: extractAttribute(html, 'meta', 'property', 'og:title', 'content'),
    ogDescription: extractAttribute(html, 'meta', 'property', 'og:description', 'content'),
    ogImage: extractAttribute(html, 'meta', 'property', 'og:image', 'content'),
    twitterCard: extractAttribute(html, 'meta', 'name', 'twitter:card', 'content'),
    twitterTitle: extractAttribute(html, 'meta', 'name', 'twitter:title', 'content'),
    twitterDescription: extractAttribute(html, 'meta', 'name', 'twitter:description', 'content'),
    twitterImage: extractAttribute(html, 'meta', 'name', 'twitter:image', 'content'),
  };
}
function validateHtmlBasics(label, html, metadata, normalizedSiteUrl) {
  const errors = [];
  const locale = readLocaleFromBuiltPath(label);
  const minimumDescriptionLength = locale ? minimumLocalizedDescriptionLength(locale) : 40;
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    const message6 = `${label}: missing title`;
    errors.push(message6);
  }
  if (!metadata.description || metadata.description.length < minimumDescriptionLength) {
    const message7 = `${label}: missing or too-short meta description`;
    errors.push(message7);
  }
  if (!metadata.canonical?.startsWith(normalizedSiteUrl)) {
    const message8 = `${label}: canonical URL is missing or not under ${normalizedSiteUrl}`;
    errors.push(message8);
  }
  if (metadata.robots !== 'index, follow') {
    const message9 = `${label}: robots meta should be "index, follow"`;
    errors.push(message9);
  }
  return errors;
}
function validateSocialMetadata(label, metadata, normalizedSiteUrl) {
  const errors = [];
  if (!metadata.ogTitle || !metadata.ogDescription || !metadata.ogImage?.startsWith(normalizedSiteUrl)) {
    const message10 = `${label}: incomplete Open Graph metadata`;
    errors.push(message10);
  }
  if (
    metadata.twitterCard !== 'summary_large_image' ||
    !metadata.twitterTitle ||
    !metadata.twitterDescription ||
    !metadata.twitterImage?.startsWith(normalizedSiteUrl)
  ) {
    const message11 = `${label}: incomplete Twitter card metadata`;
    errors.push(message11);
  }
  return errors;
}
function validateJsonLdSchemas(label, html) {
  let schemas;
  try {
    schemas = extractJsonLd(html);
  } catch (error) {
    return [`${label}: invalid JSON-LD: ${error.message}`];
  }
  return requiredSchemaTypes(label)
    .filter((type) => !schemas.some((schema) => schema['@type'] === type))
    .map((type) => `${label}: missing ${type} JSON-LD`);
}
function requiredSchemaTypes(label) {
  return label === 'index.html'
    ? ['WebSite', 'SoftwareApplication']
    : ['WebSite', 'TechArticle', 'BreadcrumbList'];
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function readAttribute(tag, attribute) {
  const message12 = `${escapeRegExp(attribute)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`;
  const pattern = new RegExp(message12, 'i');
  const match = tag.match(pattern);
  if (!match) {
    return undefined;
  }
  const computedValue = match[1] ?? match[2] ?? match[3];
  return decodeHtmlEntities(computedValue);
}
function isSearchVerificationFile(fileName) {
  return /^google[a-z0-9]+\.html$/i.test(fileName);
}
function readLocaleFromBuiltPath(label) {
  const segment = label.split('/')[0];
  const values2 = ['ru', 'be', 'uk', 'es', 'pt-BR', 'zh', 'ja', 'de', 'fr', 'hi'];
  const locales = new Set(values2);
  return locales.has(segment) ? segment : undefined;
}
function minimumLocalizedDescriptionLength(locale) {
  return locale === 'zh' || locale === 'ja' ? 12 : 20;
}
