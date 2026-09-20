---
render_macros: false
---

# Packet 06 — Upstream-Child Restart, Activity, And Ordered Cleanup

Status: Reopened by the current Approved CDP-009 contract. Ready only for one explicit Packet 06 incremental-implementation invocation. Existing activity and cleanup behavior is partial prerequisite evidence, not completion of this revised packet.

## Outcome

Replace the known-lost upstream child before forwarding the first later browser tool, coalesce concurrent restart demand, preserve exactly-once upstream results after readiness, retain the session proxy and external lease, and keep existing activity and ordered-cleanup guarantees.

Requirements: CDP-002, CDP-003, CDP-004, CDP-007, CDP-008, CDP-009, CDP-010, CDP-011, CDP-012, CDP-013, CDP-014.

## Pinned Inputs

- Source version: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.
- Specification version: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`.
- Review reference: `f008baec-bf84-4454-88db-dab9801e85df`.
- Required dependency evidence: Packets 01-05 completed; existing Packet 06 activity/cleanup tests remain green before the restart delta.

## Prerequisite Evidence

Re-verify these lines immediately before implementation:

- `src/server.ts:110-130` currently forwards a browser tool to the fixed upstream client before attempting CDP recovery.
- `src/server.ts:170-227` captures only the initial runtime and client and passes both into `createBridgeServer`.
- `src/server.ts:346-378` lists tools and calls through one fixed `Client`; `connectUpstream` does not retain the `StdioClientTransport`.
- `src/cdp/session.ts:102-140` stores one immutable runtime, upstream owner, Chromium client, internal host, and port.
- `src/cdp/session.ts:149-164` coalesces bootstrap only; it does not replace an upstream owner.
- `src/cdp/session.ts:266-280` owns current session disposal order.
- `src/cdp/types.ts:23-61` defines the present owner/factory boundary.
- The installed MCP SDK transport closes stdin, waits, sends SIGTERM, waits, then sends SIGKILL in `node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js:143-177`.
- `tests/unit/server.test.ts:139-204` asserts the superseded post-forward recovery behavior and must first become discriminating RED for restart-before-forward.
- `tests/fixtures/fake-upstream-mcp.mjs:129-171` can report `process.pid`, providing a safe child-identity observation surface.
- `tests/e2e/cdp-access.manual.ts:114-157` contains the real-browser raw-close scenario that exposed nondeterministic CloakBrowser recovery.

## Scope

Allowed production paths:

- `src/cdp/session.ts`
- `src/cdp/types.ts`
- `src/server.ts`
- `src/bridge/tools.ts` only if immutable bridge-info metadata must be separated from disposable runtime ownership
- `src/http/server.ts` only for existing session shutdown/cancellation composition

Allowed tests and fixtures:

- `tests/unit/cdp-session.test.ts`
- `tests/unit/server.test.ts`
- `tests/unit/tools.test.ts`
- `tests/unit/http-server.test.ts`
- `tests/integration/cdp-bootstrap.test.ts`
- `tests/integration/cdp-lifecycle.test.ts`
- `tests/integration/streamable-http.test.ts`
- `tests/fixtures/fake-upstream-mcp.mjs`
- `tests/fixtures/fake-chromium-cdp.ts`

Required task updates: `tasks/todo.md`, `tasks/handoff.md`.

Non-goals: real-browser or Docker completion claims, public documentation, new public options, background restart, tab/state restoration, global command serialization, new browser tools, Playwright Server protocol, dependency changes, broad server refactoring.

## Planned Boundaries

### Stable Session Coordinator

Revise `ManagedCdpSessionRuntime` so it owns:

- the stable external proxy/listener and external lease;
- the monotonic generation counter and current discovery snapshot;
- at most one replaceable upstream generation owner;
- one optional restart promise and one cancellation path;
- forwarding entry points that keep MCP SDK payload types outside `src/cdp`.

Browser loss clears the current capability and sockets but does not call the generation factory. Local tools, list-tools, discovery reads, and ordinary CDP disconnects do not create a restart.

### Replaceable Upstream Generation Owner

A generation owner contains one internal port reservation handoff, generated `BridgeRuntime`, upstream MCP client/transport, Chromium discovery client, and readiness state. Initial admission and restart use the same factory so launch arguments, engine, profile, proxy, extensions, headless mode, and other session options cannot drift.

Disposal must make the child unreachable within the shared restart deadline. Retain the transport or an owner whose close path invokes the SDK's bounded stdin/SIGTERM/SIGKILL sequence. Dispose runtime-owned temporary configuration after the client/child can no longer use it.

Do not dispose the stable external proxy or release its port during restart.

### MCP Composition

For a managed session, `src/server.ts` routes every upstream `browser_*` call through the coordinator:

1. If the generation is ready, forward once to the current owner.
2. If unavailable, join or create the one restart promise.
3. The restart invalidates old reachability, disposes the old owner, creates and verifies a replacement, then publishes a new capability.
4. After the shared promise succeeds, each waiting request forwards exactly once to the replacement.
5. If restart fails before forwarding, the request fails through the existing MCP request-failure surface with a bounded bridge-owned message.
6. If a forwarded tool returns an upstream success or failure, return it unchanged. Do not run a second readiness phase or retry the call.
7. `browser_close` and any other observed post-forward browser loss invalidate the just-used generation without retrying the tool.

Tool-list cache hits remain valid because the same pinned upstream package and configuration own every child. A cache miss must use the current owner. If restart is already in flight, it may await that existing restart but must not initiate one; it must never call a disposed client.

Keep immutable values needed by local tools separate from disposable resources, or prove that reading the retained runtime descriptor after disposal is safe and intentional.

### Deadline And Cancellation

One absolute 60-second deadline covers old-owner cleanup, new internal reservation, runtime preparation, upstream connection, eager `browser_tabs` bootstrap, challenge placement/deletion, Chromium discovery, and external readiness.

A restart failure:

- forwards none of the waiting browser calls;
- clears provisional capability and sockets;
- disposes every provisional owner;
- retains the MCP session, stable proxy, external lease, and last generation number;
- leaves state `unavailable`;
- permits one new attempt only when a later browser tool arrives.

Session disposal or HTTP expiry aborts restart, waits for or observes all cleanup, rejects new forwarding, closes the proxy and sockets, disposes the current/provisional owner, then releases the external lease exactly once.

## Test-First Execution

### RED

Write and run checks before production changes:

1. Convert the old server tests so an unavailable generation proves zero calls reach the old owner before replacement readiness.
2. Prove browser loss alone, local tools, and list-tools do not start a replacement.
3. Send concurrent browser calls while unavailable; assert one old-owner disposal, one new runtime/client, one bootstrap/readiness sequence, one replacement PID, and exactly one forwarding record per caller.
4. Make old-owner cleanup hang or fail, and fail each replacement phase in turn. Assert no waiting call is forwarded, no capability is published, provisional resources close, and a later call can start one new attempt.
5. After successful readiness, return one upstream success and one upstream `isError` result. Assert byte-equivalent results, no retry, and no second challenge/readiness phase.
6. Make the forwarded tool close the replacement browser. Assert the result is not retried and the new capability becomes unavailable.
7. Advance fake time across one absolute 60-second budget spanning cleanup and every replacement phase.
8. Race DELETE, idle expiry, stdio shutdown, and signal disposal against restart. Assert shutdown wins, no child survives, and external release occurs after reachability closes.
9. Populate and miss tool-list cache before, during, and after restart. Assert no call reaches a disposed client and list-tools never initiates restart.
10. Compare initial and replacement fake-upstream configuration/profile observations and assert the external port stays fixed while internal port, child PID, generation, and capability change.
11. Preserve accepted-CDP activity/quiet-socket behavior and bounded redacted diagnostics from the completed portion of Packet 06.

The existing current implementation should fail the restart-before-forward, child-PID, single-flight-owner, and exactly-once assertions for the intended reasons. A missing symbol or harness failure is not sufficient RED.

### GREEN

Implement the smallest replaceable-owner/session-coordinator change that passes the checks. Reuse current deadline, rollback, challenge, proxy, and cleanup helpers where their ownership remains correct. Do not add an independent restart service, global registry, or background loop.

### PROVE

Apply one mutation at a time and restore it:

- Start restart immediately on browser loss; the no-eager-restart check must fail.
- Forward one waiter before readiness; the zero-old-child-call/order check must fail.
- Give each concurrent waiter its own restart; factory/PID cardinality checks must fail.
- Retry a forwarded upstream error or success; exactly-once/result-identity checks must fail.
- Keep the old child reachable while preparing the replacement; ownership-order checks must fail.
- Reset the deadline after old-child cleanup; absolute-bound check must fail.
- Let restart finish after session disposal; leak/shutdown-wins checks must fail.
- Release the external lease during restart; retained-port and stale-reachability checks must fail.
- Route a list-tools cache miss to the disposed client; current-owner check must fail.

Record each mutation and its intended failing assertion in the handoff.

## Focused Verification

From the repository root:

```bash
npx vitest run tests/unit/cdp-session.test.ts tests/unit/server.test.ts tests/unit/tools.test.ts tests/unit/http-server.test.ts
npx vitest run tests/integration/cdp-bootstrap.test.ts tests/integration/cdp-lifecycle.test.ts tests/integration/streamable-http.test.ts
npm run typecheck
npm run lint
npm run format:check
npm run package:verify
npm run check
git diff --check
```

Expected evidence:

- no child starts on loss alone;
- one shared bounded restart replaces the old PID;
- no request reaches the old child;
- each waiting browser request reaches the replacement exactly once;
- restart failure is pre-forward and retryable only on a later call;
- session cleanup cancels restart and releases the external lease last;
- disabled and unmanaged sessions preserve their existing behavior.

## Completion Boundary

Complete only after RED, GREEN, all PROVE mutations, focused integration checks, and `npm run check` pass with current pinned specification state. Update `todo.md` and replace `handoff.md` with exact evidence, then stop.

Completion of revised Packet 06 makes Packet 07 eligible for a separate explicit invocation. It does not authorize Packet 07, documentation, commit, push, pull request, release, or publication.
