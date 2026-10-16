#!/usr/bin/env node
import process from 'node:process';
import { validateBuiltDocsSeo } from '#scripts/lib/docs-seo';
const siteDir = process.argv[2] ?? 'site';
const siteUrl = process.env.MKDOCS_SITE_URL ?? 'https://swimmwatch.github.io/cloakbrowser-mcp/';
const errors = validateBuiltDocsSeo(siteDir, siteUrl);
if (errors.length > 0) {
  const message = `Documentation SEO validation failed with ${errors.length} issue(s):\n`;
  process.stderr.write(message);
  for (const error of errors) {
    const message2 = `- ${error}\n`;
    process.stderr.write(message2);
  }
  process.exitCode = 1;
} else {
  process.stderr.write('Documentation SEO validation passed.\n');
}
