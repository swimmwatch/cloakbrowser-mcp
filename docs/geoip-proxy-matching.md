---
title: GeoIP Proxy Matching
description: Match CloakBrowser timezone, language, and locale fingerprints to a configured proxy location for regional QA and Streamable HTTP sessions.
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# GeoIP Proxy Matching

GeoIP proxy matching keeps browser fingerprint settings aligned with the proxy
location used by upstream Playwright MCP. It is useful when regional QA depends
on a consistent proxy, timezone, language, and locale profile.

For a concise end-to-end setup, see [Regional QA Through Proxy](recipes/regional-qa-through-proxy.md).

The bridge does not create or route proxy traffic itself. It passes
`PLAYWRIGHT_MCP_PROXY_SERVER` to CloakBrowser's launch preparation. When
matching is enabled, CloakBrowser resolves the configured proxy's exit location
and adds matching launch flags for timezone, browser language, fingerprint
locale, and WebRTC IP.

## What It Changes

When `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true`, the bridge can add these
launch flags for CloakBrowser:

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`
- `--fingerprint-webrtc-ip`

This helps the browser profile look internally consistent with the proxy region.
The upstream Playwright MCP tool schemas and browser tools are still forwarded
unchanged.

## Global Setup

Use process-level environment variables for stdio clients and as the default for
Streamable HTTP sessions:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Add a bypass list when some hosts should avoid the proxy:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Authenticated HTTP proxies are supported by embedding credentials in
`PLAYWRIGHT_MCP_PROXY_SERVER`. Percent-encode special characters in credentials,
for example use `p%40ssword` for `p@ssword`. Supported CloakBrowser binaries
use native inline authentication and report the proxy's real exit IP even when
the proxy requires a strict authenticated CONNECT request. Older binaries keep
the Playwright proxy object as a compatibility fallback.

## Docker Setup

Pass the same variables to the container. Keep proxy credentials in your secret
manager or MCP client environment where possible.

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

For Streamable HTTP in Docker, publish the HTTP port as usual and keep the proxy
variables as container environment defaults:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Per-Session Streamable HTTP Proxy

Streamable HTTP clients can choose a proxy at MCP session initialization time.
This lets one long-running MCP server handle different regional scenarios without
being restarted.

Send bridge metadata in the `initialize` request:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` overrides `PLAYWRIGHT_MCP_PROXY_SERVER` for that HTTP session.
`proxyBypass` overrides `PLAYWRIGHT_MCP_PROXY_BYPASS` only when `proxyServer` is
present. If `proxyServer` is present and `proxyBypass` is omitted, inherited
proxy bypass configuration is cleared for that session.

`geoipProxyMatch` overrides the process-level GeoIP setting for that HTTP
session. Use `true` to enable matching for the session or `false` to disable it
even when the server was started with matching enabled.

Existing HTTP sessions are immutable. Create another Streamable HTTP session to
switch to a different proxy or location.

If `proxyServer` contains credentials, keep them URL-encoded and pass the value
through secrets or client runtime configuration rather than committing it to
project files.

## Use Cases

<div class="grid cards" markdown>

- :material-cart-check: **Localized commerce QA**

  Test checkout, taxes, shipping messages, currency, and regional catalog rules
  with browser timezone and locale aligned to the proxy location.

- :material-web: **Regional landing pages**

  Verify language, consent, campaign, and content variants that depend on the
  visitor region.

- :material-lifebuoy: **Customer support reproduction**

  Reproduce a report from a customer region without restarting the whole MCP
  server for each proxy location.

- :material-clock-check: **Timezone-sensitive flows**

  Validate date pickers, booking windows, reminders, and scheduling pages where
  timezone and locale must match the network region.

- :material-source-branch-sync: **Parallel regional sessions**

  Run separate Streamable HTTP sessions with different proxies so an agent can
  compare multiple regions in one server process.

</div>

## Precedence And Limits

| Area | Behavior |
| --- | --- |
| Stdio | Uses process-level environment variables and CLI flags only. |
| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |
| Streamable HTTP metadata | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` can override proxy and GeoIP matching for one session. |
| Existing sessions | Keep the proxy and GeoIP setting captured during `initialize`. |
| Authenticated HTTP proxy | Uses CloakBrowser native inline authentication on supported binaries and the Playwright proxy object on older binaries. |
| Raw timezone/locale flags | Explicit `--fingerprint-timezone`, `--lang`, and `--fingerprint-locale` values in `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` take precedence over GeoIP-derived values and are not duplicated. |
| Browser geolocation API | Not configured by this feature; it only aligns CloakBrowser timezone, language, and locale fingerprint flags. |

GeoIP location data is approximate and depends on the proxy IP and CloakBrowser's
GeoIP database. CloakBrowser downloads and caches that offline database on first
use when it is needed.

For example, the following keeps the explicit timezone and locale while still
using GeoIP matching to resolve the proxy exit IP:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS='["--fingerprint-timezone=America/New_York","--lang=en-US","--fingerprint-locale=en-US"]' \
npx -y cloakbrowser-mcp@latest
```

Use this feature for legitimate QA, localization, and environment consistency
testing. It should not be treated as a way to bypass access controls or regional
policy checks.

## Related Configuration

- [Configuration](configuration.md) lists all bridge and upstream environment variables.
- [Docker](docker.md) explains container runtime defaults and Streamable HTTP publishing.
- [Regional QA Through Proxy](recipes/regional-qa-through-proxy.md) gives a task-focused setup.
- [Tools](tools.md) explains why upstream Playwright MCP browser tools are forwarded unchanged.
