import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { URL } from 'node:url';
import { readText } from '#scripts/lib/files';

const htmlEntityMap = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['#39', "'"],
]);

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
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return htmlEntityMap.get(entity) ?? match;
  });
}

export function extractAttribute(html, tagName, markerAttribute, markerValue, targetAttribute) {
  const tagPattern = new RegExp(`<${escapeRegExp(tagName)}\\s+[^>]*>`, 'gi');

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
    scripts.push(JSON.parse(decodeHtmlEntities(match[1].trim())));
  }

  return scripts;
}

/**
 * Validates the built MkDocs site files that search engines and social previews consume.
 */
export function validateBuiltDocsSeo(siteDir, siteUrl) {
  const errors = [];
  const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  errors.push(...validateRequiredSeoFiles(siteDir, normalizedSiteUrl));

  const htmlFiles = findHtmlFiles(siteDir);

  if (htmlFiles.length === 0) {
    errors.push('no HTML files found');
  }

  for (const filePath of htmlFiles) {
    errors.push(...validateHtmlFileSeo(siteDir, filePath, normalizedSiteUrl));
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
  return existsSync(join(siteDir, 'llms.txt')) ? [] : ['missing llms.txt'];
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
    errors.push(`robots.txt does not include ${expectedSitemap}`);
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

  if (!sitemap.includes(`<loc>${normalizedSiteUrl}`)) {
    errors.push(`sitemap.xml does not contain absolute URLs under ${normalizedSiteUrl}`);
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
    errors.push(`${label}: missing title`);
  }

  if (!metadata.description || metadata.description.length < minimumDescriptionLength) {
    errors.push(`${label}: missing or too-short meta description`);
  }

  if (!metadata.canonical?.startsWith(normalizedSiteUrl)) {
    errors.push(`${label}: canonical URL is missing or not under ${normalizedSiteUrl}`);
  }

  if (metadata.robots !== 'index, follow') {
    errors.push(`${label}: robots meta should be "index, follow"`);
  }

  return errors;
}

function validateSocialMetadata(label, metadata, normalizedSiteUrl) {
  const errors = [];

  if (!metadata.ogTitle || !metadata.ogDescription || !metadata.ogImage?.startsWith(normalizedSiteUrl)) {
    errors.push(`${label}: incomplete Open Graph metadata`);
  }

  if (
    metadata.twitterCard !== 'summary_large_image' ||
    !metadata.twitterTitle ||
    !metadata.twitterDescription ||
    !metadata.twitterImage?.startsWith(normalizedSiteUrl)
  ) {
    errors.push(`${label}: incomplete Twitter card metadata`);
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
  const pattern = new RegExp(`${escapeRegExp(attribute)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);

  if (!match) {
    return undefined;
  }

  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3]);
}

function isSearchVerificationFile(fileName) {
  return /^google[a-z0-9]+\.html$/i.test(fileName);
}

function readLocaleFromBuiltPath(label) {
  const segment = label.split('/')[0];
  const locales = new Set(['ru', 'be', 'uk', 'es', 'pt-BR', 'zh', 'ja', 'de', 'fr', 'hi']);
  return locales.has(segment) ? segment : undefined;
}

function minimumLocalizedDescriptionLength(locale) {
  return locale === 'zh' || locale === 'ja' ? 12 : 20;
}
