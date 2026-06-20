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

export function validateBuiltDocsSeo(siteDir, siteUrl) {
  const errors = [];
  const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  const llmsPath = join(siteDir, 'llms.txt');
  const robotsPath = join(siteDir, 'robots.txt');
  const sitemapPath = join(siteDir, 'sitemap.xml');

  if (!existsSync(llmsPath)) {
    errors.push('missing llms.txt');
  }

  if (!existsSync(robotsPath)) {
    errors.push('missing robots.txt');
  } else {
    const robots = readText(robotsPath);
    const expectedSitemap = `Sitemap: ${new URL('sitemap.xml', normalizedSiteUrl).toString()}`;

    if (!robots.includes('User-agent: *')) {
      errors.push('robots.txt does not include a global user-agent rule');
    }

    if (!robots.includes(expectedSitemap)) {
      errors.push(`robots.txt does not include ${expectedSitemap}`);
    }
  }

  if (!existsSync(sitemapPath)) {
    errors.push('missing sitemap.xml');
  } else {
    const sitemap = readText(sitemapPath);

    if (!sitemap.includes('<urlset')) {
      errors.push('sitemap.xml does not contain a urlset');
    }

    if (!sitemap.includes(`<loc>${normalizedSiteUrl}`)) {
      errors.push(`sitemap.xml does not contain absolute URLs under ${normalizedSiteUrl}`);
    }
  }

  const htmlFiles = findHtmlFiles(siteDir);

  if (htmlFiles.length === 0) {
    errors.push('no HTML files found');
  }

  for (const filePath of htmlFiles) {
    const label = relative(siteDir, filePath);
    const html = readText(filePath);
    const canonical = extractAttribute(html, 'link', 'rel', 'canonical', 'href');
    const description = extractAttribute(html, 'meta', 'name', 'description', 'content');
    const robots = extractAttribute(html, 'meta', 'name', 'robots', 'content');
    const ogTitle = extractAttribute(html, 'meta', 'property', 'og:title', 'content');
    const ogDescription = extractAttribute(html, 'meta', 'property', 'og:description', 'content');
    const ogImage = extractAttribute(html, 'meta', 'property', 'og:image', 'content');
    const twitterCard = extractAttribute(html, 'meta', 'name', 'twitter:card', 'content');
    const twitterTitle = extractAttribute(html, 'meta', 'name', 'twitter:title', 'content');
    const twitterDescription = extractAttribute(html, 'meta', 'name', 'twitter:description', 'content');
    const twitterImage = extractAttribute(html, 'meta', 'name', 'twitter:image', 'content');

    if (!/<title>[^<]+<\/title>/i.test(html)) {
      errors.push(`${label}: missing title`);
    }

    if (!description || description.length < 40) {
      errors.push(`${label}: missing or too-short meta description`);
    }

    if (!canonical?.startsWith(normalizedSiteUrl)) {
      errors.push(`${label}: canonical URL is missing or not under ${normalizedSiteUrl}`);
    }

    if (robots !== 'index, follow') {
      errors.push(`${label}: robots meta should be "index, follow"`);
    }

    if (!ogTitle || !ogDescription || !ogImage?.startsWith(normalizedSiteUrl)) {
      errors.push(`${label}: incomplete Open Graph metadata`);
    }

    if (
      twitterCard !== 'summary_large_image' ||
      !twitterTitle ||
      !twitterDescription ||
      !twitterImage?.startsWith(normalizedSiteUrl)
    ) {
      errors.push(`${label}: incomplete Twitter card metadata`);
    }

    let schemas;
    try {
      schemas = extractJsonLd(html);
    } catch (error) {
      errors.push(`${label}: invalid JSON-LD: ${error.message}`);
      continue;
    }

    if (!schemas.some((schema) => schema['@type'] === 'WebSite')) {
      errors.push(`${label}: missing WebSite JSON-LD`);
    }

    if (label === 'index.html') {
      if (!schemas.some((schema) => schema['@type'] === 'SoftwareApplication')) {
        errors.push(`${label}: missing SoftwareApplication JSON-LD`);
      }
    } else {
      if (!schemas.some((schema) => schema['@type'] === 'TechArticle')) {
        errors.push(`${label}: missing TechArticle JSON-LD`);
      }

      if (!schemas.some((schema) => schema['@type'] === 'BreadcrumbList')) {
        errors.push(`${label}: missing BreadcrumbList JSON-LD`);
      }
    }
  }

  return errors;
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
