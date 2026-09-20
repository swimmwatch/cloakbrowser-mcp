# Session-scoped CDP access

Status: Approved

## Outcome

`cloakbrowser-mcp` can explicitly enable a Chrome DevTools Protocol (CDP)
endpoint for the Chromium browser currently owned by one MCP session. The
endpoint is an escape hatch for external low-level clients; it does not replace
or extend the deterministic upstream Playwright MCP tool surface.

A CDP-enabled session owns at most one live upstream Playwright MCP child at a
time, at most one active Chromium browser generation, one internal loopback CDP endpoint for that
generation, one bridge-managed external HTTP/WebSocket proxy, one external port
lease, and one unguessable capability URL. Repeated MCP requests and multiple
CDP client connections within that session reuse those resources. They are not
created per request or per CDP connection.

The feature is disabled unless the operator configures a port pool and the
effective CDP enablement is true. The process-level default is false; stdio
uses that value directly, while each Streamable HTTP session can override it
with `cdpEnabled: true` or `cdpEnabled: false`. The feature supports the
existing `cloak` and `playwright` browser engines, stdio and multi-session
Streamable HTTP, and direct Node package and Docker execution.

## Verified current constraints

The design is based on the pinned `@playwright/mcp@0.0.80` implementation:

- Connecting the bridge to the upstream MCP child does not launch Chromium.
  The upstream browser backend is created lazily on the first browser tool call.
- `browser_close`, a browser crash, or another backend disconnect clears the
  upstream backend. A later browser tool call can transparently create a new
  browser runtime inside the same upstream MCP child.
- That same-child recreation is verified upstream baseline behavior, not the managed
  CDP recovery contract. A CDP-enabled session MUST NOT rely on it after browser
  generation loss; CDP-009 instead requires cleanup of the old upstream child and
  verified readiness of a replacement child before any waiting browser tool is
  forwarded.
- Playwright adds its own `--remote-debugging-pipe` for internal automation.
  Managed CDP therefore adds a loopback TCP debugging endpoint; it does not
  replace Playwright's pipe.
- The stdio bridge owns one upstream child. The Streamable HTTP controller owns
  one independent upstream child per admitted MCP session.

The specification therefore distinguishes the MCP session lifetime from a
browser generation lifetime. It does not assume that one Chromium process
survives for the complete MCP session.

## Control-surface boundary

The existing Playwright MCP tools remain the structured surface for bounded,
schema-defined browser operations. The bridge MUST forward those tool contracts
without copying, rewriting, or adding CDP commands to them.

CDP is a separate lower-level HTTP/WebSocket control surface for clients that
need protocol domains, target events, instrumentation, or third-party
integrations not represented by MCP tools. CDP permits arbitrary commands and
asynchronous events. Callers, not the bridge, own coordination between
conflicting MCP and CDP operations.

The bridge performs a fixed lifecycle-only upstream bootstrap sequence to start
and authenticate the initial browser for a CDP-enabled session. Those calls are
not exposed as new tools and do not change any forwarded tool contract.

No new local MCP tool is added. `cloakbrowser_bridge_info` is extended to
describe the calling session's managed CDP endpoint and current browser
generation.

## Architecture ownership

```text
MCP session
  -> session-owned upstream Playwright MCP child
     -> zero or one active Chromium browser generation
        -> internal loopback CDP endpoint on an implementation-owned port
  -> session-owned bridge HTTP/WebSocket proxy
     -> external port bound from the configured process-local pool
     -> generation-specific capability path
     -> external CDP clients
```

For stdio, one bridge process has one MCP session. For Streamable HTTP, every
admitted MCP session owns an independent upstream child, optional active browser
generation, optional CDP proxy, and optional external port lease. The proxy can
run inside the outer bridge process; no separate proxy process is required.
Chromium can itself contain browser, renderer, GPU, and utility subprocesses.

Chromium's remote-debugging server remains loopback-only. The bridge MUST NOT
depend on `--remote-debugging-address` to expose it externally. All external
access passes through the session-owned proxy.

## Alternatives and decision

The managed proxy is selected after considering narrower options:

- Upstream `--caps devtools` already supplies Playwright MCP tracing tools. It
  covers tracing but not arbitrary CDP domains, raw events, or external CDP
  integrations.
- `browser_evaluate` and `browser_run_code_unsafe` cover JavaScript evaluation,
  but do not expose browser-level CDP domains or event streams.
- Existing raw Chromium argument passthrough plus an operator-owned tunnel can
  serve a controlled single-session setup. It provides no managed discovery,
  per-session isolation, port allocation, capability authentication, readiness,
  or cleanup guarantee, so it remains an unsupported compatibility path.
- A Playwright Server WebSocket gateway would support clients that call
  `chromium.connect()`, including the Open WebUI flow described in issue #134.
  It is a different protocol and lifecycle surface, substantially larger than
  CDP, and would violate the requirement to remain a thin Playwright MCP bridge.

The managed CDP proxy addresses CDP-capable scripts and clients such as
Playwright `chromium.connectOverCDP()`. It deliberately does not make the current
Open WebUI `chromium.connect()` integration compatible. This specification and the
operator documentation record that limitation. Updating issue #134 is delivery
communication outside this specification's acceptance criteria and requires separate
authorization.

## Requirements

### CDP-001: Explicit opt-in and configuration validation

#### Public configuration

The managed feature uses the bridge-specific `CLOAK_PLAYWRIGHT_MCP_*`
namespace:

For every CDP-specific setting, an explicitly supplied CLI option MUST override
the corresponding `CLOAK_PLAYWRIGHT_MCP_CDP_*` environment variable. The
negative boolean options defined below are explicit CLI `false` values and
therefore override environment `true`. When no CLI value is supplied, the
environment value applies; when both are absent, the documented default
applies. Precedence is resolved independently for each setting before
validating the resulting effective configuration. A shadowed lower-precedence
value MUST NOT make an otherwise valid effective configuration fail.
Streamable HTTP `cdpEnabled` metadata is then applied as a per-session override
of the effective process-level CDP enabled default.

- `--cdp-port-range <port|start-end>` /
  `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` configures a process-local external
  port pool. One integer denotes a one-port pool. Configuring a pool does not
  enable any session by itself.
- `--cdp-enabled` / `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true` sets the
  process-level CDP enabled default to true. The default is false. Stdio uses
  the effective process value directly; Streamable HTTP uses it only when a
  session omits `cdpEnabled` metadata.
- `--no-cdp-enabled` is an explicit CLI false value and overrides
  `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`.
- `--cdp-host <host>` / `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` configures the proxy bind
  host and defaults to `127.0.0.1`.
- `--cdp-allow-remote` / `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true` sets
  remote binding permission to true. It is required when the bind host is not
  loopback and defaults to false.
- `--no-cdp-allow-remote` is an explicit CLI false value and overrides
  `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
- `--cdp-advertised-host <host>` /
  `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` optionally replaces the host used
  in discovery output and does not replace the leased port. It is optional for a
  concrete bind host and REQUIRED when the bind host is `0.0.0.0` or `::`.
- `--cdp-advertised-scheme <http|https>` /
  `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` selects the scheme published in
  discovery and rewritten DevTools URLs. It defaults to `http`. Selecting
  `https` declares an operator-owned TLS terminator; it does not enable TLS on
  the bridge-owned listener or on the bridge-to-Chromium connection.


- Streamable HTTP initialize metadata under
  `io.github.swimmwatch/cloakbrowser-mcp` accepts the flat camelCase boolean
  `cdpEnabled`. When present, `true` or `false` overrides the effective
  process-level CDP enabled default for that session. When absent, the session
  inherits that default. The default remains false unless the operator
  explicitly enables it through CLI or environment. Only an already-authorized
  MCP initialize request can create a session.

An effective true value is invalid without a configured port pool. For stdio
or a process-level true default, this MUST fail process configuration before
the upstream child starts. A per-session metadata override to true with no
pool MUST reject only that HTTP session before its upstream child starts. An
effective false value creates no CDP listener, endpoint, lease, or capability.

Every ready browser generation receives a cryptographically random capability
path. With the default advertised scheme, a representative discovery URL is
`http://127.0.0.1:9222/cdp/<capability>`. The selected scheme applies to the
discovery URL and determines whether rewritten WebSocket URLs use `ws` or
`wss`. The capability is part of the
connection credential and MUST be replaced whenever the browser generation or
owning MCP session changes.

The bridge MUST consume and remove all `CLOAK_PLAYWRIGHT_MCP_CDP_*` variables
before creating the upstream child environment. These bridge-owned settings
MUST NOT leak into `@playwright/mcp`.

For Docker, NAT, or a reverse proxy, the operator MUST preserve a one-to-one
mapping between each leased external port and the advertised CDP URL.

Managed CDP MUST remain disabled unless a port pool is configured and the
effective CDP enabled value is true. The process-level default is false.
Stdio uses the effective process value directly. A Streamable HTTP session
uses its flat boolean `cdpEnabled` metadata when present and otherwise
inherits the effective process value. Configuring a port pool alone does not
enable CDP.

CDP host values MUST be non-empty and valid for their documented role. An
advertised host MUST contain no scheme, path, query, fragment, credentials, or
port. IPv6 formatting in returned URLs MUST be unambiguous. A wildcard bind host
such as `0.0.0.0` or `::` requires an advertised host; the configuration MUST
fail before any listener or upstream child is created when it is missing. A
wildcard bind host MUST never be emitted as a connectable URL.

The advertised scheme MUST be exactly `http` or `https` and MUST default to
`http` when unset. Empty, differently cased, or otherwise unsupported values
MUST fail validation before any listener, port lease, or upstream child is
created. Selecting `https` changes only published external URLs. The
bridge-owned proxy listener and its connection to Chromium remain plaintext
HTTP/WebSocket. The operator MUST provide TLS termination at the advertised
host and the same advertised leased port, with one-to-one port mapping to the
session proxy. The bridge does not provision or validate that terminator.

Supplying both the positive and negative form of the same boolean option in
one invocation MUST fail as a conflicting CLI configuration. Either negative
option alone is a valid explicit CLI false and MUST override environment true.

For each browser generation, the bridge MUST generate at least 256 bits of
cryptographically secure randomness, encode it safely as one URL path segment,
and compare presented capabilities without data-dependent early exit. Missing,
malformed, expired, or incorrect capabilities MUST be rejected before any
request reaches Chromium.

Non-loopback binding MUST fail unless the separate remote opt-in is enabled.
The first version provides no built-in TLS. Enabling remote access MUST produce
an operator-visible stderr warning that identifies an unencrypted privileged
control surface and recommends a secured TLS reverse proxy or isolated network,
without exposing the capability or browser state.

#### Acceptance

- CLI, environment, and metadata parsing accept documented values and reject
  invalid combinations before launching the upstream child.
- CLI values override the corresponding CDP environment values per setting;
  environment values apply only when the CLI setting is absent, and only the
  resulting effective configuration is validated.
- `--no-cdp-enabled` and `--no-cdp-allow-remote` override corresponding
  environment true values; supplying both positive and negative CLI forms
  fails validation.
- An unset advertised scheme publishes `http` and `ws`; `https` publishes
  `https` and `wss`; invalid scheme values fail before resource allocation.
- Selecting `https` does not create a TLS listener or alter the plaintext
  bridge-to-Chromium connection.
- Configuring only a port range creates no CDP proxy, internal endpoint, port
  lease, or capability.
- Stdio follows the effective process-level enabled value. Each HTTP session
  overrides that value with `cdpEnabled: true` or `cdpEnabled: false` when
  metadata is present and otherwise inherits it.
- Loopback binding needs no remote opt-in; wildcard, private, public, and other
  non-loopback binds do.
- Wildcard binding without an advertised host fails validation before any
  listener, port lease, or upstream child is created.

- A wrong or stale capability receives a bounded rejection and cannot reach the
  internal endpoint.

### CDP-002: Session isolation and browser generations

Every CDP-enabled MCP session MUST own exactly one upstream Playwright MCP
child, one external proxy, and one external port lease. It MUST own at most one
active Chromium browser generation and one internal CDP endpoint at a time.

The initial generation is started during session admission as defined by
CDP-003. After `browser_close`, a crash, or another upstream disconnect, the
upstream MCP child can create a replacement browser on a later browser tool
call. The bridge MUST treat the replacement as a new generation, not as
continuation of the previous endpoint.

Within one ready generation, the CDP endpoint MUST expose the same browser
runtime controlled by MCP tools: the same contexts, pages, cookies, storage,
configured proxy, fingerprint, extensions, and persistent or isolated profile
semantics. The implementation MUST NOT launch a second browser solely for CDP.

MCP requests and supported concurrent CDP client connections reuse the active
generation. A new MCP session MUST NOT attach to another session's browser,
proxy, port lease, or capability.

#### Acceptance

- Two simultaneous HTTP sessions receive different bound ports, capabilities,
  upstream children, and Chromium runtimes; page, cookie, and storage changes
  in one are absent from the other.
- A page created or mutated through MCP is observable through that generation's
  CDP endpoint and vice versa.
- Multiple CDP clients can connect to one generation without creating another
  upstream child, browser runtime, proxy, or port lease.
- `browser_close` followed by another browser tool produces a new generation
  and capability, while the old capability remains invalid.
- Stdio has one session-scoped endpoint and introduces no HTTP-style session
  registry.

### CDP-003: Browser bootstrap and internal endpoint

Before connecting the session's upstream Playwright MCP child, the bridge MUST
add a distinct internal loopback `--remote-debugging-port` to the generated
browser launch arguments. This TCP endpoint is additional to Playwright's own
internally managed `--remote-debugging-pipe`; the bridge MUST NOT remove,
replace, or inject the pipe itself.

After the upstream MCP client is connected but before downstream MCP
initialization succeeds, the bridge MUST call the upstream `browser_tabs` tool
with `{ "action": "list" }`. The response is discarded. This lifecycle call
forces the upstream lazy backend to create the initial browser and context. It
can create the normal initial blank page and makes a CDP-enabled initialize pay
the full browser startup cost even if the caller never invokes another browser
tool. Documentation MUST state that cost.

The bridge MUST then prove that the discovered internal endpoint belongs to the
same browser controlled by upstream MCP. It MUST generate a one-use random
challenge, place it temporarily in the current page through the upstream
`browser_evaluate` tool, read and delete it through that page's CDP target, and
accept the endpoint only when the exact challenge matches. Challenge values and
property names MUST meet the capability randomness and redaction rules. A
successful or failed proof MUST leave no challenge value in the page.

The internal endpoint MUST never bind a non-loopback interface, be advertised
to clients, or consume the public port pool. The browser launch MUST preserve
Playwright MCP's existing isolated and persistent profile behavior. Chrome 136's
non-default user-data-directory rule is rationale for preserving that behavior,
not a requirement to add another profile mode.

The bridge MUST NOT add `--remote-allow-origins=*`. To select the internal port,
the bridge MUST bind loopback port `0`, retain that listener while it writes the
configuration and connects the lazy upstream child, then close the reservation
immediately before the bootstrap call that launches Chromium. If Chromium does
not bind the selected port or the ownership challenge fails, admission fails;
the bridge MUST NOT proxy whichever process answered there. This closes the
ordinary allocation race and fails closed for the unavoidable release-to-launch
window.

The `cloak` launch-options round trip MUST be proven to preserve the managed
remote-debugging port; the specification does not assume that the CloakBrowser
SDK forwards it unchanged.

#### Acceptance

- A CDP-enabled initialize performs one `browser_tabs(action=list)` bootstrap
  and one challenge placement; a non-CDP initialize performs neither.
- The endpoint becomes ready only after the one-use MCP-to-CDP challenge matches
  and has been removed from the page.
- Process and socket inspection shows Chromium CDP listening only on loopback
  and the external proxy listening separately on a leased port.
- Both `cloak` and `playwright` engines preserve the managed port argument and
  reach initial CDP readiness for isolated and configured persistent profiles.
- An occupied or substituted internal endpoint cannot make the bridge proxy an
  unrelated browser.
- The temporary internal-port reservation remains bound until immediately
  before browser bootstrap and is released on every success or failure path.
- Browser launch arguments contain neither a managed non-loopback debugging
  address nor a wildcard remote-origin allowance, and retain Playwright's own
  debugging pipe.

### CDP-004: Process-local external port leasing

The bridge MUST maintain one process-local allocator for the configured external
pool. Concurrent admissions MUST reserve candidates atomically within the
process. The allocator MUST inspect candidates in ascending order and skip only
ports already leased by another session in the same process. For the first
candidate without an in-process lease, the proxy MUST attempt the actual
operating-system bind; the bound listener is the reservation and avoids a
separate probe-and-bind time-of-check/time-of-use race.

An operating-system `EADDRINUSE` or equivalent external collision on that
candidate MUST fail this session admission immediately. The allocator MUST NOT
scan later candidates after an external collision. Any other bind error also
fails the session admission. If every candidate is already leased in-process,
the allocator returns a distinct actionable pool-exhaustion error.

The listener and lease remain owned until session cleanup has closed active CDP
connections and the proxy. Failed initialization releases every provisional
resource. A later session can reuse the released port, but receives a new random
capability so a stale URL cannot reach the later session.

#### Acceptance

- Concurrent admissions in one process cannot bind the same port.
- Managed sessions prefer available ports in ascending order while non-CDP
  sessions consume none.
- If the selected candidate is occupied by another process, allocation fails
  immediately without attempting a later candidate.
- An external collision and in-process full-pool exhaustion return distinct,
  actionable errors without disturbing active sessions.
- After complete cleanup, a later session can reuse the released port, but the
  previous capability is rejected.

### CDP-005: Capability-routed HTTP/WebSocket proxy

Every CDP-enabled session MUST expose a bridge-owned HTTP/WebSocket-aware reverse
proxy on its leased port. A transparent TCP forwarder is insufficient. Every
accepted route begins with `/cdp/<capability>/`; the proxy strips that prefix
before forwarding to Chromium.

The first version supports only the standard DevTools surface required for
discovery and control:

- `GET /json/version` and `/json/version/`;
- `GET /json` and `/json/list`;
- `GET /json/protocol`;
- `PUT /json/new` with its optional target URL query;
- `GET /json/activate/<target-id>` and `/json/close/<target-id>`;
- WebSocket upgrades for `/devtools/browser/<id>` and
  `/devtools/page/<id>`.

The external forms contain the capability prefix. Unsupported methods and paths
MUST be rejected rather than forwarded. The proxy MUST reject request bodies on
these HTTP routes.

Every bridge-generated HTTP failure, normalized upstream non-success response,
and failed WebSocket upgrade before status `101` MUST use the following stable
contract:

| Condition | Status | Error code | Required headers |
| --- | --- | --- | --- |
| Missing, malformed, wrong, expired, or stale capability; unsupported path | `404` | `not_found` | common headers |
| Unsupported method on a supported route | `405` | `method_not_allowed` | common headers and route-specific `Allow` |
| Missing or malformed `Host`; malformed present `Origin`; malformed supported request, target identifier, or query | `400` | `bad_request` | common headers |
| Request-header timeout | `408` | `request_timeout` | common headers |
| Any non-empty HTTP request body | `413` | `payload_too_large` | common headers |
| Request headers over the CDP-013 limit | `431` | `headers_too_large` | common headers |
| `Host` or present `Origin` authority denied by CDP-006 | `403` | `forbidden` | common headers |
| Proxy not ready, browser generation unavailable, or pre-upgrade/request capacity exhausted | `503` | `unavailable` | common headers |
| Valid upstream `400..499` response | preserve upstream status | `upstream_error` | common headers |
| Valid upstream `300..399` or `500..599` response; upstream disconnect, invalid response, or response over the CDP-013 limit | `502` | `bad_gateway` | common headers |
| Upstream HTTP response or WebSocket handshake timeout | `504` | `gateway_timeout` | common headers |
| Unexpected bridge failure before a response or upgrade | `500` | `internal_error` | common headers |

The common headers are `Content-Type: application/json; charset=utf-8` and
`Cache-Control: no-store`; `Content-Length` MUST match the encoded body. The
body MUST be a single UTF-8 JSON object shaped as
`{"error":{"code":"<code>","message":"<generic message>"}}` and remain within
the CDP-013 error-body limit. The bridge MUST NOT forward upstream error bodies
or headers into this envelope. A valid upstream `400..499` status is preserved
only after the capability, route, Host, and Origin checks pass. Upstream
`300..399` and `500..599` responses are normalized to `502`.

All `404 not_found` cases MUST use the same status, headers, code, message, and
body shape so the response does not act as a capability-validity oracle. `405`
responses MUST list exactly the supported method or methods for that route in
`Allow`. Other error responses MUST omit `Allow`, and no response promises a
retry delay through `Retry-After`.

The bridge MUST dispatch each accepted HTTP discovery or control request to Chromium
at most once and MUST NOT automatically retry it after an upstream timeout,
disconnect, invalid response, or other ambiguous failure. Client retries follow this
contract:

- `GET /json/version`, `GET /json/version/`, `GET /json`, `GET /json/list`, and
  `GET /json/protocol` are read-only discovery operations. A client MAY retry them
  after a failure while the capability remains current.
- `PUT /json/new`, `GET /json/activate/<target-id>`, and
  `GET /json/close/<target-id>` are state-changing operations regardless of their
  HTTP method. If the client does not receive a complete success response after the
  request may have reached Chromium, the outcome is ambiguous and the client MUST
  NOT automatically retry it.
- Before deciding whether to issue another state-changing request, a client SHOULD
  retrieve a fresh `GET /json/list` view and apply application-specific
  reconciliation. For `PUT /json/new`, a matching URL is not proof of request
  identity, duplicate targets remain possible, and the proxy provides no idempotency
  key, deduplication, or compensation mechanism.
- A bridge-generated rejection guaranteed to occur before upstream dispatch has no
  Chromium side effect. A client MAY retry only after correcting the reported
  condition; the bridge still does not retry on the client's behalf.

After capability and security validation, the proxy MUST preserve the allowed
HTTP operations and bidirectionally relay browser- and target-level WebSocket
connections, including text and binary messages, close codes, backpressure, and
disconnects.

The proxy MUST rewrite every authority-bearing DevTools value to the current
advertised external authority and generation-specific capability path. This
includes `webSocketDebuggerUrl` and the embedded `ws=` or equivalent authority
inside `devtoolsFrontendUrl`. Target page URLs and unrelated payload strings
MUST NOT be rewritten. Response headers and supported discovery/control bodies
MUST NOT expose the internal port or an unprefixed internal DevTools URL.

All advertised HTTP URLs MUST use the configured advertised scheme. Rewritten
WebSocket URLs MUST use `ws` when the advertised scheme is `http` and `wss`
when it is `https`. Scheme rewriting MUST NOT alter upstream transport: proxy
HTTP requests and WebSocket handshakes to Chromium remain plaintext on the
internal loopback endpoint.

Upstream HTTP requests MUST use the selected loopback `Host`. Upstream WebSocket
handshakes MUST omit `Origin`. Client-supplied forwarding headers MUST NOT
override the internal authority. The proxy MUST NOT add unrelated `cloakserve`
endpoints.

#### Acceptance

- Every listed path works only below the current capability prefix; unsupported
  paths and methods fail locally.
- Local HTTP and pre-upgrade failures use the specified status, common headers,
  error code, bounded JSON envelope, and `Allow` behavior without leaking
  upstream data or capability validity.
- `/json/version`, `/json`, and `/json/list` contain usable external WebSocket
  URLs, and `devtoolsFrontendUrl` values contain no internal authority.
- URL rewriting publishes a consistent `http`/`ws` or `https`/`wss` pair while
  the loopback Chromium endpoint remains plaintext.
- Playwright `chromium.connectOverCDP()` works with the advertised capability
  HTTP URL, including its automatic `json/version/` suffix.
- Browser- and page-target CDP traffic remains bidirectional under concurrent
  messages and permitted maximum-size frames without unbounded buffering.
- Closing either side closes its paired connection without terminating other
  clients or the owning MCP session.

- Each accepted HTTP operation is dispatched upstream at most once. Fault injection
  after Chromium receives a state-changing request proves the bridge does not retry
  it, reports the ambiguous failure, and permits a later explicit discovery request
  for reconciliation without claiming request identity or duplicate prevention.
- Read-only discovery retries do not create or mutate targets, while documentation and
  client examples never automatically retry `json/new`, `json/activate`, or
  `json/close` after an ambiguous outcome.

### CDP-006: Capability, Host, and Origin policy

Capability validation is the session authentication boundary for the managed
CDP proxy. It applies to HTTP requests and WebSocket upgrades before route,
Host, Origin, or upstream handling can disclose session state.

After capability validation, the incoming `Host` MUST match the session's
advertised authority when an advertised host is configured; otherwise it MUST
match the concrete non-wildcard bind authority. A wildcard bind is valid only
with the advertised authority required by CDP-001. Missing, malformed,
mismatched, or wildcard authorities MUST be rejected before forwarding.

The advertised scheme MUST NOT widen or replace this authority check. For both
`http` and `https`, the allowed authority is the selected advertised host, or
the concrete bind host when no advertised host is configured, plus the leased
external port. An operator-owned TLS terminator MUST preserve that `Host`
authority when forwarding to the plaintext bridge listener.



WebSocket requests without `Origin` MUST be accepted for non-browser CDP clients
after capability and Host validation. When `Origin` is present, its authority
MUST match an allowed external endpoint authority. The bridge MUST NOT silently
convert an arbitrary incoming Origin into an allowed upstream Origin.

Origin matching remains authority-based for both advertised schemes. A TLS
terminator used with `https` MUST preserve an allowed Origin authority; scheme
selection MUST NOT permit a different host or port.

Hosted DevTools from an unrelated web origin is not directly supported in this
version. An operator can place a separately secured same-origin TLS reverse
proxy in front of the endpoint. The capability URL MUST be treated as a secret,
redacted from logs, and never included in error text.

#### Acceptance

- A valid capability plus an accepted loopback or advertised authority works
  for HTTP and WebSocket clients.
- `http` and `https` configurations enforce the same host-and-port authority;
  an `https` endpoint succeeds only through an operator-owned TLS terminator
  that forwards the expected authority to the plaintext bridge listener.
- Missing, wrong, expired, and previous-generation capabilities never reach
  Chromium and receive the indistinguishable CDP-005 `404 not_found` contract.
- DNS-rebinding-style Host values and cross-origin browser WebSocket attempts
  never reach Chromium.
- Missing or malformed `Host` and malformed present `Origin` use the CDP-005
  `400 bad_request` contract; authority-policy mismatches use `403 forbidden`.
- Programmatic clients that omit Origin continue to work.
- Rejection diagnostics disclose no capability, internal port, target ID,
  cookie, page URL, or credential.

### CDP-007: Initial readiness and failure

A CDP-enabled MCP session admission MUST complete within 60 seconds. Success is
returned only after all of the following are true:

1. the external port is bound by the session proxy;
2. the upstream child has completed the fixed browser bootstrap call;
3. the internal loopback CDP endpoint responds and passes the one-use
   MCP-to-CDP ownership challenge for the initial browser generation;
4. the capability-routed external `/json/version/` responds with a usable,
   rewritten `webSocketDebuggerUrl`.

The deadline starts when CDP-enabled session admission begins and includes
upstream connection, browser launch, internal discovery, and external readiness.
Operator documentation MUST tell MCP clients to allow at least that initialize
timeout.

Before readiness, the bound proxy MUST NOT forward client traffic or advertise
an endpoint. It MUST return the CDP-005 `503 unavailable` contract. Any timeout,
bootstrap failure, early browser exit, internal discovery error, proxy bind
failure, or invalid discovery response MUST fail the new session and clean up
all partially created resources. Successful initialize requires no readiness
polling for the initial generation.

Replacement generations are governed by CDP-008 and CDP-009; they do not repeat
downstream MCP initialization.

#### Acceptance

- Successful initialize is immediately followed by successful discovery and a
  WebSocket connection without polling.
- A deliberately slow or hung bootstrap fails at the 60-second bound.
- Injected failures at every startup phase leave no active MCP session, listener,
  upstream child, browser, temporary resource, capability, or retained lease.
- One failing HTTP admission does not stop or reassign another active session.

### CDP-008: Session discovery and generation state

`cloakbrowser_bridge_info` MUST preserve its current fields and add a `cdp`
object to `structuredContent`. Its registered `outputSchema` MUST describe the
complete existing result plus the additive `cdp` object.

When managed CDP is disabled, the object is:

```json
{ "enabled": false }
```

When the active generation is ready, it contains:

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

After the browser disconnects and before a replacement is ready, `state` is
`unavailable`, `discoveryUrl` is null, `activeConnections` is zero, and
`generation` remains the last issued positive integer. When the upstream
creates a replacement browser and its CDP endpoint passes readiness,
`generation` increments and `discoveryUrl` contains a newly generated
capability.

`advertisedHost` is null only when no advertised host is configured and the
bind host is concrete. In the `ready` state, `discoveryUrl` MUST be non-null,
use the configured advertised scheme, and use the advertised host when present
or otherwise the concrete non-wildcard bind host. Wildcard bind without an
advertised host is rejected during configuration by CDP-001. `port` always
denotes the leased external proxy port. The selected scheme is carried by
`discoveryUrl`; no separate scheme field is added.

The tool MUST NOT expose the internal endpoint, the raw capability separately
from its URL, or Chromium browser/target WebSocket identifiers. The discovery
URL is a credential even though the local MCP tool is read-only.

#### Acceptance

- Calls from different HTTP sessions return their own state, generation, port,
  capability URL, and connection count.
- `browser_close` or a crash changes `ready` to `unavailable`; a later upstream
  relaunch produces a larger generation and a different capability URL.
- Wildcard bind without an advertised host is rejected before admission; a
  ready result always has a concrete, connectable `discoveryUrl`.

- IPv4, IPv6, hostname, and capability path formatting are valid and
  deterministic except for the required random capability.
- The local tool count and names remain unchanged, and returned
  `structuredContent` validates against its declared output schema.

### CDP-009: Lifecycle and browser replacement

The MCP session remains the owner of the proxy and external lease. A normal CDP
client disconnect MUST NOT close the browser, proxy, or MCP session.

The proxy MUST compare the internal browser WebSocket identity returned by
`/json/version/` with the identity stored for the ready generation before every
new HTTP forward or WebSocket upgrade. An identity change or failed probe marks
the generation unavailable before client traffic is forwarded. The bridge MUST
also re-evaluate liveness after `browser_close`, after a proxied connection
reports browser loss, before returning `cloakbrowser_bridge_info`, and after an
upstream browser tool succeeds while CDP is unavailable. Continuous background
polling is not required.

The supported MCP `browser_close` tool, an external raw CDP `Browser.close`
command, a crash, or another upstream backend disconnect can terminate the
active browser generation. The bridge MUST detect that loss, stop accepting the
generation's capability, close its proxied sockets, set discovery state to
`unavailable`, and retain the owning MCP session's external listener and lease.

The bridge MUST NOT restart the upstream child or launch a replacement merely
because CDP was lost. The first subsequent upstream `browser_*` tool call MUST
start one lazy, session-scoped restart before that requested tool is forwarded.
Concurrent browser-tool calls arriving while restart is in progress MUST share
that single restart attempt; the bridge MUST NOT create overlapping replacement
children or independently retry those calls.

The restart MUST first make the old upstream child and browser runtime
unreachable, dispose or forcibly terminate their owned resources within a
bounded cleanup, and then create a replacement child with the same MCP-session
configuration and profile ownership. The session retains its external proxy
listener and port lease. The replacement uses a newly reserved internal
loopback endpoint, performs the normal browser bootstrap and ownership
challenge, rotates the capability, and publishes a new generation only after
readiness succeeds. An old capability or still-open connection MUST never move
silently to the new child or generation.

After a successful restart, each waiting browser-tool request MUST be forwarded
to the replacement upstream exactly once under the existing upstream contract.
The bridge MUST NOT first forward a request to the known-lost child and then
retry it. Local tools, tool listing, discovery reads, and ordinary CDP client
disconnects MUST NOT trigger restart. A restart attempt MUST complete within the
same 60-second readiness bound as CDP-007.

If restart fails before the requested tool is forwarded, that request MUST fail
through the existing MCP request-failure surface with a bounded, redacted
bridge-owned diagnostic; the bridge MUST NOT synthesize or rewrite an upstream
browser-tool result. The CDP state remains `unavailable`, no capability is
published, all provisional child, browser, internal-endpoint, and socket
resources are closed, and a later browser-tool call MAY start one new bounded
restart attempt. There is no automatic background retry loop.

After restart readiness succeeds and the new generation is published, the bridge
MUST forward each waiting browser-tool request exactly once and return its upstream
success or failure unchanged. There is no second identity, challenge, or readiness
phase after the tool is forwarded. If execution of the forwarded tool itself causes
browser loss, CDP-008 invalidates that generation and its capability as a new loss;
the bridge MUST NOT retry the tool or claim that the generation survived. Otherwise,
the verified CDP generation remains active regardless of whether the tool result is a
success or an upstream failure.



Closing or expiring the MCP session MUST stop admission, invalidate the
capability, close active proxied sockets, dispose the upstream child and browser,
release temporary resources, close the external listener, and only then release
the external port lease.

#### Acceptance

- Repeated ordinary CDP connect/disconnect cycles leave MCP browser operations
  usable and do not change the generation.
- MCP `browser_close`, raw CDP `Browser.close`, and an injected crash invalidate
  the current capability and disconnect its clients.
- A changed internal browser identity is rejected before forwarding, and a
  later MCP browser tool can create a challenge-verified new generation; old
  URLs never attach to it.
- Browser loss alone creates no child. The first later browser-tool call starts
  one shared restart, is forwarded exactly once only after restart readiness,
  and concurrent calls do not create overlapping children.
- A restart failure leaves the MCP session and external lease alive, forwards
  none of the waiting browser-tool requests, exposes no capability, and permits
  one new bounded attempt on a later browser-tool call.
- Restart retains the owning session's effective configuration and profile
  ownership but does not promise restoration of tabs, page state, in-memory
  storage, or other state lost with the terminated browser generation.
- After restart readiness, each waiting browser tool returns its upstream success or
  failure unchanged with no second readiness phase. A tool-caused browser loss
  invalidates the just-published generation without retrying that tool; a tool result
  that leaves the browser alive also leaves the verified generation active.
- MCP DELETE, idle expiry, stdio shutdown, signals, and startup rollback close
  proxy connections and release the correct port exactly once.
- Shutdown races cannot admit a new connection or release a port while an old
  proxied connection can still reach Chromium.

### CDP-010: Concurrent MCP and CDP control

MCP and CDP clients MAY operate concurrently on the same active browser
generation. The bridge MUST NOT serialize arbitrary browser commands, infer
intent, or add a cross-protocol transaction or locking API. Callers own ordering
for operations that can conflict. Independent observations and non-conflicting
operations MUST remain usable.

The bridge MUST preserve Chromium CDP events and command responses without
translating them into MCP events or tool results. It MUST expose only the number
of active proxied WebSocket connections through `cloakbrowser_bridge_info`, so
an MCP caller can diagnose unexpected concurrent control without seeing client
identities or protocol content.

#### Acceptance

- A CDP event subscriber observes navigation and target creation initiated by
  MCP.
- Non-conflicting concurrent MCP and CDP reads complete without global or
  cross-session blocking.
- The reported connection count increases and decreases with accepted
  WebSockets without exposing target IDs.
- Tests document that conflicting navigation, page closure, input, and storage
  mutations have caller-controlled outcomes rather than a bridge guarantee.

### CDP-011: Raw Chromium argument compatibility

When managed CDP is effectively enabled for a session, configuration MUST reject
user-supplied `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` entries for
`--remote-debugging-port`, `--remote-debugging-address`, and
`--remote-debugging-pipe`, including assignment variants, before browser launch.
The bridge MUST NOT silently override or duplicate them.

This validation applies only to user-supplied raw arguments. Playwright's own
internally appended `--remote-debugging-pipe` remains present, and the managed
loopback TCP port coexists with it. The implementation MUST NOT attempt to
switch Playwright MCP from its pipe to the managed endpoint.

Without explicit managed CDP enablement, existing raw argument passthrough
remains unchanged. Such unmanaged endpoints receive no allocation, proxy,
capability, validation, readiness, lifecycle, or discovery guarantee and are
reported as managed CDP disabled.

#### Acceptance

- Explicit enablement plus a conflicting raw port, address, or pipe flag fails
  with the offending flag name without dumping other environment values.
- Raw flags without explicit managed enablement reach the existing launch path
  exactly as before.
- Real-browser launch checks prove the managed port survives both `cloak` and
  `playwright` launch-option paths while Playwright's pipe remains present.
- Bridge-owned CDP environment variables are absent from the upstream child.

### CDP-012: Platform, capacity, and protocol compatibility

The feature MUST work in direct Node package execution and published Docker
`linux/amd64` and `linux/arm64` images, with both `cloak` and `playwright`
engines and both MCP transports.

Non-CDP sessions MUST preserve existing Streamable HTTP capacity,
authentication, TLS, idle cleanup, and health behavior. The port pool limits
only concurrently CDP-enabled sessions; an exhausted pool rejects a new
CDP-enabled admission but MUST NOT consume or reduce slots available to later
non-CDP sessions.

The implementation MUST NOT mutate upstream Playwright MCP browser tool schemas,
add a Playwright Server protocol gateway, or claim CDP satisfies clients that
expect Playwright `chromium.connect()`.

#### Acceptance

- Existing bridge parity, unit, integration, packaged CLI, and Docker checks
  pass without weakened assertions.
- Explicit CDP discovery works in Node and Docker while an otherwise identical
  session without opt-in exposes nothing and consumes no port.
- Pool exhaustion rejects only the CDP-enabled admission and does not lower the
  configured MCP `sessionMax` for non-CDP sessions.
- The current Open WebUI `chromium.connect(PLAYWRIGHT_WS_URL)` flow is documented
  as unsupported; CDP-capable clients use `connectOverCDP` or an equivalent CDP
  connection API.

### CDP-013: Resource limits, logging, and operational safety

Runtime logs and proxy diagnostics MUST remain off stdout. Errors and warnings
go to stderr through the existing redaction policy. Normal operation MUST NOT
log capability paths, full discovery documents, WebSocket target IDs, CDP
payloads, cookies, page contents, proxy credentials, or profile paths.

The initial version provides no persistent or per-request security audit trail.
Successful capability, `Host`, and `Origin` validation MUST NOT create a request-level
log entry. Rejections MUST update saturating unsigned 32-bit counters scoped to the
owning session and grouped only as `capability`, `host`, or `origin`. At most once per
60-second window per session, if any counter changed, the runtime MUST emit one
aggregate warning and reset the emitted counters. Session cleanup MUST emit one final
aggregate warning when unreported counts remain. An aggregate warning MAY contain
only the fixed event name `cdp_security_rejections`, window duration, and the three
coarse counts, in addition
to timestamp and severity supplied by the existing logger. It MUST NOT contain source
addresses, capabilities, raw `Host` or `Origin` values, paths, queries, target IDs,
headers, bodies, or browser data. Repeated probes therefore remain observable as a
bounded aggregate without producing one stderr record per request.

The initial implementation uses these fixed, documented limits per session:

- at most 8 active proxied WebSocket connections;
- at most 16 concurrent pre-upgrade HTTP requests;
- at most 16 KiB of request headers;
- no request body on supported HTTP routes;
- at most 4 MiB for a buffered Chromium discovery/control HTTP response;
- at most 16 MiB per inbound or outbound WebSocket message and 16 MiB of queued
  unsent data per direction;
- 10 seconds for request headers, an HTTP upstream response, or a WebSocket
  handshake;
- 5 seconds for graceful proxy shutdown before sockets are forcibly closed;
- error response bodies no larger than 8 KiB.

Backpressure MUST pause the producing side before the queue limit and close only
the offending connection if the bound would be exceeded. A successfully
upgraded WebSocket has no separate application idle timeout because CDP event
subscribers can legitimately be quiet. In Streamable HTTP mode, accepted CDP
requests and frames update the owning session's existing last-activity time;
silent sockets do not, and close when the MCP session expires. In stdio mode,
the process lifetime bounds them.

A locally generated post-upgrade WebSocket close MUST use a fixed code and
reason: `1001` / `going_away` for session, generation, or proxy lifecycle
shutdown; `1002` / `protocol_error` for malformed WebSocket protocol input;
`1009` / `message_too_big` for a message over the frame limit; `1011` /
`internal_error` for an upstream disconnect without a valid peer close or an
unexpected relay failure; and `1013` / `try_again_later` when the unsent queue
limit is exceeded. Fixed reasons MUST be at most 123 UTF-8 bytes and MUST NOT
contain a capability, authority, target ID, upstream reason, or browser data.
A valid peer-provided close continues to be relayed as required by CDP-005.

Slow or malformed CDP clients MUST NOT block MCP processing, allocator progress,
other sessions, or cleanup.

Upstream-child restart is single-flight per MCP session. Its 60-second bound
includes old-child cleanup, replacement connection, browser bootstrap, ownership
proof, and external readiness. Session shutdown or expiry MUST cancel and win
against an in-flight restart, leave no replacement child behind, and preserve
the close-before-port-release ordering.

#### Acceptance

- Stdio stdout contains only MCP protocol messages under successful, rejected,
  and failed CDP connections.
- Remote opt-in, allocation, and readiness diagnostics are actionable and
  contain no protected runtime data.
- Tests hit every numeric boundary and prove that one excess request, connection,
  header, response, frame, queue, or timeout has only session-local effects.
- HTTP and pre-upgrade limit failures use the CDP-005 typed error contract;
  post-upgrade WebSocket limits close only the offending connection.
- Tests cover every locally generated WebSocket close code and fixed reason,
  verify peer-close relay separately, and prove no protected value is exposed.
- A silent HTTP-session WebSocket is closed by normal session expiry, while
  valid CDP traffic refreshes last activity.
- Connection counts remain accurate after malformed upgrades, oversized frames,
  abrupt disconnects, generation loss, and shutdown.
- Restart timeout, cleanup failure, concurrent browser-tool admission, and
  shutdown races produce bounded redacted diagnostics, at most one replacement
  child, no forwarded tool before readiness, and no leaked provisional resource.

- Successful security checks produce no request-level audit record; 10,000 rejected
  capability, `Host`, or `Origin` probes within one window produce one aggregate
  warning per affected session, plus at most one final cleanup warning for later
  unreported counts, with correct saturating counts and no protected value.

### CDP-014: Verification coverage

Automated coverage MUST include parsing precedence, allocator concurrency,
capability routing and rotation, advertised-scheme validation, proxy URL
rewriting, Host/Origin policy, readiness failures, discovery state,
lifecycle generations, resource limits, and real-browser state sharing.
deterministic MCP proxy behavior but is not sufficient evidence for Chromium or
the CDP boundary.

The test matrix is tiered to avoid multiplying every dimension:

- Unit and property tests cover every parser, advertised HTTP/WebSocket
  scheme pairing, URL formatter, allocator invariant,
  token rejection class, state transition, and numeric resource bound.
  They cover positive/negative boolean conflicts, CLI-over-environment false,
  process-default inheritance, and both per-session metadata overrides.
- Fake-upstream integration tests cover both transports, simultaneous HTTP
  sessions, explicit opt-in and opt-out, immediate failure on an externally
  occupied candidate, in-process exhaustion, release and reuse, startup
  rollback, generation rotation, restart-readiness failure before forwarding,
  post-readiness upstream tool success and failure, tool-caused browser loss, and
  shutdown with active WebSockets.
  The HTTP matrix includes global false plus metadata true, global true plus
  absent metadata, and global true plus metadata false.
- Restart-specific fake-upstream coverage proves no eager restart on loss, one
  single-flight restart for concurrent browser tools, no request forwarding
  before readiness, exactly-once forwarding after readiness, retryable restart
  failure before forwarding, and shutdown cancellation without leaked children.

- Required pull-request real-browser tests cover Node stdio with one engine,
  Node Streamable HTTP with the other engine and two isolated sessions, then
  swap engines in a second pair so both engines and transports are exercised.
  Isolated and persistent profiles are targeted once per engine rather than
  multiplied across the full matrix.
- Required pull-request Docker smoke covers `linux/amd64` with the default
  `cloak` engine through a real discovery and WebSocket connection.
- Release validation adds Docker `linux/amd64` real-browser smoke for the
  `playwright` engine and native `linux/arm64` real-browser smoke for both
  engines. If no native arm64 runner is available, the arm64 image build remains
  mandatory and the missing runtime smoke is reported as an unverified release
  gate rather than silently treated as passed.

#### Acceptance

- Unit/property tests cover valid and invalid range, host, enablement, metadata,
  advertised scheme, raw-flag, capability, URL, generation, and allocator cases.
- Integration tests cover simultaneous HTTP sessions, non-CDP capacity after
  pool exhaustion, immediate external-collision failure, release/reuse with
  stale URLs, initial rollback, upstream relaunch, post-readiness upstream success,
  upstream failure, tool-caused browser loss without retry, and shutdown with active
  WebSockets.
- Integration tests cover no eager restart on browser loss, a single-flight
  restart for concurrent browser tools, exactly-once forwarding after readiness,
  retryable restart failure before forwarding, retained external port ownership,
  and shutdown racing an in-flight restart.
- Integration tests cover every CDP-005 HTTP status, error code, required
  header, identical capability/path `404` response, Host/Origin `400` and
  `403`, preserved upstream `400..499`, normalized upstream `300..399` and
  `500..599`, and upstream-body redaction.
- WebSocket integration tests cover each local `1001`, `1002`, `1009`, `1011`,
  and `1013` close and prove fixed reasons contain no protected data.

- Real-browser tests prove the bootstrap call starts Chromium, the managed TCP
  port coexists with Playwright's pipe, both launch-option paths preserve it,
  the ownership challenge rejects a substituted endpoint, MCP and CDP share
  state, and sessions remain isolated.
- Repeated real-browser raw `Browser.close` recovery deterministically restarts
  the upstream child and publishes a verified replacement generation for both
  browser engines.
- Security tests prove rejected capability, Host, and Origin requests never
  reach Chromium and non-loopback binding requires explicit opt-in.
- Integration coverage proves `https`/`wss` publication through a test TLS
  terminator on the same advertised port while bridge-to-Chromium traffic stays
  plaintext and Host/Origin authority enforcement remains unchanged.
- A real Playwright `connectOverCDP` teardown test determines whether the pinned
  client's `browser.close()` only disconnects its transport; documentation MUST
  follow the observed behavior and separately prohibit sending raw CDP
  `Browser.close` when browser preservation is required.
- Final implementation validation runs `npm run check` plus the smallest
  relevant packaged CLI, Docker, and real-browser CDP checks for the current
  delivery stage.

### CDP-015: Operator documentation

Public configuration, Docker, tools, and security documentation MUST explain
how to configure a port pool, set or negate the process-level CDP enabled
default, override it for an HTTP session with `cdpEnabled: true` or
`cdpEnabled: false`, publish a Docker port range, configure an advertised host
and scheme, retrieve `cloakbrowser_bridge_info`, and connect using the
capability discovery URL.

Documentation MUST distinguish CDP from Playwright Server protocol and explain:

- per-setting CLI-over-environment precedence, including how
  `--no-cdp-enabled` and `--no-cdp-allow-remote` override environment true;
- HTTP inheritance from the process default and explicit per-session true/false
  override semantics;
- the current Open WebUI `chromium.connect()` incompatibility;
- eager browser startup and its initialize-time cost;
- one-to-one Docker port publication and process-local allocation;
- per-session port ownership and per-generation capability rotation;
- that the discovery URL is a credential and the bridge has no built-in TLS;
- that `http` is the default, while `https` only advertises `https`/`wss` URLs
  and requires an operator-owned TLS terminator at the same one-to-one
  advertised port;
- that TLS termination MUST preserve the advertised Host and Origin authority
  and forward to the plaintext bridge listener;
- generation state and active connection diagnostics;
- MCP/CDP caller coordination and destructive raw `Browser.close` behavior;
- the tested, client-specific way to disconnect without terminating Chromium;
- the wildcard advertised-host requirement, raw-argument limitations, and fixed
  resource limits.
- stable proxy HTTP error statuses, common JSON envelope and headers, upstream
  non-success normalization, at-most-once upstream dispatch, read-only discovery
  retries, and why ambiguous state-changing failures require reconciliation rather
  than automatic retry or a `Retry-After` assumption;
- local WebSocket close codes and fixed redacted reasons.

#### Acceptance

- Examples cover stdio Node, multi-session Streamable HTTP, global false with
  per-session opt-in, global true inheritance and per-session opt-out, and
  Docker without implying that a port pool alone enables CDP.
- Examples use CDP-capable clients such as Playwright
  `chromium.connectOverCDP()` and use only teardown behavior proven by the
  real-browser test.
- Documentation tells operators to protect capability URLs from logs and use a
  secured TLS reverse proxy or isolated network for non-loopback access.
- TLS examples distinguish the externally advertised secure scheme from the
  plaintext bridge listener and do not imply that the bridge provisions or
  verifies certificates.
- No example presents current Open WebUI direct compatibility as working.
- Every affected localized page is updated consistently and documentation, SEO,
  compatibility, and translation-manifest checks pass.

## Failure recovery and rollback

- An initial configuration or readiness failure rejects only the new
  CDP-enabled HTTP session where session isolation permits. Stdio startup fails
  because no independent session remains available.
- An external collision on the selected candidate fails that admission without
  disturbing active sessions. Operators recover by freeing that port or changing
  the configured pool. In-process full-pool exhaustion is recovered by closing
  CDP-enabled sessions or configuring a larger pool.
- On browser loss, the current capability is invalidated and discovery becomes
  unavailable without starting a replacement. The first later MCP browser tool
  starts one lazy restart before forwarding; after verified readiness, clients
  retrieve a new generation URL from `cloakbrowser_bridge_info`.
- If restart fails, the pending browser tool was not forwarded, the MCP session
  and external port remain owned, and a later browser-tool call may retry one
  bounded restart attempt.
- After restart readiness and publication, an upstream browser-tool success or
  failure is returned unchanged. There is no later readiness phase. If the tool
  causes browser loss, the new capability is invalidated and CDP becomes unavailable
  without retrying the tool; otherwise the verified generation remains active.

- Session shutdown closes the listener before releasing its lease. Port reuse is
  safe against stale clients because every session and generation uses a fresh
  capability.
- Disabling or rolling back the feature removes managed CDP endpoints without a
  stored-data migration. Existing unmanaged raw Chromium flags retain their
  previous unsupported behavior.

## Non-goals

- Replacing, wrapping, or expanding upstream Playwright MCP browser tools.
- Adding a generic CDP-command MCP tool or project-owned CDP schema.
- Implementing a Playwright Server-compatible WebSocket gateway.
- Direct compatibility with current Open WebUI code that calls
  `chromium.connect()`.
- Built-in CDP TLS, per-command authorization, policy enforcement, or persistent and
  per-request security audit logging beyond capability authentication and the bounded
  aggregate rejection diagnostics in CDP-013.
- Hostile-tenant isolation after an authorized client obtains the capability.
- Automatic external port remapping, service discovery, load balancing, or
  cross-process lease coordination. The operating-system bind attempt is only the
  collision authority for the single allocator-selected candidate; it does not permit
  scanning later candidates after an external collision prohibited by CDP-004.
- A configurable browser-origin allowlist or direct hosted DevTools support from
  an unrelated web origin.
- Preventing an authorized CDP client from issuing destructive protocol commands
  or making a lost browser generation appear continuous.
- Preserving tabs, page state, in-memory storage, or other browser-generation
  state across an upstream-child restart.
- Adding nonstandard `cloakserve` browser-management endpoints.

## Objective acceptance

The specification is satisfied when an effectively enabled stdio or Streamable
HTTP session exposes a ready, capability-authenticated, session-specific
Chromium CDP endpoint; MCP and CDP clients observe the same active browser
generation; upstream browser replacement rotates generation identity and never
reuses a stale capability; multiple HTTP sessions remain isolated and bind
different available ports; cleanup and failure release every owned resource;
bounded Node and Docker real-browser checks pass; and public documentation
accurately describes protocol, security, lifecycle, and compatibility
boundaries.

## Evidence and delivery boundary

- [Issue #134](https://github.com/swimmwatch/cloakbrowser-mcp/issues/134)
  requests optional CDP access and proposes Chromium debugging flags.
- The pinned `@playwright/mcp@0.0.80` bundle creates its browser backend lazily
  in the tool-call handler, clears it on disconnect, and can create another
  backend on a later tool call.
- The pinned upstream `browser_close` tool closes its backend, while
  `browser_tabs` with `action: list` ensures the normal initial tab and can serve
  as the explicit lifecycle bootstrap.
- [Chromium remote debugging server](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/devtools/remote_debugging_server.cc)
  binds current browser CDP servers to loopback addresses.
- [Chromium DevTools HTTP handler](https://chromium.googlesource.com/chromium/src/+/master/content/browser/devtools/devtools_http_handler.cc)
  defines discovery/control routes and validates Host and WebSocket Origin.
- [Chrome 136 remote-debugging change](https://developer.chrome.com/blog/remote-debugging-port)
  requires a non-default user data directory for remote-debugging switches.
- [Playwright `connectOverCDP`](https://github.com/microsoft/playwright/blob/v1.61.0/docs/src/api/class-browsertype.md)
  accepts HTTP discovery or browser WebSocket endpoints and documents the lower
  fidelity of CDP compared with Playwright protocol.
- `src/server.ts` owns one runtime for stdio; `src/http/server.ts` creates and
  disposes one independent runtime per admitted HTTP session.
- `src/bridge/config.ts` owns generated upstream browser configuration;
  `src/http/requests.ts` owns flat camelCase per-session initialize metadata;
  `src/bridge/tools.ts` owns `cloakbrowser_bridge_info`.
- Required planning artifacts are `quality/scenarios.yaml` and
  `architecture/model.dsl`; they are not created by this specification stage.
- This specification does not authorize implementation, planning, commit, push,
  pull request changes, issue changes, release work, or publication.
