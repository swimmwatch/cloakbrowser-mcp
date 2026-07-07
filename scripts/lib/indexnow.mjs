import { join } from 'node:path';
import { URL } from 'node:url';
import { readText, writeText } from '#scripts/lib/files';
import { fetchText } from '#scripts/lib/http';

const indexNowEndpoint = 'https://api.indexnow.org/indexnow';
const keyPattern = /^[0-9a-fA-F]{8,128}$/;

export function assertIndexNowKey(key) {
  if (!keyPattern.test(key)) {
    throw new Error('INDEXNOW_KEY must contain 8 to 128 hexadecimal characters');
  }
}

export function writeIndexNowKeyFile({ docsDir = 'docs', key }) {
  assertIndexNowKey(key);
  const filePath = join(docsDir, `${key}.txt`);
  writeText(filePath, key);
  return filePath;
}

export function extractSitemapUrls(xml) {
  const urls = [];
  const pattern = /<loc>([^<]+)<\/loc>/g;

  for (const match of xml.matchAll(pattern)) {
    urls.push(match[1].trim());
  }

  return urls;
}

export async function loadSitemapUrls({ siteDir, siteUrl }) {
  if (siteDir) {
    return extractSitemapUrls(readText(join(siteDir, 'sitemap.xml')));
  }

  const sitemapUrl = new URL('sitemap.xml', siteUrl).toString();
  return extractSitemapUrls(await fetchText(sitemapUrl, { userAgent: 'cloakbrowser-mcp-indexnow' }));
}

/**
 * Submits same-site sitemap URLs to IndexNow and reports how many URLs were accepted.
 */
export async function submitIndexNow({ key, siteUrl, urls }) {
  assertIndexNowKey(key);
  const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  const site = new URL(normalizedSiteUrl);
  const urlList = urls.filter((url) => {
    const parsed = new URL(url);
    return parsed.host === site.host && parsed.pathname.startsWith(site.pathname);
  });

  if (urlList.length === 0) {
    throw new Error(`No sitemap URLs matched ${normalizedSiteUrl}`);
  }

  const response = await fetch(indexNowEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'cloakbrowser-mcp-indexnow',
    },
    body: JSON.stringify({
      host: site.host,
      key,
      keyLocation: new URL(`${key}.txt`, normalizedSiteUrl).toString(),
      urlList,
    }),
  });

  if (!response.ok) {
    throw new Error(`IndexNow submission failed: ${response.status} ${response.statusText}`);
  }

  return {
    status: response.status,
    submitted: urlList.length,
  };
}
