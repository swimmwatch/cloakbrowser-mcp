#!/usr/bin/env node
import process from 'node:process';
import { loadSitemapUrls, submitIndexNow } from '#scripts/lib/indexnow';

const key = process.env.INDEXNOW_KEY;
const siteUrl = process.env.INDEXNOW_SITE_URL ?? 'https://swimmwatch.github.io/cloakbrowser-mcp/';
const siteDir = process.env.INDEXNOW_SITE_DIR;

if (!key) {
  process.stderr.write('INDEXNOW_KEY is not set; skipping IndexNow submission.\n');
} else {
  const urls = await loadSitemapUrls({ siteDir, siteUrl });
  const result = await submitIndexNow({ key, siteUrl, urls });
  process.stderr.write(`Submitted ${result.submitted} URL(s) to IndexNow with status ${result.status}.\n`);
}
