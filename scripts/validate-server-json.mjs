#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readJson } from '#scripts/lib/files';
import { fetchJson } from '#scripts/lib/http';
const argumentValue = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';
const uRL = new URL('./lib/schemas/mcp-server-2025-12-11.schema.json', import.meta.url);
const fileURLToPathResult = fileURLToPath(uRL);
const values = [argumentValue, fileURLToPathResult];
const values2 = [values];
const BUNDLED_SCHEMAS = new Map(values2);
const serverJsonPath = process.argv[2] ?? 'server.json';
const serverJson = readJson(serverJsonPath);
const schemaUrl = serverJson.$schema;
if (typeof schemaUrl !== 'string' || schemaUrl.length === 0) {
  const message = `${serverJsonPath} must declare a non-empty $schema URL.`;
  throw new Error(message);
}
for (const [index, pkg] of (serverJson.packages ?? []).entries()) {
  if (pkg?.registryType === 'oci' && Object.hasOwn(pkg, 'registryBaseUrl')) {
    const message2 = `${serverJsonPath} package ${index + 1} is an OCI package and must not declare registryBaseUrl; use the canonical image reference in identifier instead.`;
    throw new Error(message2);
  }
}
const bundledSchemaPath = BUNDLED_SCHEMAS.get(schemaUrl);
const schema =
  bundledSchemaPath !== undefined
    ? readJson(bundledSchemaPath)
    : await (() => {
        const fetchJsonOptions = { userAgent: 'cloakbrowser-mcp-server-validator' };
        return fetchJson(schemaUrl, fetchJsonOptions);
      })();
const ajvOptions = {
  allErrors: true,
  strict: false,
};
const ajv = new Ajv(ajvOptions);
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(serverJson)) {
  const errorsTextOptions = {
    dataVar: serverJsonPath,
    separator: '\n',
  };
  const errors = ajv.errorsText(validate.errors, errorsTextOptions);
  const message3 = `Server metadata validation failed:\n${errors}`;
  throw new Error(message3);
}
const message4 = `validated ${serverJsonPath} against ${schemaUrl}\n`;
process.stderr.write(message4);
