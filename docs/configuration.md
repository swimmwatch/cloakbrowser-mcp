# Configuration

This page is for operators configuring a running MCP server. For the shortest install path, start with [Getting started](getting-started.md).

Configuration is loaded from three layers, merged in order (later layers win):

1. Built-in defaults from `src/config/schema.ts`.
2. Environment variables (`CLOAKBROWSER_MCP_*`).
3. CLI flags.

All resolved configuration is validated with `zod`. Invalid values cause the process to exit with a non-zero code on startup.

## Core options

The table below is generated during MkDocs builds from `src/config/options.ts` and the defaults exported by `src/config/schema.ts`.

--8<-- ".generated-docs/config-core-options.md"

## Capability flags

Capability flags are retained for project-specific extensions and deployment policy, but the Playwright MCP-compatible tool surface is registered by default for parity with upstream Playwright MCP. Tools may still declare capabilities for non-Playwright extensions, and the registry skips registration when a required capability is off.

Set each flag via:

- CLI: `--cap-<kebab-name>` to enable, `--no-cap-<kebab-name>` to disable (e.g. `--cap-allow-pdf`).
- Environment: `CLOAKBROWSER_MCP_CAP_<SCREAMING_SNAKE>=true|false` (e.g. `CLOAKBROWSER_MCP_CAP_ALLOW_PDF=true`).
- Programmatic: `createServer({ config: { capabilities: { allowPdf: true } } })`.

The table below is generated during MkDocs builds from `src/config/options.ts`, `src/config/schema.ts`, and registered tool definitions in `src/tools/index.ts`.

--8<-- ".generated-docs/config-capability-flags.md"

`allowUnsafeEvaluate` is intentionally **not a flag**. Playwright-compatible unsafe execution tools are registered by default for parity with upstream Playwright MCP; see [Security](security.md).

## Origin policy

If `allowedOrigins` is set and non-empty, the URL host must match one entry (suffix match: `example.com` matches `a.example.com` and `example.com`). `*` matches any host. `blockedOrigins` is always honored and overrides `allowedOrigins`. Only `http`, `https`, `file`, and `about:` URLs are accepted; `file:` additionally requires `allowFileAccess` at the tool level.

## Logging

The logger writes pino-formatted JSON lines to `stderr` only. `stdout` is reserved for the MCP JSON-RPC transport — any write to `stdout` would corrupt the protocol stream. A contract test in `tests/contract/mcp-server.test.ts` asserts this invariant.

## Docker-specific configuration

When running in the provided Docker image:

- `CLOAKBROWSER_MCP_OUTPUT_DIR=/data` is set by default; mount a host directory to `/data` to persist artifacts.
- `CLOAKBROWSER_MCP_LOG_LEVEL=info` is set by default.
- The entrypoint prepares `/data`, then runs as the image `app` user for root-owned volumes or as the bind-mounted output directory owner for host directories.
- The image includes the `cloakbrowser` runtime package; see [Docker](docker.md) for cache and volume notes.
