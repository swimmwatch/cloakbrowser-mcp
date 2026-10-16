import { existsSync, readFileSync, writeFileSync } from 'node:fs';
export function readJson(filePath) {
  const textResult = readText(filePath);
  return JSON.parse(textResult);
}
export function writeJson(filePath, data) {
  const message = `${JSON.stringify(data, null, 2)}\n`;
  writeText(filePath, message);
}
export function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}
export function writeText(filePath, value) {
  writeFileSync(filePath, value);
}
export function assertFileExists(filePath, label = 'file') {
  if (!existsSync(filePath)) {
    const message2 = `missing ${label}: ${filePath}`;
    throw new Error(message2);
  }
}
