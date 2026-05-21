#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command, InvalidArgumentError, Option } from 'commander';
import { CloakMcpError, isCloakMcpError } from './errors/index.js';
import type { CliArgs } from './config/load.js';
import { loadConfig } from './config/load.js';
import { capabilityFlagsSchema, type CapabilityKey } from './config/schema.js';
import { createLogger } from './logging/logger.js';
import { createServer } from './server.js';

// Read version from the package.json that ships with the build.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
  description?: string;
};

const CAPABILITY_KEYS = Object.keys(capabilityFlagsSchema.shape) as CapabilityKey[];

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

function parsePositiveInt(name: string) {
  return (raw: string): number => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new InvalidArgumentError(`${name} must be a positive integer (got "${raw}")`);
    }
    return n;
  };
}

function parseCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildProgram(): Command {
  const program = new Command();
  program
    .name(pkg.name)
    .description(pkg.description ?? 'MCP server for CloakBrowser')
    .version(pkg.version, '-V, --version', 'print version and exit')
    .helpOption('-h, --help', 'show help and exit')
    .showHelpAfterError()
    .configureHelp({ sortOptions: true })
    .addHelpText(
      'after',
      [
        '',
        'Environment variables:',
        '  CLOAKBROWSER_MCP_<OPTION>          same options in SCREAMING_SNAKE_CASE',
        '  CLOAKBROWSER_MCP_CAP_<FLAG>        capability flags (true/false)',
        '',
        'Capability flags (all default off except allow-screenshots):',
        ...CAPABILITY_KEYS.map((k) => `  --cap-${camelToKebab(k)} / --no-cap-${camelToKebab(k)}`),
      ].join('\n'),
    );

  program
    .option('--headless', 'run the browser in headless mode (default: true)')
    .option('--no-headless', 'run the browser with a visible window')
    .option('-o, --output-dir <path>', 'directory for screenshots and other artifacts')
    .option(
      '--default-timeout-ms <n>',
      'default per-action timeout in milliseconds',
      parsePositiveInt('--default-timeout-ms'),
    )
    .option(
      '--navigation-timeout-ms <n>',
      'navigation timeout in milliseconds',
      parsePositiveInt('--navigation-timeout-ms'),
    )
    .option('--max-pages <n>', 'maximum concurrent pages', parsePositiveInt('--max-pages'))
    .option('--max-contexts <n>', 'maximum browser contexts', parsePositiveInt('--max-contexts'))
    .option(
      '--allowed-origins <list>',
      'comma-separated host suffixes the browser may navigate to ("*" allows all)',
      parseCsv,
    )
    .option('--blocked-origins <list>', 'comma-separated host suffixes to deny', parseCsv)
    .option('--user-data-dir <path>', 'persistent user data directory (Cloak support required)')
    .option('--browser-executable-path <path>', 'override the bundled CloakBrowser executable')
    .addOption(
      new Option('-l, --log-level <level>', 'logging verbosity').choices([
        'silent',
        'error',
        'warn',
        'info',
        'debug',
      ]),
    );

  // Capability flags: one positive + one negative for each known key. Commander
  // would auto-add `--no-cap-foo` for `--cap-foo`, but adding both explicitly
  // makes them show up in `--help` and lets us document them individually.
  for (const key of CAPABILITY_KEYS) {
    const kebab = camelToKebab(key);
    program
      .option(`--cap-${kebab}`, `enable capability: ${key}`)
      .option(`--no-cap-${kebab}`, `disable capability: ${key}`);
  }

  return program;
}

function commanderOptsToCliArgs(opts: Record<string, unknown>): CliArgs {
  const args: CliArgs = {};
  const caps: Record<string, boolean> = {};

  const passthrough = [
    'headless',
    'outputDir',
    'defaultTimeoutMs',
    'navigationTimeoutMs',
    'maxPages',
    'maxContexts',
    'allowedOrigins',
    'blockedOrigins',
    'userDataDir',
    'browserExecutablePath',
    'logLevel',
  ] as const;

  for (const k of passthrough) {
    if (opts[k] !== undefined) (args as Record<string, unknown>)[k] = opts[k];
  }

  for (const key of CAPABILITY_KEYS) {
    // Commander stores `--cap-allow-pdf` and its `--no-` variant under the same
    // camelCased option key (capAllowPdf), as true/false.
    const optKey = `cap${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    const v = opts[optKey];
    if (typeof v === 'boolean') caps[key] = v;
  }
  if (Object.keys(caps).length > 0) args.capabilities = caps;
  return args;
}

async function main(): Promise<void> {
  const program = buildProgram();

  let parsed: Command;
  try {
    parsed = await program.parseAsync(process.argv);
  } catch (e) {
    // Commander already wrote a useful message; surface as a config error.
    process.stderr.write(`config error: ${(e as Error).message}\n`);
    process.exit(2);
  }

  let config;
  try {
    const cliArgs = commanderOptsToCliArgs(parsed.opts());
    config = loadConfig({ cliArgs });
  } catch (e) {
    const message = isCloakMcpError(e) ? e.message : (e as Error).message;
    process.stderr.write(`config error: ${message}\n`);
    process.exit(2);
  }

  const logger = createLogger(config.logLevel);
  const { start, dispose } = createServer({ config, logger });

  let shuttingDown = false;
  const shutdown = async (signal: string, code: number) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutdown requested', { signal });
    try {
      await dispose();
    } catch (e) {
      logger.error('dispose failed', { error: (e as Error).message });
    }
    process.exit(code);
  };
  process.on('SIGINT', () => void shutdown('SIGINT', 130));
  process.on('SIGTERM', () => void shutdown('SIGTERM', 143));
  process.on('uncaughtException', (e) => {
    logger.error('uncaughtException', { error: e.message, stack: e.stack });
    void shutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { reason: String(reason) });
  });

  try {
    await start();
  } catch (e) {
    logger.error('failed to start server', { error: (e as Error).message });
    process.exit(1);
  }
}

void main().catch((e: unknown) => {
  const message = e instanceof CloakMcpError ? e.message : (e as Error).message;
  process.stderr.write(`fatal: ${message}\n`);
  process.exit(1);
});
