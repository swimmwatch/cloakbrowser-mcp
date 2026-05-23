import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

export function writeJson(filePath, data) {
  writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

export function writeText(filePath, value) {
  writeFileSync(filePath, value);
}

export function assertFileExists(filePath, label = 'file') {
  if (!existsSync(filePath)) {
    throw new Error(`missing ${label}: ${filePath}`);
  }
}
