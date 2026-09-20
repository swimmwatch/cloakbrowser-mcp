---
render_macros: false
---

# Packet 02 — Process-Local Allocator And Typed HTTP Proxy

Status: Pending completed Packet 01 evidence and an explicit Packet 02 invocation.

## Outcome

Implement the process-local external port allocator and capability-first HTTP-only DevTools proxy with exact routes, authority checks, typed error responses, URL rewriting, timeouts, and buffer bounds. Keep it composition-testable and not yet exposed through MCP sessions.

Requirements: CDP-002, CDP-004, CDP-005, CDP-006, CDP-007, CDP-013, CDP-014.

## Pinned Inputs

- Source version: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.
- Specification version: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`.
- Review reference: `f008baec-bf84-4454-88db-dab9801e85df`.
- Required dependency evidence: Packet 01 complete in `todo.md` and current `handoff.md`.

Recheck the workflow state and repository evidence before editing.

## Prerequisite Evidence

- `src/http/nodeServer.ts:17-64` constructs the existing MCP HTTP/HTTPS server and listen/error boundary; managed CDP requires a separate session-owned plaintext listener.
- `src/http/server.ts:108-148` owns process HTTP-session cleanup; the proxy must remain independent and callback-driven.
- `src/http/sessionStore.ts:8-24` stores no CDP lease, matching the process-local runtime ownership requirement.
- `tests/integration/proxy.test.ts:31` is the existing MCP proxy suite; this packet needs a separate fake-Chromium boundary.
- Packet 01 supplies parsing, capability, authority, and URL primitives.

## Scope

Allowed production paths:

- `src/cdp/allocator.ts`
- `src/cdp/httpProxy.ts`
- `src/cdp/limits.ts`

Allowed test and fixture paths:

- `tests/unit/cdp-allocator.test.ts`
- `tests/unit/cdp-http-proxy.test.ts`
- `tests/integration/cdp-http-proxy.test.ts`
- `tests/fixtures/fake-chromium-cdp.ts`

Required planning updates: `tasks/todo.md`, `tasks/handoff.md`.

Non-goals: WebSocket relay, MCP/session wiring, TLS termination, browser bootstrap, generation replacement, public configuration, documentation, dependencies, commits, or publication.

## Planned Boundaries

- `CdpPortAllocator` owns synchronous process-local lease state. Selection is atomic and ascending among unleased candidates.
- `CdpPortLease` owns the already-bound listener. An operating-system collision or any other bind error fails immediately; it never scans later candidates. In-process exhaustion is a distinct error.
- `CdpHttpProxy` starts unavailable, then publishes one current generation/capability. It validates capability, route, method/body, request limits, Host, Origin, and readiness before any Chromium request.
- Accepted HTTP routes and methods are exactly those in CDP-005. Normalization must not create traversal, encoded-prefix, duplicate-slash, or alternate-path forms.
- Upstream requests always target the selected loopback Chromium endpoint with internal Host. Client forwarding headers never carry internal authority.
- Discovery/control responses rewrite only approved DevTools URL fields. Supported response headers are rebuilt rather than passed through.
- Bounds are: 16 pre-upgrade HTTP requests, 16 KiB request headers, no request body, 4 MiB buffered upstream body, 10-second request-header and upstream-response deadlines, and 8 KiB maximum error body.
- Accepted activity and diagnostic callbacks receive only event class and bounded counts, never capabilities, target IDs, URLs, headers, bodies, cookies, credentials, profiles, or upstream text.

### Stable HTTP failure contract

Every bridge-generated failure, normalized upstream non-success response, and failed upgrade before status 101 uses one UTF-8 JSON envelope: `{"error":{"code":"<code>","message":"<generic message>"}}`.

| Condition | Status | Code | Additional rule |
| --- | --- | --- | --- |
| Missing/malformed/wrong/expired/stale capability; unsupported path | 404 | `not_found` | Every variant is byte-indistinguishable |
| Unsupported method on a supported route | 405 | `method_not_allowed` | Exact route-specific `Allow` |
| Missing/malformed Host; malformed present Origin; malformed request/target/query | 400 | `bad_request` | No `Allow` |
| Request-header timeout | 408 | `request_timeout` | No `Retry-After` |
| Any non-empty request body | 413 | `payload_too_large` | Never forwarded |
| Request headers over the limit | 431 | `headers_too_large` | Never forwarded |
| Denied Host or present Origin authority | 403 | `forbidden` | Never forwarded |
| Not ready, generation unavailable, or request capacity exhausted | 503 | `unavailable` | No `Retry-After` |
| Valid upstream 4xx | Preserve status | `upstream_error` | Discard upstream body/headers |
| Upstream 3xx/5xx, disconnect, invalid response, or oversized response | 502 | `bad_gateway` | Discard upstream body/headers |
| Upstream HTTP response or WebSocket handshake timeout | 504 | `gateway_timeout` | No `Retry-After` |
| Unexpected bridge failure before response/upgrade | 500 | `internal_error` | Redacted fallback |

Every error has `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`, exact `Content-Length`, no unsupported upstream header, no protected data, and no `Retry-After`. Only 405 includes `Allow`.

## Test-First Execution

### RED

1. Add allocator concurrency tests for ascending selection, in-process exhaustion, immediate external collision, other bind failure, rollback, idempotent release, reuse, and stale capability rejection.
2. Add property tests for capability-prefixed route parsing, encoded separators, traversal, query preservation only where allowed, and exact method sets.
3. Add byte-exact table tests for every status/code/header/envelope row above, including equal not_found responses and exact `Allow` values.
4. Assert every locally rejected request produces zero fake-Chromium observations.
5. Add controlled upstream tests for 3xx, representative 4xx, 5xx, disconnect, malformed response, oversized response, timeout, and unexpected bridge failure.
6. Add discovery/control tests for approved URL and header rewriting under http/ws and https/wss advertisement while the listener/upstream remain plaintext.
7. Add exact 16/17 request, 16 KiB/+1 header, 4 MiB/+1 response, 10-second deadline, non-empty-body, and 8 KiB error-body boundaries.
8. Add unavailable/readiness tests proving no request forwards before generation publication.

### GREEN

Implement the allocator and HTTP proxy with Node `http`, `net`, and streams plus Packet 01 primitives. Centralize the error envelope/status/header policy so individual branches cannot drift. Keep clocks and timers injectable for deterministic tests. Do not add a generic server framework or persistence.

### PROVE

- Continue scanning after an external collision; confirm the selected-candidate assertion fails, then restore.
- Release an in-process lease before `server.close` completes; confirm the no-early-reuse race fails, then restore.
- Make one wrong capability response differ by one byte; confirm the not_found equivalence test fails, then restore.
- Preserve an upstream 4xx body; confirm redaction fails, then restore.
- Map request-header timeout to 504; confirm the typed error matrix fails, then restore.
- Omit `Allow` on one 405 or add it to another error; confirm exact-header tests fail, then restore.
- Accept a 4 MiB + 1 response; confirm the response-bound test fails, then restore.
- Rewrite an unrelated URL string; confirm byte-preservation fails, then restore.

## Focused Verification

From the repository root:

```bash
npx vitest run tests/unit/cdp-allocator.test.ts tests/unit/cdp-http-proxy.test.ts tests/integration/cdp-http-proxy.test.ts
npm run typecheck
npm run lint
npm run format:check
git diff --check
```

Expected evidence: rejected requests produce zero Chromium hits; every typed error branch is byte-checked; allocation attempts and cleanup are exact; no listener remains after disposal.

## Completion Boundary

Complete only after all RED, GREEN, PROVE, and focused checks pass. Update `todo.md`, replace `handoff.md`, and stop before WebSocket support or MCP integration.
