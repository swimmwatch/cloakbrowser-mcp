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
  const message = `${key}.txt`;
  const filePath = join(docsDir, message);
  writeText(filePath, key);
  return filePath;
}
export function extractSitemapUrls(xml) {
  const urls = [];
  const pattern = /<loc>([^<]+)<\/loc>/g;
  for (const match of xml.matchAll(pattern)) {
    const trimResult = match[1].trim();
    urls.push(trimResult);
  }
  return urls;
}
export async function loadSitemapUrls({ siteDir, siteUrl }) {
  if (siteDir) {
    const joinResult = join(siteDir, 'sitemap.xml');
    const textResult = readText(joinResult);
    return extractSitemapUrls(textResult);
  }
  const sitemapUrl = new URL('sitemap.xml', siteUrl).toString();
  const fetchTextOptions = { userAgent: 'cloakbrowser-mcp-indexnow' };
  const fetchTextResult = await fetchText(sitemapUrl, fetchTextOptions);
  return extractSitemapUrls(fetchTextResult);
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
    const message2 = `No sitemap URLs matched ${normalizedSiteUrl}`;
    throw new Error(message2);
  }
  const propertyValue2 = 'POST';
  const options = {
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'cloakbrowser-mcp-indexnow',
  };
  const propertyValue = site.host;
  const currentKey = key;
  const message3 = `${key}.txt`;
  const toStringResult = new URL(message3, normalizedSiteUrl).toString();
  const currentUrlList = urlList;
  const stringifyOptions = {
    host: propertyValue,
    key: currentKey,
    keyLocation: toStringResult,
    urlList: currentUrlList,
  };
  const serializedValue = JSON.stringify(stringifyOptions);
  const fetchOptions = {
    method: propertyValue2,
    headers: options,
    body: serializedValue,
  };
  const response = await fetch(indexNowEndpoint, fetchOptions);
  if (!response.ok) {
    const message4 = `IndexNow submission failed: ${response.status} ${response.statusText}`;
    throw new Error(message4);
  }
  return {
    status: response.status,
    submitted: urlList.length,
  };
}
