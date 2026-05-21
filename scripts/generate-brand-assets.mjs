#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const brandDir = path.join(root, 'docs', 'assets', 'brand');

const renders = [
  { source: 'logo.svg', output: 'favicon-32.png', width: 32, height: 32 },
  { source: 'logo.svg', output: 'apple-touch-icon.png', width: 180, height: 180 },
  { source: 'logo.svg', output: 'favicon-192.png', width: 192, height: 192 },
  { source: 'logo.svg', output: 'favicon-512.png', width: 512, height: 512 },
  { source: 'social-card.svg', output: 'social-card.png', width: 1200, height: 630 },
];

assertRsvgConvert();

for (const asset of renders) {
  const source = path.join(brandDir, asset.source);
  const output = path.join(brandDir, asset.output);

  if (!existsSync(source)) {
    throw new Error(`missing brand source asset: ${source}`);
  }

  execFileSync(
    'rsvg-convert',
    [
      '--format',
      'png',
      '--keep-aspect-ratio',
      '--width',
      String(asset.width),
      '--height',
      String(asset.height),
      '--output',
      output,
      source,
    ],
    { stdio: 'inherit' },
  );
}

function assertRsvgConvert() {
  try {
    execFileSync('rsvg-convert', ['--version'], { stdio: 'ignore' });
  } catch {
    throw new Error('rsvg-convert is required to generate docs brand assets. Install librsvg2-bin.');
  }
}
