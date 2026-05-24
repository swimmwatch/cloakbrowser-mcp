import { Command, InvalidArgumentError, Option } from 'commander';
import {
  bridgeTransportModes,
  defaultStreamableHttpOptions,
  httpSessionBackends,
  type BridgeTransportMode,
  type CliOptions,
  type HttpSessionBackend,
} from '../http/options.js';

export const cliDescription = 'Playwright MCP bridge backed by CloakBrowser.';

interface CommanderCliOptions {
  transport: BridgeTransportMode;
  httpHost: string;
  httpPort: number;
  httpEndpoint: string;
  httpAuthToken?: string;
  httpSessionBackend: HttpSessionBackend;
  httpSessionIdleTtlMs: number;
  httpSessionMax: number;
}

type CliOptionValue = string | number;

interface CliOptionDefinition {
  name: keyof CommanderCliOptions;
  flags: string;
  description: string;
  env: string;
  group: string;
  defaultValue?: CliOptionValue;
  choices?: readonly string[];
  parser?: (value: string) => CliOptionValue;
}

export const cliOptionDefinitions: readonly CliOptionDefinition[] = [
  {
    name: 'transport',
    flags: '--transport <mode>',
    description: 'MCP transport exposed by the bridge.',
    env: 'CLOAK_PLAYWRIGHT_MCP_TRANSPORT',
    group: 'Transport',
    defaultValue: 'stdio',
    choices: bridgeTransportModes,
  },
  {
    name: 'httpHost',
    flags: '--http-host <host>',
    description: 'Streamable HTTP bind host.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_HOST',
    group: 'Streamable HTTP',
    defaultValue: defaultStreamableHttpOptions.host,
    parser: parseNonEmptyString('HTTP host must not be empty'),
  },
  {
    name: 'httpPort',
    flags: '--http-port <port>',
    description: 'Streamable HTTP bind port. Use 0 for an ephemeral port in tests.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_PORT',
    group: 'Streamable HTTP',
    defaultValue: defaultStreamableHttpOptions.port,
    parser: parseIntegerInRange('HTTP port', 0, 65_535),
  },
  {
    name: 'httpEndpoint',
    flags: '--http-endpoint <path>',
    description: 'Streamable HTTP endpoint path.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT',
    group: 'Streamable HTTP',
    defaultValue: defaultStreamableHttpOptions.endpoint,
    parser: parseHttpEndpoint,
  },
  {
    name: 'httpAuthToken',
    flags: '--http-auth-token <token>',
    description: 'Optional Bearer token required on Streamable HTTP requests.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN',
    group: 'Streamable HTTP',
    parser: parseNonEmptyString('HTTP auth token must not be empty'),
  },
  {
    name: 'httpSessionBackend',
    flags: '--http-session-backend <backend>',
    description: 'Session metadata backend. Only memory is implemented in this release.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND',
    group: 'Streamable HTTP',
    defaultValue: defaultStreamableHttpOptions.sessionBackend,
    choices: httpSessionBackends,
  },
  {
    name: 'httpSessionIdleTtlMs',
    flags: '--http-session-idle-ttl-ms <ms>',
    description: 'Idle TTL for Streamable HTTP sessions.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS',
    group: 'Streamable HTTP',
    defaultValue: defaultStreamableHttpOptions.sessionIdleTtlMs,
    parser: parsePositiveInteger('HTTP session idle TTL'),
  },
  {
    name: 'httpSessionMax',
    flags: '--http-session-max <count>',
    description: 'Maximum active Streamable HTTP sessions in one process.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX',
    group: 'Streamable HTTP',
    defaultValue: defaultStreamableHttpOptions.sessionMax,
    parser: parsePositiveInteger('HTTP session max'),
  },
];

export function createCliCommand(version: string): Command {
  const command = new Command()
    .name('cloakbrowser-mcp')
    .description(cliDescription)
    .version(version)
    .showHelpAfterError()
    .showSuggestionAfterError()
    .allowExcessArguments(false);

  for (const definition of cliOptionDefinitions) {
    command.addOption(createCommanderOption(definition));
  }

  return command;
}

export function parseCliOptions(args: readonly string[]): CliOptions {
  const command = createCliCommand('0.0.0');
  command.exitOverride();
  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(args, { from: 'user' });
  return readCliOptions(command);
}

export function readCliOptions(command: Command): CliOptions {
  return toCliOptions(command.opts<CommanderCliOptions>());
}

export function renderCliReferenceMarkdown(version: string): string {
  const command = createCliCommand(version);
  return `${renderCliReferenceFrontMatter()}# CLI Reference

This page is generated from the Commander.js CLI definition during MkDocs builds. Update the CLI definition in source code instead of editing this page by hand.

## Usage

\`\`\`text
${command.helpInformation().trimEnd()}
\`\`\`

## Options

${renderOptionsTable()}
`;
}

function createCommanderOption(definition: CliOptionDefinition): Option {
  const option = new Option(definition.flags, definition.description)
    .env(definition.env)
    .helpGroup(definition.group);

  const parser = definition.parser;
  if (parser) {
    option.argParser((value: string) => parser(value));
  }
  if (definition.choices) {
    option.choices(definition.choices);
  }
  if (definition.defaultValue !== undefined) {
    option.default(definition.defaultValue, String(definition.defaultValue));
  }

  return option;
}

function toCliOptions(options: CommanderCliOptions): CliOptions {
  return {
    transport: options.transport,
    http: {
      host: options.httpHost,
      port: options.httpPort,
      endpoint: options.httpEndpoint,
      authToken: optionalString(options.httpAuthToken),
      sessionBackend: options.httpSessionBackend,
      sessionIdleTtlMs: options.httpSessionIdleTtlMs,
      sessionMax: options.httpSessionMax,
      bodyLimitBytes: defaultStreamableHttpOptions.bodyLimitBytes,
    },
  };
}

function renderCliReferenceFrontMatter(): string {
  return `---
description: Generated CLI reference for cloakbrowser-mcp.
icon: material/console-line
tags:
  - Configuration
  - User Guide
---

`;
}

function renderOptionsTable(): string {
  const rows = cliOptionDefinitions.map((definition) =>
    [
      code(definition.flags),
      code(definition.env),
      definition.defaultValue === undefined ? 'unset' : code(String(definition.defaultValue)),
      definition.choices ? definition.choices.map((choice) => code(choice)).join(', ') : '',
      definition.description,
    ].join(' | '),
  );

  return [
    ['Option', 'Environment', 'Default', 'Values', 'Description'].join(' | '),
    ['---', '---', '---', '---', '---'].join(' | '),
    ...rows,
  ]
    .map((line) => `| ${line} |`)
    .join('\n');
}

function parseIntegerInRange(label: string, min: number, max: number): (value: string) => number {
  return (value: string): number => {
    const parsed = parseInteger(label, value);
    if (parsed < min || parsed > max) {
      throw new InvalidArgumentError(`${label} must be an integer between ${min} and ${max}`);
    }
    return parsed;
  };
}

function parsePositiveInteger(label: string): (value: string) => number {
  return (value: string): number => {
    const parsed = parseInteger(label, value);
    if (parsed <= 0) {
      throw new InvalidArgumentError(`${label} must be greater than 0`);
    }
    return parsed;
  };
}

function parseInteger(label: string, value: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw new InvalidArgumentError(`${label} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError(`${label} must be a safe integer`);
  }
  return parsed;
}

function parseHttpEndpoint(value: string): string {
  if (!value.startsWith('/') || value.includes('?') || value.includes('#')) {
    throw new InvalidArgumentError('HTTP endpoint must be an absolute path such as "/mcp"');
  }
  if (value.length > 1 && value.endsWith('/')) {
    throw new InvalidArgumentError('HTTP endpoint must not end with "/"');
  }
  return value;
}

function parseNonEmptyString(message: string): (value: string) => string {
  return (value: string): string => {
    if (!value.trim()) throw new InvalidArgumentError(message);
    return value;
  };
}

function optionalString(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}

function code(value: string): string {
  return `\`${value.replaceAll('`', '\\`')}\``;
}
