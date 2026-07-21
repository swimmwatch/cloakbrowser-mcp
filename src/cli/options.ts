import path from 'node:path';
import { Command, InvalidArgumentError, Option } from 'commander';
import { type HumanPreset, humanPresets } from '#src/bridge/config';
import {
  BRIDGE_TRANSPORT_STDIO,
  type BridgeTransportMode,
  bridgeTransportModes,
  type CliOptions,
  defaultBridgeOptions,
  defaultStreamableHttpOptions,
  HEALTHZ_PATH,
  HTTP_PROTOCOL_HTTP,
  type HttpProtocol,
  httpProtocols,
  type HttpSessionBackend,
  httpSessionBackends,
  HTTP_SESSION_BACKEND_REDIS,
  READYZ_PATH,
  type StreamableHttpArtifactOptions,
  type StreamableHttpMetricsOptions,
  type StreamableHttpPeerOptions,
  type StreamableHttpRedisOptions,
  type StreamableHttpTlsOptions,
} from '#src/http/options';
import {
  defaultLoggingOptions,
  type LogFormat,
  logFormats,
} from '#src/logging/options';

export const cliDescription = 'Playwright MCP bridge backed by CloakBrowser.';

interface CommanderCliOptions {
  transport: BridgeTransportMode;
  geoipProxyMatch: boolean;
  humanize: boolean;
  humanPreset: HumanPreset;
  httpProtocol: HttpProtocol;
  httpHost: string;
  httpPort: number;
  httpEndpoint: string;
  httpAuthToken?: string;
  httpsCert?: string;
  httpsKey?: string;
  httpsPfx?: string;
  httpsPassphrase?: string;
  httpSessionBackend: HttpSessionBackend;
  httpSessionIdleTtlMs: number;
  httpSessionMax: number;
  httpSessionDrainTimeoutMs: number;
  httpSessionInstanceId?: string;
  httpSessionOwnerName?: string;
  httpRedisUrl?: string;
  httpRedisKeyPrefix?: string;
  httpRedisConnectTimeoutMs: number;
  httpRedisOperationTimeoutMs: number;
  httpRedisCaFile?: string;
  httpRedisCertFile?: string;
  httpRedisKeyFile?: string;
  httpPeerHost: string;
  httpPeerPort: number;
  httpPeerAdvertiseHost?: string;
  httpPeerRoutingToken?: string;
  metrics: boolean;
  metricsHost: string;
  metricsPort: number;
  metricsEndpoint: string;
  metricsAuthToken?: string;
  httpArtifactsRoot?: string;
  httpProfilesRoot?: string;
  httpExtensionsRoot?: string;
  httpArtifactMaxFiles: number;
  httpArtifactRetentionMs: number;
  httpArtifactCleanupIntervalMs: number;
  logFormat: LogFormat;
}

interface DoctorCliOptions {
  json?: boolean;
}

export const probeKinds = ['health', 'ready'] as const;
export type ProbeKind = (typeof probeKinds)[number];

export interface ProbeCliOptions {
  kind: ProbeKind;
  timeoutMs: number;
}

interface CreateCliCommandOptions {
  doctorAction?: (options: DoctorCliOptions) => Promise<void> | void;
  probeAction?: (options: ProbeCliOptions) => Promise<void> | void;
}

type CliOptionValue = string | number | boolean;

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
    defaultValue: BRIDGE_TRANSPORT_STDIO,
    choices: bridgeTransportModes,
  },
  {
    name: 'geoipProxyMatch',
    flags: '--geoip-proxy-match',
    description: 'Match CloakBrowser timezone and locale to the configured proxy GeoIP.',
    env: 'CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH',
    group: 'Bridge',
    defaultValue: defaultBridgeOptions.geoipProxyMatch,
  },
  {
    name: 'humanize',
    flags: '--humanize',
    description: 'Enable CloakBrowser human-like mouse, keyboard, and scroll behavior.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HUMANIZE',
    group: 'Bridge',
    defaultValue: defaultBridgeOptions.humanize,
  },
  {
    name: 'humanPreset',
    flags: '--human-preset <preset>',
    description: 'CloakBrowser human behavior preset. Used only when humanize is enabled.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET',
    group: 'Bridge',
    defaultValue: defaultBridgeOptions.humanPreset,
    choices: humanPresets,
  },
  {
    name: 'httpProtocol',
    flags: '--http-protocol <protocol>',
    description: 'Streamable HTTP listener protocol.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL',
    group: 'Streamable HTTP',
    defaultValue: defaultStreamableHttpOptions.protocol,
    choices: httpProtocols,
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
    description: 'Streamable HTTP endpoint path. Reserved probe paths: /healthz, /readyz.',
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
    name: 'httpsCert',
    flags: '--https-cert <path>',
    description: 'TLS certificate PEM file for HTTPS Streamable HTTP.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT',
    group: 'Streamable HTTP',
    parser: parseNonEmptyString('HTTPS certificate path must not be empty'),
  },
  {
    name: 'httpsKey',
    flags: '--https-key <path>',
    description: 'TLS private key PEM file for HTTPS Streamable HTTP.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY',
    group: 'Streamable HTTP',
    parser: parseNonEmptyString('HTTPS private key path must not be empty'),
  },
  {
    name: 'httpsPfx',
    flags: '--https-pfx <path>',
    description: 'TLS PFX/PKCS12 file for HTTPS Streamable HTTP.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX',
    group: 'Streamable HTTP',
    parser: parseNonEmptyString('HTTPS PFX path must not be empty'),
  },
  {
    name: 'httpsPassphrase',
    flags: '--https-passphrase <value>',
    description: 'Passphrase for an encrypted HTTPS key or PFX.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE',
    group: 'Streamable HTTP',
    parser: parseNonEmptyString('HTTPS passphrase must not be empty'),
  },
  {
    name: 'httpSessionBackend',
    flags: '--http-session-backend <backend>',
    description: 'Session metadata backend.',
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
  {
    name: 'httpSessionDrainTimeoutMs',
    flags: '--http-session-drain-timeout-ms <ms>',
    description: 'Graceful drain timeout for owned Streamable HTTP sessions.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_DRAIN_TIMEOUT_MS',
    group: 'Streamable HTTP Sessions',
    defaultValue: defaultStreamableHttpOptions.sessionDrainTimeoutMs,
    parser: parseIntegerInRange('HTTP session drain timeout', 0, 600_000),
  },
  {
    name: 'httpSessionInstanceId',
    flags: '--http-session-instance-id <id>',
    description: 'Unique owner instance identifier required by the Redis session backend.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_INSTANCE_ID',
    group: 'Streamable HTTP Sessions',
    parser: parseNonEmptyString('HTTP session instance ID must not be empty'),
  },
  {
    name: 'httpSessionOwnerName',
    flags: '--http-session-owner-name <name>',
    description: 'Human-readable owner name required by the Redis session backend.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_OWNER_NAME',
    group: 'Streamable HTTP Sessions',
    parser: parseNonEmptyString('HTTP session owner name must not be empty'),
  },
  {
    name: 'httpRedisUrl',
    flags: '--http-redis-url <url>',
    description: 'Redis or Valkey connection URL. Prefer the environment variable for credentials.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_REDIS_URL',
    group: 'Redis Sessions',
    parser: parseRedisUrl,
  },
  {
    name: 'httpRedisKeyPrefix',
    flags: '--http-redis-key-prefix <prefix>',
    description: 'Release-unique Redis key prefix.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_REDIS_KEY_PREFIX',
    group: 'Redis Sessions',
    parser: parseNonEmptyString('HTTP Redis key prefix must not be empty'),
  },
  {
    name: 'httpRedisConnectTimeoutMs',
    flags: '--http-redis-connect-timeout-ms <ms>',
    description: 'Redis connection timeout.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_REDIS_CONNECT_TIMEOUT_MS',
    group: 'Redis Sessions',
    defaultValue: defaultStreamableHttpOptions.redis.connectTimeoutMs,
    parser: parseIntegerInRange('HTTP Redis connection timeout', 100, 60_000),
  },
  {
    name: 'httpRedisOperationTimeoutMs',
    flags: '--http-redis-operation-timeout-ms <ms>',
    description: 'Redis command timeout.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_REDIS_OPERATION_TIMEOUT_MS',
    group: 'Redis Sessions',
    defaultValue: defaultStreamableHttpOptions.redis.operationTimeoutMs,
    parser: parseIntegerInRange('HTTP Redis operation timeout', 100, 30_000),
  },
  {
    name: 'httpRedisCaFile',
    flags: '--http-redis-ca-file <path>',
    description: 'Redis TLS CA file path.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_REDIS_CA_FILE',
    group: 'Redis Sessions',
    parser: parseNonEmptyString('HTTP Redis CA file path must not be empty'),
  },
  {
    name: 'httpRedisCertFile',
    flags: '--http-redis-cert-file <path>',
    description: 'Redis TLS client certificate file path.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_REDIS_CERT_FILE',
    group: 'Redis Sessions',
    parser: parseNonEmptyString('HTTP Redis certificate file path must not be empty'),
  },
  {
    name: 'httpRedisKeyFile',
    flags: '--http-redis-key-file <path>',
    description: 'Redis TLS client private key file path.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_REDIS_KEY_FILE',
    group: 'Redis Sessions',
    parser: parseNonEmptyString('HTTP Redis key file path must not be empty'),
  },
  {
    name: 'httpPeerHost',
    flags: '--http-peer-host <host>',
    description: 'Internal peer-routing bind host.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_PEER_HOST',
    group: 'Peer Routing',
    defaultValue: defaultStreamableHttpOptions.peer.host,
    parser: parseNonEmptyString('HTTP peer host must not be empty'),
  },
  {
    name: 'httpPeerPort',
    flags: '--http-peer-port <port>',
    description: 'Internal peer-routing port.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_PEER_PORT',
    group: 'Peer Routing',
    defaultValue: defaultStreamableHttpOptions.peer.port,
    parser: parseIntegerInRange('HTTP peer port', 1, 65_535),
  },
  {
    name: 'httpPeerAdvertiseHost',
    flags: '--http-peer-advertise-host <host>',
    description: 'Pod address advertised to other session owners.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_PEER_ADVERTISE_HOST',
    group: 'Peer Routing',
    parser: parseNonEmptyString('HTTP peer advertise host must not be empty'),
  },
  {
    name: 'httpPeerRoutingToken',
    flags: '--http-peer-routing-token <token>',
    description: 'Internal routing token. Prefer the environment variable for credentials.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_PEER_ROUTING_TOKEN',
    group: 'Peer Routing',
    parser: parseNonEmptyString('HTTP peer routing token must not be empty'),
  },
  {
    name: 'metrics',
    flags: '--metrics',
    description: 'Enable the native Prometheus listener.',
    env: 'CLOAK_PLAYWRIGHT_MCP_METRICS',
    group: 'Metrics',
    defaultValue: defaultStreamableHttpOptions.metrics.enabled,
  },
  {
    name: 'metricsHost',
    flags: '--metrics-host <host>',
    description: 'Prometheus listener bind host.',
    env: 'CLOAK_PLAYWRIGHT_MCP_METRICS_HOST',
    group: 'Metrics',
    defaultValue: defaultStreamableHttpOptions.metrics.host,
    parser: parseNonEmptyString('Metrics host must not be empty'),
  },
  {
    name: 'metricsPort',
    flags: '--metrics-port <port>',
    description: 'Prometheus listener port. Use 0 for an ephemeral port in tests.',
    env: 'CLOAK_PLAYWRIGHT_MCP_METRICS_PORT',
    group: 'Metrics',
    defaultValue: defaultStreamableHttpOptions.metrics.port,
    parser: parseIntegerInRange('Metrics port', 0, 65_535),
  },
  {
    name: 'metricsEndpoint',
    flags: '--metrics-endpoint <path>',
    description: 'Prometheus exposition endpoint path.',
    env: 'CLOAK_PLAYWRIGHT_MCP_METRICS_ENDPOINT',
    group: 'Metrics',
    defaultValue: defaultStreamableHttpOptions.metrics.endpoint,
    parser: parseEndpoint('Metrics endpoint'),
  },
  {
    name: 'metricsAuthToken',
    flags: '--metrics-auth-token <token>',
    description: 'Metrics bearer token. Prefer the environment variable for credentials.',
    env: 'CLOAK_PLAYWRIGHT_MCP_METRICS_AUTH_TOKEN',
    group: 'Metrics',
    parser: parseNonEmptyString('Metrics auth token must not be empty'),
  },
  {
    name: 'httpArtifactsRoot',
    flags: '--http-artifacts-root <path>',
    description: 'Root for private Streamable HTTP session artifact directories.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_ARTIFACTS_ROOT',
    group: 'HTTP Filesystem',
    parser: parseAbsolutePath('HTTP artifacts root'),
  },
  {
    name: 'httpProfilesRoot',
    flags: '--http-profiles-root <path>',
    description: 'Allowed root for Streamable HTTP persistent profiles.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_PROFILES_ROOT',
    group: 'HTTP Filesystem',
    parser: parseAbsolutePath('HTTP profiles root'),
  },
  {
    name: 'httpExtensionsRoot',
    flags: '--http-extensions-root <path>',
    description: 'Allowed read-only root for Streamable HTTP extensions.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_EXTENSIONS_ROOT',
    group: 'HTTP Filesystem',
    parser: parseAbsolutePath('HTTP extensions root'),
  },
  {
    name: 'httpArtifactMaxFiles',
    flags: '--http-artifact-max-files <count>',
    description: 'Maximum completed artifact files retained per HTTP session.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_ARTIFACT_MAX_FILES',
    group: 'HTTP Filesystem',
    defaultValue: defaultStreamableHttpOptions.artifacts.maxFiles,
    parser: parsePositiveInteger('HTTP artifact max files'),
  },
  {
    name: 'httpArtifactRetentionMs',
    flags: '--http-artifact-retention-ms <ms>',
    description: 'Retention after a Streamable HTTP session closes.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_ARTIFACT_RETENTION_MS',
    group: 'HTTP Filesystem',
    defaultValue: defaultStreamableHttpOptions.artifacts.retentionMs,
    parser: parsePositiveInteger('HTTP artifact retention'),
  },
  {
    name: 'httpArtifactCleanupIntervalMs',
    flags: '--http-artifact-cleanup-interval-ms <ms>',
    description: 'Artifact cleanup scan interval.',
    env: 'CLOAK_PLAYWRIGHT_MCP_HTTP_ARTIFACT_CLEANUP_INTERVAL_MS',
    group: 'HTTP Filesystem',
    defaultValue: defaultStreamableHttpOptions.artifacts.cleanupIntervalMs,
    parser: parsePositiveInteger('HTTP artifact cleanup interval'),
  },
  {
    name: 'logFormat',
    flags: '--log-format <format>',
    description: 'Runtime log output format.',
    env: 'CLOAK_PLAYWRIGHT_MCP_LOG_FORMAT',
    group: 'Logging',
    defaultValue: defaultLoggingOptions.format,
    choices: logFormats,
  },
];

export function createCliCommand(version: string, options: CreateCliCommandOptions = {}): Command {
  const command = new Command()
    .name('cloakbrowser-mcp')
    .description(cliDescription)
    .version(version)
    .showHelpAfterError()
    .showSuggestionAfterError()
    .allowExcessArguments(false)
    .action(() => undefined);

  for (const definition of cliOptionDefinitions) {
    command.addOption(createCommanderOption(definition));
  }

  command.addCommand(createDoctorCommand(options.doctorAction));
  command.addCommand(createProbeCommand(options.probeAction));

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
  return toCliOptions(command.opts<CommanderCliOptions>(), command);
}

export function renderCliReferenceMarkdown(version: string): string {
  const command = createCliCommand(version);
  return `${renderCliReferenceFrontMatter()}# CLI Reference

This page is generated from the Commander.js CLI definition during MkDocs builds. Update the CLI definition in source code instead of editing this page by hand.

## Usage

\`\`\`text
${command.helpInformation().trimEnd()}
\`\`\`

## Commands

### \`doctor\`

\`\`\`text
${createDoctorCommand().helpInformation().trimEnd()}
\`\`\`

### \`probe\`

\`\`\`text
${createProbeCommand().helpInformation().trimEnd()}
\`\`\`

## Options

${renderOptionsTable()}
`;
}

function createDoctorCommand(action?: (options: DoctorCliOptions) => Promise<void> | void): Command {
  const command = new Command('doctor')
    .description('Run local diagnostics without starting the MCP bridge.')
    .option('--json', 'Output diagnostics as JSON.');

  if (action) {
    command.action(async (options: DoctorCliOptions) => {
      await action(options);
    });
  }

  return command;
}

function createProbeCommand(action?: (options: ProbeCliOptions) => Promise<void> | void): Command {
  const kind = new Option('--kind <kind>', 'Probe kind.').choices(probeKinds).makeOptionMandatory();
  const command = new Command('probe')
    .description('Run an authenticated loopback health or readiness probe.')
    .addOption(kind)
    .option('--timeout-ms <ms>', 'Probe request timeout.', parsePositiveInteger('Probe timeout'), 2_000);

  if (action) {
    command.action(async (options: ProbeCliOptions) => {
      await action(options);
    });
  }

  return command;
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

function toCliOptions(options: CommanderCliOptions, command: Command): CliOptions {
  const tls = normalizeTlsOptions(options);
  const redis = normalizeRedisOptions(options);
  const peer = normalizePeerOptions(options);
  const metrics = normalizeMetricsOptions(options, command);
  const artifacts = normalizeArtifactOptions(options);
  validateHttpProtocolOptions(options.httpProtocol, tls);
  validateRedisSessionOptions(options, redis, peer);
  return {
    transport: options.transport,
    bridge: {
      geoipProxyMatch: normalizeBoolean(
        options.geoipProxyMatch,
        readRawBooleanEnv(command, 'geoipProxyMatch'),
      ),
      humanize: normalizeBoolean(options.humanize, readRawBooleanEnv(command, 'humanize')),
      humanPreset: options.humanPreset,
    },
    http: {
      protocol: options.httpProtocol,
      host: options.httpHost,
      port: options.httpPort,
      endpoint: options.httpEndpoint,
      authToken: optionalString(options.httpAuthToken),
      tls,
      sessionBackend: options.httpSessionBackend,
      sessionIdleTtlMs: options.httpSessionIdleTtlMs,
      sessionMax: options.httpSessionMax,
      sessionDrainTimeoutMs: options.httpSessionDrainTimeoutMs,
      sessionInstanceId: optionalString(options.httpSessionInstanceId),
      sessionOwnerName: optionalString(options.httpSessionOwnerName),
      redis,
      peer,
      metrics,
      artifacts,
      bodyLimitBytes: defaultStreamableHttpOptions.bodyLimitBytes,
    },
    logging: {
      format: options.logFormat,
    },
  };
}

function readRawBooleanEnv(command: Command, name: keyof CommanderCliOptions): string | undefined {
  if (command.getOptionValueSource(name) !== 'env') return undefined;
  const definition = cliOptionDefinitions.find((option) => option.name === name);
  return definition === undefined ? undefined : process.env[definition.env];
}

function normalizeBoolean(value: boolean | string | undefined, rawEnvValue?: string): boolean {
  if (rawEnvValue !== undefined) return parseBooleanEnvValue(rawEnvValue);
  if (typeof value === 'boolean') return value;
  if (value === undefined) return false;
  return parseBooleanEnvValue(value);
}

function parseBooleanEnvValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new InvalidArgumentError(`Boolean environment values must be "true" or "false", got "${value}"`);
}

function normalizeTlsOptions(options: CommanderCliOptions): StreamableHttpTlsOptions {
  return {
    cert: optionalString(options.httpsCert),
    key: optionalString(options.httpsKey),
    pfx: optionalString(options.httpsPfx),
    passphrase: optionalString(options.httpsPassphrase),
  };
}

function normalizeRedisOptions(options: CommanderCliOptions): StreamableHttpRedisOptions {
  return {
    url: optionalString(options.httpRedisUrl),
    keyPrefix: optionalString(options.httpRedisKeyPrefix),
    connectTimeoutMs: options.httpRedisConnectTimeoutMs,
    operationTimeoutMs: options.httpRedisOperationTimeoutMs,
    caFile: optionalString(options.httpRedisCaFile),
    certFile: optionalString(options.httpRedisCertFile),
    keyFile: optionalString(options.httpRedisKeyFile),
  };
}

function normalizePeerOptions(options: CommanderCliOptions): StreamableHttpPeerOptions {
  return {
    host: options.httpPeerHost,
    port: options.httpPeerPort,
    advertiseHost: optionalString(options.httpPeerAdvertiseHost),
    routingToken: optionalString(options.httpPeerRoutingToken),
  };
}

function normalizeMetricsOptions(
  options: CommanderCliOptions,
  command: Command,
): StreamableHttpMetricsOptions {
  return {
    enabled: normalizeBoolean(options.metrics, readRawBooleanEnv(command, 'metrics')),
    host: options.metricsHost,
    port: options.metricsPort,
    endpoint: options.metricsEndpoint,
    authToken: optionalString(options.metricsAuthToken),
  };
}

function normalizeArtifactOptions(options: CommanderCliOptions): StreamableHttpArtifactOptions {
  return {
    root: optionalString(options.httpArtifactsRoot),
    profilesRoot: optionalString(options.httpProfilesRoot),
    extensionsRoot: optionalString(options.httpExtensionsRoot),
    maxFiles: options.httpArtifactMaxFiles,
    retentionMs: options.httpArtifactRetentionMs,
    cleanupIntervalMs: options.httpArtifactCleanupIntervalMs,
  };
}

function validateRedisSessionOptions(
  options: CommanderCliOptions,
  redis: StreamableHttpRedisOptions,
  peer: StreamableHttpPeerOptions,
): void {
  const hasClientCert = redis.certFile !== undefined;
  const hasClientKey = redis.keyFile !== undefined;
  if (hasClientCert !== hasClientKey) {
    throw new InvalidArgumentError('Redis TLS client authentication requires both certificate and key files');
  }

  if (
    redis.url !== undefined &&
    (redis.caFile !== undefined || hasClientCert) &&
    new URL(redis.url).protocol !== 'rediss:'
  ) {
    throw new InvalidArgumentError('Redis TLS files require a rediss:// URL');
  }

  if (options.httpSessionBackend !== HTTP_SESSION_BACKEND_REDIS) return;

  requireRedisOption(redis.url, '--http-redis-url');
  requireRedisOption(redis.keyPrefix, '--http-redis-key-prefix');
  requireRedisOption(options.httpSessionInstanceId, '--http-session-instance-id');
  requireRedisOption(options.httpSessionOwnerName, '--http-session-owner-name');
  requireRedisOption(peer.advertiseHost, '--http-peer-advertise-host');
  requireRedisOption(peer.routingToken, '--http-peer-routing-token');
}

function requireRedisOption(value: string | undefined, flag: string): void {
  if (value !== undefined) return;
  throw new InvalidArgumentError(`${flag} is required with --http-session-backend redis`);
}

function validateHttpProtocolOptions(protocol: HttpProtocol, tls: StreamableHttpTlsOptions): void {
  const hasCert = tls.cert !== undefined;
  const hasKey = tls.key !== undefined;
  const hasPfx = tls.pfx !== undefined;
  const hasPassphrase = tls.passphrase !== undefined;
  const hasAnyTlsOption = hasCert || hasKey || hasPfx || hasPassphrase;

  if (protocol === HTTP_PROTOCOL_HTTP) {
    if (hasAnyTlsOption) {
      throw new InvalidArgumentError('HTTPS certificate options require --http-protocol https');
    }
    return;
  }

  if (hasPfx && (hasCert || hasKey)) {
    throw new InvalidArgumentError('HTTPS must use either --https-pfx or --https-cert with --https-key');
  }
  if (hasPfx) return;
  if (hasCert && hasKey) return;
  throw new InvalidArgumentError('HTTPS requires either --https-cert and --https-key, or --https-pfx');
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
  if (value === HEALTHZ_PATH || value === READYZ_PATH) {
    throw new InvalidArgumentError('HTTP endpoint must not use reserved probe paths "/healthz" or "/readyz"');
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
