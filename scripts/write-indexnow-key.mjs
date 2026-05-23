#!/usr/bin/env node
import process from 'node:process';
import { writeIndexNowKeyFile } from './lib/indexnow.mjs';

const key = process.env.INDEXNOW_KEY;

if (!key) {
  process.stderr.write('INDEXNOW_KEY is not set; skipping IndexNow key file generation.\n');
} else {
  const filePath = writeIndexNowKeyFile({ key });
  process.stderr.write(`Wrote IndexNow key file to ${filePath}.\n`);
}
