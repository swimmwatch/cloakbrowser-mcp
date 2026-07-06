#!/usr/bin/env node
import process from 'node:process';
import { readJson } from '#scripts/lib/files';
import { checkMcpRegistry, formatReport, parseArgs } from '#scripts/lib/mcp-registry';

const args = parseArgs(process.argv.slice(2));
const packageJson = readJson('package.json');
const serverJson = readJson('server.json');
const report = await checkMcpRegistry({ args, packageJson, serverJson });

if (args.flags.has('json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(formatReport(report));
}

process.exitCode = report.errors.length > 0 ? 1 : 0;
