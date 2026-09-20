---
render_macros: false
---

# Packet 03 — WebSocket Relay And Proxy Shutdown

Status: Pending completed Packet 02 evidence and an explicit Packet 03 invocation.

## Outcome

Add a bounded server/client WebSocket relay, active-connection accounting, backpressure, fixed local close semantics, and graceful/forced proxy shutdown for browser and page CDP endpoints.

Requirements: CDP-005, CDP-006, CDP-009, CDP-010, CDP-013, CDP-014.

## Pinned Inputs

- Source version: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.
- Specification version: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`.
- Review reference: `f008baec-bf84-4454-88db-dab9801e85df`.
- Required dependency evidence: Packets 01-02 complete in `todo.md` and current `handoff.md`.

## Prerequisite Evidence

- `package.json` has no direct WebSocket server/client dependency.
- Packet 02 owns the already-bound plaintext HTTP listener, capability-first route/authority policy, typed pre-upgrade failures, generation publication, and shutdown entry point.
- `src/server.ts:86-102` forwards MCP calls and disposes asynchronously; the relay must not introduce a global command lock or block this path.
- CDP-QS-006, CDP-QS-007, and CDP-QS-010 define protocol, bound, activity, and cleanup observations.

Recheck line evidence, workflow pins, and the complete worktree before editing.

## Scope

Allowed production and dependency paths:

- `src/cdp/webSocketProxy.ts`
- `src/cdp/httpProxy.ts`
- `src/cdp/limits.ts`
- `package.json`
- `package-lock.json`

Allowed test and fixture paths:

- `tests/unit/cdp-websocket-proxy.test.ts`
- `tests/integration/cdp-websocket-proxy.test.ts`
- `tests/fixtures/fake-chromium-cdp.ts`

Required planning updates: `tasks/todo.md`, `tasks/handoff.md`.

Non-goals: MCP/session integration, browser bootstrap, TLS termination, CDP command/event translation, per-command authorization, public configuration, documentation, commits, or publication.

## Planned Boundaries

- Before installing dependencies, verify and record compatible non-prerelease `ws` and `@types/ws` versions, licenses, Node support, lockfile impact, and whether the project already resolves them transitively. Keep them as direct dependencies when imported directly.
- The relay accepts only `/devtools/browser/<id>` and `/devtools/page/<id>` after Packet 02 capability, Host, Origin, route, capacity, and readiness checks.
- The upstream handshake uses the selected loopback Chromium endpoint, preserves only required WebSocket semantics, and does not forward arbitrary client Origin or authority headers.
- Maximum active WebSockets per session is eight. Failed or malformed upgrades never increment the active count.
- Each inbound/outbound message is at most 16 MiB. Each direction queues at most 16 MiB unsent data. The producing side pauses before exceeding the queue bound.
- The relay preserves text/binary identity, ordering, and valid peer close codes/reasons within protocol limits. It never parses or logs CDP payloads.
- A successfully paired WebSocket has no application idle timeout. The handshake shares the 10-second bound; proxy shutdown allows five seconds before forced closure.
- Locally generated closes are fixed and redacted:

| Cause | Code | Reason |
| --- | --- | --- |
| Session, generation, or proxy lifecycle shutdown | 1001 | `going_away` |
| Malformed WebSocket protocol input | 1002 | `protocol_error` |
| Message over the 16 MiB limit | 1009 | `message_too_big` |
| Upstream disconnect without a valid peer close or unexpected relay failure | 1011 | `internal_error` |
| Unsent queue would exceed 16 MiB | 1013 | `try_again_later` |

Fixed reasons are at most 123 UTF-8 bytes and contain no capability, authority, target ID, upstream reason, browser data, or credential. A valid peer close remains relayed instead of being replaced.

## Test-First Execution

### RED

1. Add upgrade-policy tests for both allowed target kinds, malformed IDs, wrong capability/Host/Origin, missing Origin, client headers, and upstream Origin omission.
2. Add exact eight/nine connection tests plus count recovery for malformed upgrade, upstream refusal, abrupt disconnect, generation invalidation, and shutdown.
3. Add concurrent text/binary/ordering and valid peer-close round-trip tests in both directions.
4. Add a table test for every fixed local code/reason pair and its exact cause; assert reasons are byte-bounded and contain no seeded protected sentinel.
5. Add exact 16 MiB/+1 message and per-direction queue tests with controlled slow consumers and observable pause/resume.
6. Add 10-second handshake and five-second shutdown tests using fake timers plus real local sockets.
7. Add a quiet-subscriber test proving there is no application idle timeout.
8. Add direct http/ws and terminated https/wss upgrade tests proving advertised scheme changes the client URL only and the bridge/upstream hops remain plaintext.

### GREEN

Implement the smallest relay on Packet 02. Keep backpressure state per connection direction and map local failures through one fixed close-policy function. Failures remain bounded and session-local; diagnostics contain only event classes and counts.

### PROVE

- Set `maxPayload` one byte too high; confirm the +1 boundary fails, then restore.
- Increment active count before a paired upgrade; confirm refused-upstream count cleanup fails, then restore.
- Remove producer pause; confirm the slow-consumer queue test fails, then restore.
- Forward arbitrary client Origin upstream; confirm the handshake-header test fails, then restore.
- Replace 1013/try_again_later with 1011/internal_error; confirm the cause matrix fails, then restore.
- Include an upstream reason in the 1011 close; confirm sentinel redaction fails, then restore.
- Release the listener before forced socket termination; confirm shutdown/reuse ordering fails, then restore.

## Focused Verification

From the repository root:

```bash
npx vitest run tests/unit/cdp-websocket-proxy.test.ts tests/integration/cdp-websocket-proxy.test.ts
npm run typecheck
npm run lint
npm run format:check
npm audit --omit=dev --audit-level=high
npm run package:verify
git diff --check
```

If the required audit reports a vulnerability, the packet remains incomplete. Do not suppress or downgrade it without a separate decision.

## Completion Boundary

Complete only after dependency evidence, RED, GREEN, every named PROVE mutation, audit, package verification, and focused checks pass. Update `todo.md`, replace `handoff.md`, and stop before browser or MCP lifecycle integration.
