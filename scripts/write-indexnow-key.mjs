#!/usr/bin/env node
import process from 'node:process';
import { writeIndexNowKeyFile } from '#scripts/lib/indexnow';
const key = process.env.INDEXNOW_KEY;
if (!key) {
  process.stderr.write('INDEXNOW_KEY is not set; skipping IndexNow key file generation.\n');
} else {
  const writeIndexNowKeyFileOptions = { key };
  const filePath = writeIndexNowKeyFile(writeIndexNowKeyFileOptions);
  const message = `Wrote IndexNow key file to ${filePath}.\n`;
  process.stderr.write(message);
}
