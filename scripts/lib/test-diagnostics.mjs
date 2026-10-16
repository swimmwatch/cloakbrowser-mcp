import { crc32 } from 'node:zlib';

export const TEXT_LIMIT = 128 * 1024;
export const PNG_LIMIT = 2 * 1024 * 1024;
export const ATTACHMENT_LIMIT = 6 * 1024 * 1024;
const screenshots = new WeakMap();
const secretKey = /(?:authorization|cookie|password|passwd|secret|token|key)$/i;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function reject() {
  throw new Error('Test evidence: unsafe or oversized diagnostic');
}

function validateImageHeader(data) {
  if (data.length !== 13) reject();
  const width = data.readUInt32BE(0);
  const height = data.readUInt32BE(4);
  const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
  const color = data[9];
  if (
    !width ||
    !height ||
    width * height > 4 * 1024 * 1024 ||
    !depths[color]?.includes(data[8]) ||
    data[10] !== 0 ||
    data[11] !== 0 ||
    data[12] > 1
  )
    reject();
  return color;
}

function validateOptionalChunk(type, data, color, paletteSize) {
  const length = data.length;
  if (type === 'PLTE') {
    if (length === 0 || length > 768 || length % 3 || [0, 4].includes(color)) reject();
    return;
  }
  if (type === 'tRNS') {
    validateTransparency(length, color, paletteSize);
    return;
  }
  const lengths = { sRGB: 1, gAMA: 4, pHYs: 9 };
  if (length !== lengths[type]) reject();
  if (type === 'sRGB' && data[0] > 3) reject();
  if (type === 'gAMA' && data.readUInt32BE(0) === 0) reject();
  if (type === 'pHYs' && data[8] > 1) reject();
}

function validateTransparency(length, color, paletteSize) {
  const valid =
    (color === 0 && length === 2) ||
    (color === 2 && length === 6) ||
    (color === 3 && length > 0 && length <= paletteSize);
  if (!valid) reject();
}

function readPngChunk(bytes, offset) {
  const length = bytes.readUInt32BE(offset);
  const typeOffset = offset + 4;
  const dataOffset = offset + 8;
  const checksumOffset = dataOffset + length;
  const end = checksumOffset + 4;
  const type = bytes.toString('latin1', typeOffset, dataOffset);
  if (end > bytes.length || !['IHDR', 'IDAT', 'IEND', 'PLTE', 'tRNS', 'sRGB', 'gAMA', 'pHYs'].includes(type))
    reject();
  const crcInput = bytes.subarray(typeOffset, checksumOffset);
  const checksum = crc32(crcInput);
  if (checksum !== bytes.readUInt32BE(checksumOffset)) reject();
  const data = bytes.subarray(dataOffset, checksumOffset);
  const raw = bytes.subarray(offset, end);
  return { type, data, raw, end };
}

function acceptPngChunk(state, chunk) {
  const { type, data } = chunk;
  if (!state.seen.size && type !== 'IHDR') reject();
  if (type !== 'IDAT' && state.seen.has(type)) reject();
  state.seen.add(type);
  switch (type) {
    case 'IHDR':
      state.color = validateImageHeader(data);
      break;
    case 'IDAT':
      if (state.color === 3 && !state.paletteSize) reject();
      state.imageData = true;
      break;
    case 'IEND':
      if (data.length !== 0) reject();
      state.ended = true;
      break;
    default:
      if (state.imageData) reject();
      validateOptionalChunk(type, data, state.color, state.paletteSize);
      if (type === 'PLTE') state.paletteSize = data.length / 3;
  }
}

/** Validate PNG structure and CRCs; discard optional color/resolution metadata. */
export function validateControlledPng(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length > PNG_LIMIT ||
    bytes.length < 45 ||
    !bytes.subarray(0, 8).equals(pngSignature)
  )
    reject();
  let offset = 8;
  const seen = new Set();
  const state = { imageData: false, ended: false, color: undefined, paletteSize: 0, seen };
  const chunks = [pngSignature];
  while (offset + 12 <= bytes.length) {
    const chunk = readPngChunk(bytes, offset);
    acceptPngChunk(state, chunk);
    if (['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'].includes(chunk.type)) chunks.push(chunk.raw);
    offset = chunk.end;
    if (state.ended) break;
  }
  if (!state.imageData || !state.ended || offset !== bytes.length) reject();
  return Buffer.concat(chunks);
}

/** Register bytes captured from an owned local fixture, never an arbitrary image path. */
export function registerControlledScreenshot(bytes, fixtureUrl) {
  let url;
  try {
    url = new URL(fixtureUrl);
  } catch {
    reject();
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    reject();
  const safe = validateControlledPng(bytes);
  const receipt = Object.freeze({ provenance: 'controlled-local' });
  screenshots.set(receipt, safe);
  return receipt;
}

/** Decode bounded inline fixture evidence; never follow a runner-supplied file path. */
export function screenshotAnnotation(message) {
  if (typeof message !== 'string' || message.length > PNG_LIMIT * 2) reject();
  let record;
  try {
    record = JSON.parse(message);
  } catch {
    reject();
  }
  if (
    !record ||
    Object.keys(record).sort().join(',') !== 'fixtureUrl,png' ||
    typeof record.png !== 'string' ||
    typeof record.fixtureUrl !== 'string'
  )
    reject();
  const bytes = Buffer.from(record.png, 'base64');
  if (bytes.toString('base64') !== record.png) reject();
  return registerControlledScreenshot(bytes, record.fixtureUrl);
}

function redactText(text, secrets) {
  let safe = text;
  for (const secret of secrets) {
    if (typeof secret !== 'string' || !secret || secret.length > TEXT_LIMIT) reject();
    for (const form of [secret, encodeURIComponent(secret), encodeURI(secret)]) {
      safe = safe.replaceAll(form, '[REDACTED]');
    }
  }
  safe = safe
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[REDACTED PRIVATE KEY]',
    )
    .replace(
      /\b(?:authorization|proxy-authorization|set-cookie|cookie)\s*:\s*[^\r\n]+/gi,
      '[REDACTED HEADER]',
    )
    .replace(/\b(?:Bearer|Basic)\s+[^\s"'<>]+/gi, '[REDACTED AUTH]')
    .replace(
      /(["']?(?:password|passwd|secret|token|access[-_]?token|api[-_]?key|license[-_]?key)["']?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;&<>]+)/gi,
      '$1[REDACTED]',
    )
    .replace(/\b(?:https?|socks5h?):\/\/[^\s/@]+@/gi, '[REDACTED PROXY]@')
    .replace(
      /\b(?:wss?:\/\/[^\s"'<>]+|https?:\/\/[^\s"'<>]*\/(?:cdp|devtools)[^\s"'<>]*)/gi,
      '[REDACTED CDP]',
    )
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return safe;
}

/** Redact bounded text/metadata or return a copy of registered local PNG bytes. */
export function sanitizeDiagnostic(input, secrets = []) {
  const limits = { fields: 256, depth: 8, bytes: TEXT_LIMIT, environment: false };
  return sanitizeValue(input, secrets, limits);
}

/** Sanitize trusted launch history with the same key/value policy and bounded traversal. */
export function sanitizeHistory(input, secrets = []) {
  const limits = { fields: 100000, depth: 32, bytes: 16 * 1024 * 1024, environment: true };
  return sanitizeValue(input, secrets, limits);
}

function sanitizeValue(input, secrets, limits) {
  if (!Array.isArray(secrets) || secrets.length > 256) reject();
  if (input && typeof input === 'object' && screenshots.has(input)) {
    return Buffer.from(screenshots.get(input));
  }
  const seen = new WeakSet();
  let fields = 0;
  function visit(value, depth) {
    if (depth > limits.depth || ++fields > limits.fields) reject();
    if (typeof value === 'string') {
      if (Buffer.byteLength(value) > TEXT_LIMIT) reject();
      return redactText(value, secrets);
    }
    if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))
      return value;
    if (!value || typeof value !== 'object' || Buffer.isBuffer(value) || seen.has(value)) reject();
    seen.add(value);
    if (Array.isArray(value)) return value.map((item) => visit(item, depth + 1));
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) reject();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.values(descriptors).some((descriptor) => !Object.hasOwn(descriptor, 'value'))) reject();
    const entries = Object.entries(value);
    const result = Object.create(null);
    for (const [key, item] of entries) {
      if ((!limits.environment && /^(?:env|environment|processEnv)$/i.test(key)) || key === '__proto__')
        reject();
      const safeKey = redactText(key, secrets);
      if (Object.hasOwn(result, safeKey)) reject();
      result[safeKey] = secretKey.test(key) ? '[REDACTED]' : visit(item, depth + 1);
    }
    return result;
  }
  const value = visit(input, 0);
  const output = typeof value === 'string' ? value : JSON.stringify(value);
  if (Buffer.byteLength(output) > limits.bytes) reject();
  return output;
}
