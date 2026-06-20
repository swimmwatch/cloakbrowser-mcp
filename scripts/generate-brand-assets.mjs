#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { brandRenders } from '#scripts/lib/brand-assets';
import { assertCommandAvailable, runCommand } from '#scripts/lib/command';
import { assertFileExists } from '#scripts/lib/files';

const root = process.cwd();
const brandDir = path.join(root, 'docs', 'assets', 'brand');

assertCommandAvailable('rsvg-convert', ['--version'], 'Install librsvg2-bin to generate docs brand assets.');

for (const asset of brandRenders) {
  const source = path.join(brandDir, asset.source);
  const output = path.join(brandDir, asset.output);

  assertFileExists(source, 'brand source asset');

  runCommand(
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
