#!/usr/bin/env node
import process from 'node:process';
import { validateBuiltDocsSeo } from './lib/docs-seo.mjs';

const siteDir = process.argv[2] ?? 'site';
const siteUrl = process.env.MKDOCS_SITE_URL ?? 'https://swimmwatch.github.io/cloakbrowser-mcp/';
const errors = validateBuiltDocsSeo(siteDir, siteUrl);

if (errors.length > 0) {
  process.stderr.write(`Documentation SEO validation failed with ${errors.length} issue(s):\n`);

  for (const error of errors) {
    process.stderr.write(`- ${error}\n`);
  }

  process.exitCode = 1;
} else {
  process.stderr.write('Documentation SEO validation passed.\n');
}
