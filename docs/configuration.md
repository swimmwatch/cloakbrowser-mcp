---
description: Runtime configuration for the Playwright MCP bridge, including Streamable HTTP sessions, GeoIP-aware proxy matching, and humanized input behavior.
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
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Persistent Chromium profile directory. The bridge resolves it to an absolute path, creates it if missing, verifies it is writable, and writes it to generated `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON object with validated context options. Supported fields are listed below. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON array or comma-separated list of existing Chrome extension directories. Requires `PLAYWRIGHT_MCP_USER_DATA_DIR`. Use JSON arrays for Windows paths or paths containing commas. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## GeoIP Proxy Matching

Set `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` with `PLAYWRIGHT_MCP_PROXY_SERVER`
to derive CloakBrowser timezone, language, and locale fingerprint flags from the
proxy location. The bridge keeps proxy routing delegated to upstream Playwright
MCP and only injects the resolved `--fingerprint-timezone`, `--lang`, and
`--fingerprint-locale` launch flags.

See [GeoIP Proxy Matching](geoip-proxy-matching.md) for setup examples, runtime
Streamable HTTP proxy metadata, use cases, precedence rules, and limitations.

## Humanized Input Behavior

Set `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` to enable CloakBrowser's human-like
mouse, keyboard, and scroll layer for page interactions. The bridge applies this
through Playwright MCP's page initialization hook, so upstream browser tool
schemas stay unchanged.

See [Humanized Input Behavior](humanized-input-behavior.md) for setup examples,
runtime Streamable HTTP metadata, use cases, and limitations.

## Streamable HTTP Runtime Metadata

Streamable HTTP clients can choose selected runtime options per MCP session by adding
bridge-specific metadata to the `initialize` request:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "humanize": true,
        "humanPreset": "careful",
        "userDataDir": "/absolute/path/to/profile",
        "contextOptions": {
          "viewport": { "width": 1280, "height": 720 },
          "locale": "en-US",
          "timezoneId": "America/New_York"
        },
        "extensionPaths": ["/absolute/path/to/extension"]
      }
    }
  }
}
```

`proxyServer` overrides `PLAYWRIGHT_MCP_PROXY_SERVER` for that HTTP session.
`proxyBypass` overrides `PLAYWRIGHT_MCP_PROXY_BYPASS` only when `proxyServer` is
present. `geoipProxyMatch` can enable or disable GeoIP matching for that session
without restarting the MCP server. Existing sessions keep their startup proxy;
create a new HTTP session to switch location.

`humanize` can enable or disable humanized input behavior for that session
without changing other sessions. `humanPreset` can select `default` or `careful`
for that session, but does not enable humanized behavior by itself. Existing
sessions keep the behavior captured during `initialize`.

`headless` can enable or disable headless browser mode for that session. Setting
`headless` to `false` requires a usable display environment, especially in
Docker or Linux server deployments.

`userDataDir` enables a persistent Chromium profile for that session and
overrides `PLAYWRIGHT_MCP_USER_DATA_DIR`. The bridge resolves the directory to
an absolute platform-native path, creates it if missing, verifies it is writable,
and writes it to generated `browser.userDataDir`. A persistent profile disables
the default Streamable HTTP isolated profile for that session. The bridge
rejects duplicate active profile directories inside one process; cross-process
profile conflicts remain Chromium/Playwright errors.

`contextOptions` are validated and shallow-merged over
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`; nested objects replace whole values.
Supported fields are `userAgent`, `viewport`, `locale`, `timezoneId`,
`colorScheme`, `permissions`, `geolocation`, `extraHTTPHeaders`,
`httpCredentials`, `ignoreHTTPSErrors`, `offline`, `deviceScaleFactor`,
`isMobile`, and `hasTouch`. Arbitrary `BrowserContextOptions` passthrough is not
supported in this release.

`extensionPaths` must point to existing directories and require a persistent
`userDataDir`. The bridge resolves extension paths to absolute platform-native
paths, passes them to CloakBrowser, and writes the generated
`--load-extension` and `--disable-extensions-except` Chromium arguments into the
generated Playwright MCP config.

Authenticated HTTP proxy credentials can be embedded in `proxyServer`, for
example `http://user:pass@proxy.example:8080`. Percent-encode credential
characters that have URL meaning, such as `@`, `:`, `/`, `?`, `#`, and `%`.

For multi-location QA patterns, see [GeoIP Proxy Matching](geoip-proxy-matching.md).
For interaction realism patterns, see [Humanized Input Behavior](humanized-input-behavior.md).

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
