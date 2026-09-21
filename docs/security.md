---
description: Security model and browser automation risk guidance for CloakBrowser MCP, Docker isolation, artifacts, secrets, and network exposure.
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# Security

This project is a browser automation bridge. Treat it as trusted-code execution infrastructure.

## Trust Boundary

The outer server supports stdio and Streamable HTTP. It starts upstream Playwright MCP as a child process and forwards tool calls. Browser automation, file output, network access, and unsafe evaluation behavior are governed by upstream Playwright MCP.

Do not expose the stdio server through an unauthenticated network wrapper. Any client that can call tools can drive the browser, read browser-observable page data, and request artifacts.

Streamable HTTP binds to `127.0.0.1` over HTTP by default for local clients. If you bind it to `0.0.0.0` or publish it outside loopback, require `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` or equivalent reverse proxy authentication, use direct HTTPS with `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` and TLS files or terminate TLS at a trusted network edge, and restrict access to trusted clients.

## Managed CDP Security

Managed CDP is disabled by default. It provides arbitrary Chromium DevTools control,
not a reduced browser-tool API. Enable it only for trusted clients. The capability in
`cloakbrowser_bridge_info.cdp.discoveryUrl` is a bearer credential: do not log it,
store it in tickets, or share it between sessions. It rotates after browser replacement
and an old URL never moves to the replacement generation.

A non-loopback CDP bind requires both `--cdp-allow-remote` and a concrete advertised
host. Add network access controls around the published port. Selecting
`--cdp-advertised-scheme https` does not provide TLS. The managed listener and
Chromium hop remain plaintext; an operator-owned same-port TLS terminator must preserve
the advertised `Host` and `Origin` authority and maintain one-to-one routing to the
owning session.

Runtime logs never include capability paths, target IDs, CDP payloads, browser data,
cookies, raw `Host` or `Origin` values, or profile paths. Rejected security checks are
reported only as a session-scoped `cdp_security_rejections` warning with 60-second
saturating counts for `capability`, `host`, and `origin`; cleanup flushes any remaining
counts. Successful checks do not create per-request audit records.

### Fixed Limits

Limits apply independently to each CDP-enabled MCP session:

| Boundary | Limit |
| --- | --- |
| Active proxied WebSocket connections, including in-flight handshakes | 8 |
| Concurrent pre-upgrade HTTP requests | 16 |
| Request headers | 16 KiB |
| Request body on supported routes | Not allowed |
| Buffered Chromium HTTP response | 4 MiB |
| Inbound or outbound WebSocket message | 16 MiB |
| Queued unsent WebSocket data per direction | 16 MiB |
| Request headers, upstream HTTP response, or WebSocket handshake | 10 seconds |
| Graceful proxy shutdown before forced close | 5 seconds |
| Local error response body | 8 KiB |

### HTTP Errors

Local failures use JSON `{"error":{"code":"...","message":"..."}}` with
`Cache-Control: no-store`, `Content-Type: application/json; charset=utf-8`, and an
exact `Content-Length`. Method failures also include `Allow`. The stable mappings are:

| Status | Code |
| --- | --- |
| `400` | `bad_request` |
| `403` | `forbidden` |
| `404` | `not_found` |
| `405` | `method_not_allowed` |
| `408` | `request_timeout` |
| `413` | `payload_too_large` |
| `431` | `headers_too_large` |
| `500` | `internal_error` |
| `502` | `bad_gateway` |
| `503` | `unavailable` |
| `504` | `gateway_timeout` |
| Chromium `400..499` | `upstream_error`, preserving the status |

Chromium redirects, server errors, malformed responses, and transport failures are
normalized instead of exposing Chromium response bodies. A bridge-generated rejection
before upstream dispatch has no Chromium side effect. A read-only discovery request may
be retried after correcting the condition. For ambiguous state-changing failures,
re-read `/json/list` and reconcile application state; do not assume `Retry-After` or
automatic idempotency.

### WebSocket Closes

Locally generated closes use fixed redacted pairs. Valid peer closes are relayed.

| Code | Reason | Use |
| --- | --- | --- |
| `1001` | `going_away` | Session, generation, or proxy shutdown |
| `1002` | `protocol_error` | Malformed WebSocket protocol input |
| `1009` | `message_too_big` | Message exceeds the configured limit |
| `1011` | `internal_error` | Unexpected upstream disconnect or relay failure |
| `1013` | `try_again_later` | Per-direction unsent queue limit exceeded |

## Unsafe Tools

Upstream Playwright MCP includes tools such as `browser_evaluate` and `browser_run_code_unsafe`. These can execute JavaScript in the browser or Playwright server context. Only connect this server to MCP clients you trust.

WebMCP tools named `webmcp_*` are defined by the current page. Treat every page-provided name, description, schema, annotation, and output as untrusted content. The bridge forwards these fields unchanged and does not infer that a tool is safe from its annotations. Do not enable Chromium WebMCP for untrusted sites, and set `PLAYWRIGHT_MCP_WEBMCP=false` when dynamic tools are not needed.

## Playwright Extension token

`PLAYWRIGHT_MCP_EXTENSION_TOKEN` authenticates the separately installed official Playwright Extension. Supply it only through the MCP server process environment or your secret manager. The bridge does not accept the token in Streamable HTTP initialize metadata and does not write it to generated config, bridge metadata, logs, errors, or diagnostic snapshots. Persistent profiles used by extension mode can contain authenticated browser state; isolate their filesystem access and do not reuse one active `userDataDir` across concurrent sessions.

## Configuration

Use upstream options for access controls and guardrails:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

These are convenience guardrails, not a substitute for process, container, network, and filesystem isolation.

Use allowlists for trusted targets whenever possible. Treat unrestricted file access and secrets files as sensitive capabilities and keep them out of shared MCP client profiles.

## Sandbox Mode

The Docker image defaults to `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true` because browser sandboxing is frequently unavailable in containerized CI and MCP runtimes. This is a compatibility tradeoff. If your host and container runtime support Chromium sandboxing, set:

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

When running without the Chromium sandbox, use Docker or another process isolation boundary and avoid mounting broad host directories.

## Artifacts And Secrets

Screenshots, snapshots, downloads, network logs, console logs, and traces can contain credentials or private page content. Mount only the artifact directory you need, clean it after use, and avoid sharing artifact bundles publicly.

If your MCP client injects credentials into browser sessions, prefer short-lived credentials scoped to the target site. Do not put long-lived tokens in screenshots, network responses, or persistent browser profiles.

## Docker

Docker is recommended when you want isolation and reproducible browser dependencies. Mount only the artifact directory you need; the image includes Tini so browser child processes are reaped correctly. For a hardened read-only container, keep `/data` mounted and provide writable temporary mounts for `/tmp` and `/tmp/.X11-unix` when headed sessions are possible.

When publishing Streamable HTTP from Docker, prefer `-p 127.0.0.1:3000:3000`. Publishing directly to a public interface gives any reachable client browser automation capability unless you add authentication and network controls.

The Docker image is scanned with Trivy in CI and before release publishing. The scanner checks high and critical OS/library vulnerabilities and uploads SARIF results to GitHub code scanning when enabled.

## Supply Chain Checks

The repository uses free GitHub-native and open source checks:

- CodeQL for JavaScript and TypeScript static analysis.
- Dependency Review for pull request dependency changes.
- `npm audit --omit=dev --audit-level=high` for runtime npm dependencies.
- OpenSSF Scorecard for repository supply-chain signals.
- zizmor for GitHub Actions security linting.
- Trivy for Docker image vulnerability scanning.

These checks do not replace manual review of browser automation behavior or release changes.

## Reporting

Report vulnerabilities using [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
