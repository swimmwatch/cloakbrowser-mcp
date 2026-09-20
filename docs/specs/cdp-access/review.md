# Review: Session-scoped CDP access

Reviewed document: `docs/specs/cdp-access/spec.md` (Status: Approved)
Reviewer scope: technical feasibility, security model, scope/cost, internal consistency.
Method: the spec was checked against the current repository source and against the
pinned upstream `@playwright/mcp@0.0.80` bundle in `node_modules`.

## Verdict

The spec is well written as prose but is **not implementable as specified**. Three of its
requirements (CDP-002, CDP-003, CDP-007) rest on an assumption about upstream Playwright MCP
that is factually wrong, and one requirement (CDP-004) plus the default-on switch combine into
a design that breaks the most common deployment shapes. The security model also declares
authentication a non-goal for a surface that grants unauthenticated, unrestricted browser
control, while the same process already implements bearer authentication for MCP.

Recommendation: return the spec to Draft and rework the lifecycle model (B1, B2), the port
allocator policy (B3), and the default/authentication posture (B4) before planning.

---

## Blocking issues

### B1. The browser does not start during MCP initialization

CDP-003 states:

> Browser startup remains part of upstream initialization and MUST NOT be deferred until the
> first browser tool call.

The word "remains" implies this is current behavior. It is not. In the pinned upstream bundle,
the browser backend is created lazily inside the `tools/call` handler:

- `node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js:71889` —
  `server.setRequestHandler(CallToolRequestSchema, ...)` creates `backendPromise` on the first
  tool call, not on `initialize`.
- `coreBundle.js:73902-73921` — `backendFactory.create()` is what calls
  `createBrowserWithInfo(...)`, i.e. the actual Chromium launch.
- `coreBundle.js:65305` — `ensureBrowserContext()`; every call site is inside a tool handler.

On the bridge side, `src/server.ts:126` (`connectUpstream`) only
spawns the upstream child process, and
`src/http/server.ts:298-310` completes the MCP session
as soon as that child answers. No browser exists at that point.

Consequences:

1. CDP-007's readiness gate (conditions 2, 3 and 4 — "browser runtime is initialized",
   "internal loopback CDP endpoint … responds", "`/json/version` responds") cannot be met
   without a mechanism the spec never describes: the bridge would have to force browser startup
   itself, e.g. by issuing an upstream tool call during `initialize`.
2. That mechanism has costs the spec never weighs: every CDP-enabled `initialize` pays the full
   Chromium launch (plus the CloakBrowser binary resolution in
   `src/bridge/config.ts:355`), even for clients that never
   touch a browser tool; and an internal tool call sits uncomfortably next to the
   control-surface boundary rule ("the bridge MUST forward those tools without … rewriting").
3. CDP-007 sets no deadline value and says nothing about MCP client `initialize` timeouts.

**Required:** either specify the forced-startup mechanism, its timeout, and its side effects
explicitly, or redefine readiness as lazy ("the endpoint becomes available once the session's
browser starts") and drop the "no polling required" guarantee from CDP-007.

### B2. The session does not own exactly one browser runtime

CDP-002 ("exactly one … browser runtime … for its complete lifetime") and CDP-009 ("the bridge
MUST NOT auto-restart it") are both violated by upstream behavior that is outside the bridge's
control:

- `coreBundle.js:71894-71896` — when the backend emits `disconnected`, upstream clears
  `backendPromise`. The **next tool call silently launches a brand-new browser.**
- `coreBundle.js:65868` — `browser_close` is an ordinary, supported upstream tool. Its handler
  calls `response2.setClose()`, and `coreBundle.js:73918` disposes the context and calls
  `browser.close()`.

So a client can destroy the session's browser through the *supported* MCP surface, not only
through the "unsupported" external `Browser.close` that CDP-009 addresses. After that:

- the internal loopback CDP endpoint disappears while the external proxy keeps listening and
  `cloakbrowser_bridge_info` keeps advertising it;
- the replacement browser launched by upstream will attempt to bind the same
  `--remote-debugging-port` — a race the spec does not describe, and one that will simply fail
  if the old browser has not fully exited;
- external CDP clients silently move from one browser process to another, or hang.

**Required:** CDP-009 must cover `browser_close` and browser crashes, not just external
`Browser.close`; and CDP-002/CDP-008 need a liveness or generation marker so a client can tell
that the endpoint it holds is stale. The current `bridge_info` shape (CDP-008) has no state
field beyond `enabled`.

### B3. "Never skip an occupied port" breaks the ordinary stdio deployment

CDP-004 requires a **process-wide** allocator that picks the lowest free port and MUST NOT skip
an externally occupied candidate. Combined with "managed CDP is enabled by default when a port
range is configured", this produces a concrete failure:

A user configures `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` once in their MCP client config. Every
stdio server instance is a separate OS process, so every one of them independently picks the
*lowest* port in the pool. The first wins; the second hits an "external" bind conflict (it
cannot see the other process's lease) and, per CDP-004, **fails initialization** rather than
trying the next port. Per the Failure-recovery section, "Stdio startup fails". Two concurrent
MCP clients — an entirely normal setup — is enough to break the server.

The same rule makes the HTTP deployment fragile: any unrelated process that grabs the lowest
pool port permanently blocks all new CDP sessions until an operator intervenes, even with the
rest of the range free.

The determinism this buys is not consumed by anything: clients discover the port through
`cloakbrowser_bridge_info` (CDP-008), so nothing depends on it being the lowest one.

**Required:** allow the allocator to skip occupied candidates (bind-then-advance, which also
removes the TOCTOU the spec tries to legislate away), and either scope the pool per process or
state plainly that a pool must not be shared between processes.

### B4. Default-on, unauthenticated privileged control surface

CDP grants everything: arbitrary JS, cookie and storage reads, `Page.navigate` to `file://`,
download redirection, `IO.read`. The spec's controls are Host/Origin validation (CDP-006) and
a loopback default (CDP-001). Neither is authentication:

- Host/Origin checks stop DNS rebinding and browser-originated cross-origin access. They stop
  no non-browser client that can reach the port — it just sends the right `Host`.
- Inside Docker, "bind `127.0.0.1` by default" is misleading: the operator must publish the
  ports (`-p`) for the feature to be usable at all, which is precisely what CDP-015 documents.
  The loopback default protects nothing in the deployment the spec targets.

On top of that, the spec makes the feature **default-on**: "When a port range is configured,
managed CDP is enabled by default for stdio and for Streamable HTTP sessions." An operator who
configures a range for one client thereby exposes an unauthenticated browser-control port for
*every* session. And `cdpEnabled: true` in initialize metadata is a per-session escalation
available to any client that can reach `initialize` — there is no authorization boundary
between "may use MCP tools" and "may open a raw CDP port".

The process already implements bearer-token authentication
(`src/http/server.ts:94`, `isAuthorizedRequest`, constant-time
compare). Reusing that token on the proxy — or, cheaper still, putting an unguessable
per-session path segment into the advertised URL — is a small amount of code and closes most of
the gap. Declaring authentication a non-goal is hard to justify when the mechanism is already
in the same file.

**Required:** invert the default (explicit `cdpEnabled: true` per session), and either reuse
the existing bearer token for the proxy or justify in writing why it is acceptable not to.

---

## Major issues

### M1. `sessionMax` (32) vs. the CDP pool — CDP-012 contradicts CDP-004

`sessionMax` defaults to 32 (`src/http/options.ts:76`).
With CDP default-on, a pool smaller than 32 means session admission starts failing at
pool-size sessions. CDP-012 claims the feature "MUST preserve Streamable HTTP session …
capacity"; CDP-004 says pool exhaustion "fails initialization". Both cannot hold.

CDP-015 only asks documentation to mention "a range large enough". That is not a control.
Add a startup validation (pool size vs. `sessionMax` when CDP is default-on), or make CDP
opt-in per session so the pool only bounds CDP-enabled sessions.

### M2. Port reuse lets a stale client reach a different session's browser

CDP-004: "After complete cleanup, a later session can deterministically reuse the lowest
released port." With no endpoint identity in the URL and no authentication (B4), a CDP client
that still holds the old advertised URL will connect to a **different tenant's browser** and
receive no error. This is a cross-session confused-deputy hazard that the Host/Origin policy
does not address, and it is not listed in the non-goals either.

A per-session random path prefix in the advertised URL fixes this and B4's weakest point at
once.

### M3. CDP-005's rewriting surface is under-specified and leaks the internal port

CDP-005 says "MUST NOT expose the internal port", but the acceptance criteria only enumerate
`/json/version`, `/json/version/`, `/json` and `/json/list`. Chromium's DevTools HTTP handler
also serves:

- `devtoolsFrontendUrl` — present in `/json` and `/json/list` entries, with the WebSocket
  authority embedded as a query parameter. If it is not rewritten, the internal port leaks.
- `/json/new` (PUT), `/json/activate/<id>`, `/json/close/<id>`, `/json/protocol`.

The spec must say explicitly which paths are proxied, which are rejected, and that every
authority-bearing field — not only `webSocketDebuggerUrl` — is rewritten.

### M4. The driving use case is declared a non-goal

Issue #134 asks for CDP so the bridge can serve "Open WebUI with `ws://cloakserver:9222` or
python scripts". The spec lists "Direct compatibility with current Open WebUI code that calls
`chromium.connect()`" as a non-goal (and repeats it in CDP-012 and CDP-015).

So the spec proposes 15 requirements' worth of security-critical network code while explicitly
not solving half of the request that motivated it. That may be the right call — Open WebUI
speaks the Playwright server protocol, not CDP — but the spec never says so, never evaluates a
Playwright-server gateway, and never records that the issue reporter's primary scenario stays
unsupported. This needs an explicit decision, and a comment on the issue.

### M5. No alternatives were evaluated

For a deep-profile spec adding a security-critical proxy, there is no alternatives section.
At minimum these should be compared and rejected in writing:

- **Upstream `--caps devtools`** — already ships `browser_start_tracing` / `browser_stop_tracing`
  (`coreBundle.js:67605`, `:67631`), plus recording and video tools. The spec's motivation list
  names "tracing" as a driver for CDP; part of it is already available through configuration.
- **Documented raw passthrough + operator tunnel** — `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` already
  reaches Chromium for both engines (`src/bridge/config.ts:270`,
  `src/bridge/config.ts:437`). For the single-session stdio/Docker case, an
  operator-managed tunnel to the loopback port covers the scenario with zero new code. The spec
  keeps this path (CDP-011) but never compares it to the managed feature.
- **`browser_evaluate` / `browser_run_code_unsafe`** for the "run some JS" subset.

The repository guidance is to prefer the highest sufficient option before writing new code; the
spec should show that work was done.

### M6. Nothing bounds CDP client resources concretely

CDP-013 requires bounded headers, frames, handshakes and shutdown, but sets no limits and adds
no configuration: no cap on concurrent CDP connections per session, no max frame size, no idle
timeout for a connected-but-silent client, no counter in `bridge_info` or logs. "Bounded" that
is not quantified is not testable, and CDP-014 correspondingly has no acceptance criterion for
it.

### M7. `connectOverCDP` + `browser.close()` is a documented landmine

CDP-015 recommends `chromium.connectOverCDP()` as the example client, while CDP-009 declares
`Browser.close` an unsupported destructive action. A Playwright user's reflex is
`await browser.close()` in a `finally` block. The documentation requirement must call out
explicitly which teardown call is safe (`browser.close()` vs. disconnecting the transport) and
the spec should require a test that pins the actual behavior — this is the single most likely
way a user will destroy their own session.

---

## Minor issues and spec hygiene

1. **Status contradiction.** The header says `Status: Approved`; the last line says "This Draft
   does not authorize implementation". One of the two is wrong.
2. **CDP-008's example is internally inconsistent.** It shows `"bindHost": "0.0.0.0"` — a
   wildcard bind, which per CDP-001 requires `--cdp-allow-remote` and an operator warning —
   without any note that the example assumes remote opt-in. Given that wildcard binding is the
   riskiest configuration, it is a poor choice for the one illustrative example in the document.
3. **The Chrome 136 clause in CDP-003 is redundant.** Playwright always launches with its own
   `--user-data-dir` (`coreBundle.js:43288`), and the bridge's persistent mode sets an explicit
   one (`src/bridge/config.ts:306`). The default user data
   directory is never used, so the Chrome 136 restriction cannot be hit. Keep the reference as
   rationale, drop it as a requirement.
4. **CDP-011 should state why a managed port coexists with Playwright's pipe.** Playwright
   always appends `--remote-debugging-pipe` and throws if the user supplies it
   (`coreBundle.js:43289`, `:43301`); it does **not** reject `--remote-debugging-port`. The
   managed port is therefore an *additional* transport, not a replacement. Saying this plainly
   prevents an implementer from trying to switch Playwright off the pipe.
5. **Unverified interaction with the Cloak launch path.** For the `cloak` engine, launch
   arguments are rebuilt by the CloakBrowser SDK
   (`src/bridge/config.ts:359-372`,
   `resolveCloakLaunchOptions` → `buildLaunchOptions`). The spec assumes an injected
   `--remote-debugging-port` survives that round trip. CDP-014 should require a test that pins
   it for both engines rather than assuming it.
6. **Config namespace leaks to the child.** `CLOAK_PLAYWRIGHT_MCP_*` is forwarded into the
   upstream child environment (`src/bridge/config.ts:201`),
   so the new `CLOAK_PLAYWRIGHT_MCP_CDP_*` variables will be visible there. Harmless today, but
   the spec claims these are bridge-owned; worth one sentence.
7. **`bridge_info` output shape.** `src/bridge/tools.ts:71`
   returns `structuredContent` with no declared `outputSchema`. Adding `cdp` is additive and
   safe, but the spec should say so explicitly, since CDP-008's acceptance only covers tool
   *names* and *count*.
8. **"MAY" in an otherwise MUST-disciplined document.** "The proxy may run inside the outer
   bridge process; it is not required to be a separate operating system process" is an
   implementation note, not a requirement; it belongs in rationale.
9. **CDP-014's matrix has no prioritization.** Real-browser × {Node, Docker} × {cloak,
   playwright} × {stdio, HTTP} × {isolated, persistent} is 16+ slow combinations on top of an
   existing `npm run check` that already runs e2e. Without a stated minimum set, this either
   gets cut silently during implementation or makes CI unusable.
10. **CDP-015's localization cost is not acknowledged.** The docs tree carries 11 locales per
    page (`docs/*.{be,de,es,fr,hi,ja,pt-BR,ru,uk,zh}.md`). "Every affected localized page is
    updated consistently" across configuration, docker, tools and security pages is roughly
    44 files. That is the repository convention, but the spec should name the cost.
11. **CDP-010's failure mode is invisible.** Callers own conflict resolution, which is a
    reasonable stance, but nothing in `bridge_info` or the logs tells an MCP user that a CDP
    client is attached. When an MCP snapshot tool fails because a CDP client navigated the page,
    the user has no way to see why. A connected-client count in `bridge_info` would make this
    diagnosable at near-zero cost.

---

## What the spec gets right

These decisions are correct and should survive the rework:

- **Not trusting `--remote-debugging-address`.** Current Chromium binds the DevTools server to
  loopback regardless; a session-owned proxy is the right answer, and the spec cites the source.
- **Omitting `Origin` upstream instead of adding `--remote-allow-origins=*`.** This is exactly
  the right trade: it satisfies Chromium's DevTools handler without disabling its origin check
  browser-wide.
- **Requiring an HTTP/WebSocket-aware proxy rather than a TCP forwarder.** Necessary, because
  the discovery documents must be rewritten and the internal authority must not leak.
- **Never emitting a wildcard bind host as a connectable URL** (`discoveryUrl: null`).
- **Refusing to add a generic CDP-command MCP tool** and keeping the local tool count fixed —
  consistent with the repository invariants in `AGENTS.md`.
- **Refusing to auto-restart a browser killed through CDP.** The behavior is right; the problem
  (B2) is that upstream restarts it anyway, which the spec has to account for.
- The requirement/acceptance structure itself is clear and mostly testable — the defects are in
  the model, not the format.

---

## Prioritized actions

| # | Action | Blocks |
|---|--------|--------|
| 1 | Rewrite CDP-003/CDP-007 around upstream's lazy browser startup; specify the forced-start mechanism and its timeout, or make readiness lazy | B1 |
| 2 | Extend CDP-002/CDP-008/CDP-009 to cover `browser_close`, browser crash, and upstream's transparent relaunch; add endpoint liveness/generation to `bridge_info` | B2 |
| 3 | Drop the "never skip an occupied port" rule; scope the pool per process | B3 |
| 4 | Make CDP opt-in per session; reuse the existing bearer token or add a per-session URL secret | B4, M2 |
| 5 | Resolve the pool-size vs. `sessionMax` contradiction with a startup validation | M1 |
| 6 | Enumerate every proxied path and every rewritten authority field | M3 |
| 7 | Add an alternatives section (upstream `--caps devtools`, raw passthrough + tunnel) and record the Open WebUI decision on issue #134 | M4, M5 |
| 8 | Quantify the limits CDP-013 calls "bounded" and give CDP-014 a stated minimum matrix | M6, M9 |
