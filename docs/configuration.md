---
description: Runtime configuration for the Playwright MCP bridge, including Streamable HTTP sessions, persistent profiles, validated context options, extension paths, GeoIP proxy matching, and humanized input.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Configuration

Use upstream `PLAYWRIGHT_MCP_*` variables for Playwright MCP behavior. Use `CLOAK_PLAYWRIGHT_MCP_*` only for Cloak-specific bridge behavior.

The old `CLOAKBROWSER_MCP_*` variables are not supported.
The generated [CLI Reference](generated/cli.md) is the authoritative list of bridge CLI flags and their matching environment variables.
For task-focused examples, see the [Recipes](recipes/index.md) section.

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
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | CloakBrowser binary release channel: `stable` or Pro-only `preview`. |
| `CLOAKBROWSER_BINARY_PATH` | unset | Path to a custom CloakBrowser executable. The `--binary-path` CLI option takes precedence. |
| `CLOAKBROWSER_VERSION` | unset | Version pin passed to CloakBrowser's cache resolver when no custom executable is selected. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Code-generation target: `typescript`, `python`, `java`, `csharp`, or `none`. The bridge validates it and writes `codegen` into its generated Playwright MCP config. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` or `false`; include each element's bounding box as `[box=x,y,width,height]` in snapshots. The bridge validates it and writes `snapshot.boxes` into its generated Playwright MCP config. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Upstream wait in milliseconds after an action for triggered work to settle. Forwarded directly to Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Persistent Chromium profile directory. The bridge resolves it to an absolute path, creates it if missing, verifies it is writable, and writes it to generated `browser.userDataDir`. |
| `PLAYWRIGHT_MCP_EXTENSION` | `false` | Connect through the separately installed official Playwright Extension instead of launching a bridge-owned browser. Requires a persistent user data directory and `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. |
| `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` | unset | One relative profile-directory segment, such as `Profile 1`, used only by Playwright Extension connection mode. |
| `PLAYWRIGHT_MCP_EXTENSION_TOKEN` | unset | Secret shared with the official Playwright Extension. Accepted only from the process environment; never from HTTP initialize metadata. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON object with validated context options. Supported fields are listed below. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON array or comma-separated list of existing Chrome extension directories. Requires `PLAYWRIGHT_MCP_USER_DATA_DIR`. Use JSON arrays for Windows paths or paths containing commas. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Managed CDP

Managed Chrome DevTools Protocol (CDP) access is an explicit opt-in. It exposes the
same Chromium browser generation controlled by MCP through a capability-bearing
discovery URL. Configuring a port pool alone does not enable CDP.

| CLI option | Environment variable | Default | Purpose |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | Set the stdio value and the Streamable HTTP session default. |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | unset | Configure the process-local external proxy port pool. One enabled session leases one port. |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | Bind the managed CDP proxy. |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | Permit or deny a non-loopback bind. |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | unset | Put a concrete externally reachable host in discovery URLs. Required for wildcard binds. |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | Publish `http`/`ws` or `https`/`wss` URLs. This does not enable TLS. |

Each CLI value overrides only its matching environment variable. In particular,
`--no-cdp-enabled` overrides `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`, and
`--no-cdp-allow-remote` overrides `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
An enabled session without a port pool is rejected before its upstream child starts.
An effective false value creates no listener, port lease, or capability.

For stdio, the process value applies directly:

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

For Streamable HTTP, the flat `cdpEnabled` boolean in the authenticated
`initialize` metadata overrides the process default for that session. Omitting the
field inherits the process value. These examples explicitly opt one session in and
another out:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": true
      }
    }
  }
}
```

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": false
      }
    }
  }
}
```

One CDP-enabled HTTP session owns one external port lease. Disabled sessions do not
consume the pool. Allocation is process-local, selects the lowest unleased candidate,
and fails that session immediately if the selected external port is already occupied.
Close sessions to release ports or configure a larger range when the pool is exhausted.

Retrieve the current URL from `cloakbrowser_bridge_info`, then pass its
`structuredContent.cdp.discoveryUrl` to a CDP client such as Playwright's
`chromium.connectOverCDP()`. Treat that URL as a credential: it includes a random
per-generation capability and becomes stale after browser replacement. Managed CDP is
not a Playwright Server endpoint. `chromium.connect()` and the current Open WebUI
`PLAYWRIGHT_WS_URL` flow are not supported.

`--cdp-advertised-scheme https` publishes `https` discovery and `wss` WebSocket URLs
only. The bridge does not provide TLS for managed CDP: its external listener and
Chromium hop remain plaintext HTTP/WebSocket. An operator-owned TLS terminator must
listen on the same advertised leased port, preserve the advertised `Host` and `Origin`
authority, and forward one-to-one to that session's plaintext listener.

CDP enablement starts Chromium during MCP initialization so ownership and external
readiness can be verified. Configure the MCP client initialize timeout to at least 60
seconds. When managed CDP is enabled, user-supplied
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` must not contain `--remote-debugging-port`,
`--remote-debugging-address`, or `--remote-debugging-pipe` (including `=` forms).
Playwright's own internal `--remote-debugging-pipe` remains enabled alongside the
bridge-managed loopback TCP endpoint.

See [Tools](tools.md#cloakbrowser_bridge_info), [Docker](docker.md#managed-cdp),
[Security](security.md#managed-cdp-security), and
[Architecture](architecture.md#managed-cdp-ownership) for discovery state, deployment,
limits, and restart behavior.

## CloakBrowser License And GitHub Sign-In

License setup uses the upstream CloakBrowser CLI; `cloakbrowser-mcp` does not
add login or logout commands:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

`login` accepts a paid key or starts GitHub sign-in for a free-tier key. It
stores the validated key in `~/.cloakbrowser/license.key`; `logout` removes that
file. `info` reports the active license tier and, for Pro licenses, the active
session count.

You can instead set `CLOAKBROWSER_LICENSE_KEY` in the MCP server environment.
The bridge forwards that variable to the upstream/browser child without
logging it. When `CLOAKBROWSER_CACHE_DIR` points to a custom cache containing
`license.key`, CloakBrowser resolves the key and the bridge forwards only that
resolved key from the generated browser environment. Other generated
environment entries are not copied.

If CloakBrowser rejects a supplied license key, cannot verify it, or cannot
reach its license server, startup fails with the explicit CloakBrowser error.
The bridge preserves that error; it does not mask it or silently fall back to a
different browser or license tier.

## CloakBrowser Release Channel

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` selects the CloakBrowser binary release
channel. It defaults to `stable`. `preview` requests a Pro Preview browser
build and is available only with a Pro license. An explicit
`CLOAKBROWSER_VERSION` pin takes precedence. If Preview is unavailable for the
platform, CloakBrowser falls back to Stable.

The release channel is selected when the bridge process starts. It applies to
all Streamable HTTP sessions and cannot be set or overridden in initialize
metadata. Restart the bridge to change it.

## Custom CloakBrowser Binary

`--binary-path <path>` selects a custom CloakBrowser executable for the current
bridge process. `CLOAKBROWSER_BINARY_PATH` provides the same setting for
environment-based deployments; the CLI option takes precedence. The bridge
resolves the path, requires a readable regular file, and writes the resolved
path to Playwright MCP's generated `browser.launchOptions.executablePath`.

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

The bridge does not download or update a custom executable. When no custom path
is selected, `CLOAKBROWSER_VERSION` can pin the CloakBrowser-managed binary
version instead.

When the selected binary implements `document.modelContext`, upstream
Playwright MCP can add `webmcp_<page-tool>` tools after a page snapshot. It
sends `tools/list_changed`; the bridge forwards the notification and refreshed
tool list. The page defines each dynamic tool's name and schema.

For Streamable HTTP, the selected binary belongs to the bridge process and is
used by every MCP session it creates. `initialize` metadata cannot select or
override an executable path; run separate bridge processes when sessions need
different binaries.

## GeoIP Proxy Matching

Set `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` with `PLAYWRIGHT_MCP_PROXY_SERVER`
to derive CloakBrowser timezone, language, and locale fingerprint flags from the
proxy exit location. CloakBrowser selects native inline authentication for
supported binaries and retains Playwright's proxy object as a fallback for
older binaries.

See [GeoIP Proxy Matching](geoip-proxy-matching.md) for setup examples, runtime
Streamable HTTP proxy metadata, use cases, precedence rules, and limitations.
For a concise task path, see [Regional QA Through Proxy](recipes/regional-qa-through-proxy.md).

Matching is fail-closed: if CloakBrowser cannot resolve the proxy exit IP, GeoIP
database, timezone, or locale, the browser does not start with a partially
matched fingerprint. GeoIP lookup uses a maximum 20-second resolution timeout;
the first download of the offline GeoIP database is separate and can take
longer.

## Humanized Input Behavior

Set `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` to enable CloakBrowser's human-like
mouse, keyboard, and scroll layer for page interactions. The bridge applies this
through Playwright MCP's page initialization hook, so upstream browser tool
schemas stay unchanged.

See [Humanized Input Behavior](humanized-input-behavior.md) for setup examples,
runtime Streamable HTTP metadata, use cases, and limitations.

## Chrome Extensions

Chrome extensions are loaded when the browser starts, so configure them before
starting the bridge or before creating a Streamable HTTP session. Extensions
must be unpacked directories and require a persistent profile:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

For Streamable HTTP, pass the profile and extension directories in initialize
metadata:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "userDataDir": "/absolute/path/to/profile",
        "extensionPaths": ["/absolute/path/to/my-extension"]
      }
    }
  }
}
```

Restart the bridge or create a new HTTP session after changing extension files
or extension paths. Use a JSON array for `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`
when paths contain commas, when passing multiple extensions, or when using
Windows drive-letter paths.

See [Load Chrome Extension](recipes/load-chrome-extension.md) for a shorter copy-paste setup.

## Playwright Extension connection mode

Playwright Extension connection mode is separate from loading an unpacked extension with `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`. It connects through the official Playwright Extension already installed in a Chrome or Edge profile; the bridge does not install that extension.

For stdio, configure the process environment:

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

For Streamable HTTP, `extensionMode` and `profileDirName` initialize metadata override their process-level values. `userDataDir` is also session-specific. The token remains process-environment-only:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "extensionMode": true,
        "profileDirName": "Profile 1",
        "userDataDir": "/absolute/path/to/profile"
      }
    }
  }
}
```

Extension mode requires a non-empty token and a persistent profile. Concurrent HTTP extension sessions must use different `userDataDir` values. The bridge rejects managed or external CDP endpoints, remote browser endpoints, headless or isolated launch configuration, proxy and GeoIP options, humanization, context mutation, unpacked `extensionPaths`, and explicitly supplied CloakBrowser launch options before starting the upstream child. Positive end-to-end verification is manual because the official Playwright Extension must already be installed in the selected browser profile.

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
        "extensionMode": false,
        "profileDirName": "Profile 1",
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

`headless` can enable or disable headless browser mode for that session. In the
Docker image, setting `headless` to `false` starts a container-private virtual
display on demand. Outside the image, a headed session still requires a usable
display environment.

`extensionMode` and `profileDirName` override `PLAYWRIGHT_MCP_EXTENSION` and
`PLAYWRIGHT_MCP_PROFILE_DIR_NAME` for that session. `PLAYWRIGHT_MCP_EXTENSION_TOKEN`
is never accepted in metadata.

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
On supported CloakBrowser binaries, authenticated HTTP proxies use native
inline authentication and the bridge removes the duplicate Playwright proxy
object. Older binaries retain the Playwright proxy object as a compatibility
fallback.

For multi-location QA patterns, see [GeoIP Proxy Matching](geoip-proxy-matching.md).
For interaction realism patterns, see [Humanized Input Behavior](humanized-input-behavior.md).
For login reuse and extension setup, see [Persistent Login Profile](recipes/persistent-login-profile.md) and [Load Chrome Extension](recipes/load-chrome-extension.md).

## Upstream Options

The bridge forwards `PLAYWRIGHT_MCP_*` settings to upstream Playwright MCP. That includes upstream options such as:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_FILE_PATHS`
- `PLAYWRIGHT_MCP_IDLE_TIMEOUT`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_PROFILE_DIR_NAME`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_WEBMCP`

Refer to the upstream Playwright MCP documentation for the full upstream option surface.

`PLAYWRIGHT_MCP_CAPS=devtools` is inherited by the upstream child process; it
enables the upstream capability-gated tools without a bridge-specific `--caps`
flag.

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
