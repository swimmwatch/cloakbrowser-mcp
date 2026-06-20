---
description: Runtime configuration for the Playwright MCP bridge.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Configuration

Use upstream `PLAYWRIGHT_MCP_*` variables for Playwright MCP behavior. Use `CLOAK_PLAYWRIGHT_MCP_*` only for Cloak-specific bridge behavior.

The old `CLOAKBROWSER_MCP_*` variables are not supported.
The generated [CLI Reference](generated/cli.md) is the authoritative list of bridge CLI flags and their matching environment variables.

## Bridge Options

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Upstream Options

The bridge forwards `PLAYWRIGHT_MCP_*` settings to upstream Playwright MCP. That includes upstream options such as:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_USER_DATA_DIR`

Refer to the upstream Playwright MCP documentation for the full upstream option surface.

## Logging

Streamable HTTP mode writes human-readable startup and request logs to stdout. Stdio mode does not emit routine operational logs so MCP JSON-RPC stdout remains protocol-clean. Fatal CLI startup failures are still written to stderr.

## HTTPS

Streamable HTTP uses local HTTP by default. Select direct TLS with `--http-protocol https` or `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, then provide either a certificate/key pair or a PFX file:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

For external or non-loopback exposure, use HTTPS plus `--http-auth-token`, or terminate TLS at a trusted reverse proxy that also enforces authentication and network access controls.

## Streamable HTTP Sessions

Each Streamable HTTP MCP session owns its own bridge runtime and upstream Playwright MCP child process. HTTP sessions run upstream Playwright MCP with an isolated browser profile so concurrent users do not contend for the same persistent Chromium profile. The built-in `memory` session backend stores only metadata such as session ID, timestamps, expiry, and status. Browser state remains in the live upstream child process, and artifacts are still controlled by `PLAYWRIGHT_MCP_OUTPUT_DIR`.

For horizontal scaling, run multiple server replicas behind a load balancer with sticky sessions keyed by the `mcp-session-id` header. Future Redis, Postgres, or SQLite backends can coordinate metadata and locks, but they cannot restore a live browser session after the process that owns it exits.

## Streamable HTTP Probes

When the bridge runs with `--transport streamable-http`, it exposes fixed probe endpoints on the same host and port as the MCP endpoint:

- `GET /healthz` returns process health metadata: `status`, `version`, `transport`, and `uptimeMs`.
- `GET /readyz` returns readiness metadata and session capacity: `sessions.active`, `sessions.pending`, `sessions.max`, and `sessions.available`.

Readiness returns HTTP `200` while session capacity is available and HTTP `503` when `active + pending >= max`.
If `--http-auth-token` or `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` is configured, both probes require the same `Authorization: Bearer ...` header as MCP requests. Without an auth token, the probes are open on the configured HTTP bind address.
