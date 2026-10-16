#!/usr/bin/env node
import process from 'node:process';
import { readJson } from '#scripts/lib/files';
import { checkMcpRegistry, formatReport, parseArgs } from '#scripts/lib/mcp-registry';
const sliceResult = process.argv.slice(2);
const args = parseArgs(sliceResult);
const packageJson = readJson('package.json');
const serverJson = readJson('server.json');
const checkMcpRegistryOptions = { args, packageJson, serverJson };
const report = await checkMcpRegistry(checkMcpRegistryOptions);
if (args.flags.has('json')) {
  const message = `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(message);
} else {
  const formatReportResult = formatReport(report);
  process.stdout.write(formatReportResult);
}
process.exitCode = report.errors.length > 0 ? 1 : 0;
