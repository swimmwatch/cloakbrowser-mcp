#!/usr/bin/env node
import process from 'node:process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readJson } from './lib/files.mjs';
import { fetchJson } from './lib/http.mjs';

const serverJsonPath = process.argv[2] ?? 'server.json';
const serverJson = readJson(serverJsonPath);
const schemaUrl = serverJson.$schema;

if (typeof schemaUrl !== 'string' || schemaUrl.length === 0) {
  throw new Error(`${serverJsonPath} must declare a non-empty $schema URL.`);
}

const schema = await fetchJson(schemaUrl, {
  userAgent: 'cloakbrowser-mcp-server-validator',
});

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});
addFormats(ajv);

const validate = ajv.compile(schema);
if (!validate(serverJson)) {
  const errors = ajv.errorsText(validate.errors, {
    dataVar: serverJsonPath,
    separator: '\n',
  });
  throw new Error(`Server metadata validation failed:\n${errors}`);
}

process.stderr.write(`validated ${serverJsonPath} against ${schemaUrl}\n`);
