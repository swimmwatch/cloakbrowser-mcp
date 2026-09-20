---
description: Bridge architecture for CloakBrowser MCP.
icon: material/graph
tags:
  - Project Internals
---

# Architecture

## Runtime

`cloakbrowser-mcp` is an outer MCP server that can expose stdio or Streamable HTTP. At startup it:

1. resolves or installs the CloakBrowser Chromium binary;
2. writes a temporary Playwright MCP config file;
3. starts upstream `@playwright/mcp` as a child process over stdio;
4. connects to that child with the MCP SDK client transport;
5. exposes an outer MCP server to the user's MCP client over the selected transport;
6. forwards upstream tool list and tool calls unchanged;
7. appends `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.

## Why This Design

The upstream Playwright MCP project already owns the browser tool contracts and evolves quickly. The bridge model keeps this project small and avoids copying browser automation logic.

## Managed CDP Ownership

Managed CDP is an optional second control surface for the same browser generation:

```text
MCP client -> outer bridge -> upstream Playwright MCP child -> Chromium
                    |                    |                    |-- Playwright pipe
                    |                    `-- generated config `-- internal loopback CDP
                    `-- external capability proxy <--------- CDP client
```

The MCP session owns the external port lease, capability proxy, generated upstream
configuration, replaceable upstream child, and current Chromium generation. A CDP
client never connects directly to the internal loopback endpoint. Bootstrap places a
one-use browser-page challenge through MCP and consumes it through CDP before the
external capability is published. Playwright's internal remote-debugging pipe remains
active alongside the bridge-managed TCP endpoint.

The external port lease is stable for the MCP session, while the child process,
internal endpoint, generation number, and capability URL are replaceable. Browser
loss invalidates the current capability and closes its proxied sockets, but does not
start a child in the background. The first later `browser_*` MCP call applies the
restart-before-forward rule:

1. concurrent browser calls share one bounded restart;
2. the old child becomes unreachable and is disposed;
3. a replacement child uses the same session configuration and a new internal port;
4. ownership and external readiness are verified before publication;
5. waiting browser calls are each forwarded exactly once to the ready replacement.

If readiness fails, no waiting browser call reaches an upstream child, no capability
is published, and a later browser call may start a new bounded attempt. Browser state
such as tabs and in-memory storage is not restored across replacement. Local tools,
tool listing, discovery reads, and ordinary CDP disconnects do not trigger restart.

Cleanup reverses reachability: stop admission, invalidate the capability, close proxy
sockets, dispose the upstream child and browser, close the external listener, then
release the port lease. This keeps an old URL from silently moving to a new browser.

MCP and CDP commands may run concurrently. The bridge does not add cross-protocol
transactions or infer which caller owns a page; callers must coordinate destructive or
conflicting operations.

## Docker

The Docker image uses the pinned official Playwright MCP image as the base image. The bridge is installed under `/opt/cloakbrowser-mcp`, while upstream Playwright MCP remains available at `/app/cli.js`.

## Configuration

The bridge writes a temporary JSON config with CloakBrowser launch options. Upstream `PLAYWRIGHT_MCP_*` environment variables are still forwarded to upstream Playwright MCP.

## Transport

The default transport is stdio. Streamable HTTP is enabled explicitly with `--transport streamable-http` or `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

For stdio, one outer server owns one upstream Playwright MCP child process and keeps upstream Playwright MCP's default profile behavior. For Streamable HTTP, each MCP session owns its own outer server, upstream child process, generated config, and in-memory transport state. HTTP sessions start upstream Playwright MCP with isolated browser profiles so concurrent users do not share or contend for the same persistent Chromium profile.

The session backend stores metadata only. The built-in backend is `memory`; future Redis, Postgres, or SQLite adapters can coordinate metadata and locks, but they cannot restore a live upstream browser process after its owning server process exits. Horizontal scaling should use sticky sessions keyed by `mcp-session-id`.

The bridge uses MCP SDK `StreamableHTTPServerTransport` for Streamable HTTP. It does not expose the deprecated MCP `SSEServerTransport` or a legacy `/sse` endpoint.
