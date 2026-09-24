---
render_macros: false
---

# Packet 04 — Browser Bootstrap And Generation Coordinator

Status: Pending completed Packets 01-03 evidence and an explicit Packet 04 invocation.

## Outcome

Implement the session-owned managed CDP state machine: internal loopback port handoff, upstream lazy-browser bootstrap, one-use ownership challenge, initial 60-second readiness, generation identity, capability publication, unavailable state, and complete rollback. Keep it dependency-injected and not yet publicly enabled.

Requirements: CDP-002, CDP-003, CDP-007, CDP-008, CDP-009, CDP-011, CDP-013, CDP-014.

## Pinned Inputs

- Source version: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.
- Specification version: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`.
- Review reference: `f008baec-bf84-4454-88db-dab9801e85df`.
- Required dependency evidence: Packets 01-03 complete.

## Prerequisite Evidence

- `src/bridge/config.ts:224-248` creates generated configuration and owns failure cleanup.
- `src/bridge/config.ts:408-429` creates the disposable runtime object.
- `src/server.ts:53-57` currently prepares a runtime before creating/starting the bridge.
- `src/server.ts:126-138` creates one upstream stdio client from the generated config.
- The pinned upstream browser remains lazy until a browser tool call; the Approved contract selects `browser_tabs` with `{ "action": "list" }` as the bootstrap.
- Packets 02-03 supply a bound external proxy that remains unavailable until generation publication.

## Scope

Allowed production paths:

- `src/cdp/chromium.ts`
- `src/cdp/session.ts`
- `src/cdp/types.ts`
- `src/bridge/config.ts`

Allowed tests/fixtures:

- `tests/unit/cdp-chromium.test.ts`
- `tests/unit/cdp-session.test.ts`
- `tests/integration/cdp-bootstrap.test.ts`
- `tests/fixtures/fake-chromium-cdp.ts`
- `tests/fixtures/fake-upstream-mcp.mjs`
- `tests/fixtures/fake-upstream-tools.ts`

Required task updates: `tasks/todo.md`, `tasks/handoff.md`.

Non-goals: public option registration, stdio/HTTP composition, `bridge_info` changes, continuous polling, full replacement integration after arbitrary browser tools, real-browser proof.

## Ownership And Lifecycle

- `reserveInternalCdpPort` binds loopback port `0`, records the selected concrete port, and retains the reservation while generated launch configuration and upstream child connection are prepared. It closes immediately before the bootstrap call that launches Chromium and always closes on rollback.
- `prepareBridgeRuntime` accepts an internal bridge-owned managed-CDP launch option and adds only `--remote-debugging-port=<port>`. It never adds a debugging address, `--remote-allow-origins=*`, or its own pipe flag. CDP settings are removed from `childEnv`.
- `ManagedCdpSession` owns one external proxy/lease and at most one `CdpGeneration`. Dependencies are narrow callbacks: upstream `callTool`, runtime disposal, internal discovery client, clock/deadline, diagnostics, and activity.
- The absolute 60-second initial deadline starts before external allocation and covers child connection, bootstrap, Chromium launch, internal discovery/challenge, and external `/json/version/` readiness.
- Bootstrap sends exactly one `browser_tabs` list call, generates random challenge property/value material, writes it with upstream `browser_evaluate`, reads and deletes it through the page target CDP session, and verifies exact equality. Success and every failure leave no challenge property/value.
- A generation becomes ready only after internal browser WebSocket identity is recorded and the external rewritten discovery URL is usable. Capability generation occurs per ready generation and is never separately exposed.
- Initial failure disposes proxy sockets/listener, upstream child/browser, temp config/profile ownership, challenge state, and lease. Cleanup is idempotent and ordered.
- This packet supports explicit invalidation to `unavailable` and liveness/identity probes, but Packet 06 wires all browser-loss triggers and replacement observation.

## Test-First Execution

### RED

1. Add internal reservation tests proving loopback-only bind, port-zero selection, retention through config/child connect, release immediately before bootstrap, and cleanup on every injected failure.
2. Add launch-argument tests for both cloak and playwright config paths, user-data-dir modes, retained upstream pipe observation, and prohibited debugging address/origin/bridge-owned pipe flags.
3. Add bootstrap call-count/order tests and successful challenge placement/read/delete.
4. Inject substituted endpoint, identity mismatch, wrong challenge, missing page target, early exit, hung bootstrap, invalid discovery, unusable external URL, and timeout.
5. Assert unavailable/ready state, monotonic generation seed, capability publication timing, and complete resource rollback.

### GREEN

Implement the coordinator and internal Chromium helpers behind injected interfaces. Keep existing non-CDP `prepareBridgeRuntime()` output byte-equivalent when the internal option is absent.

### PROVE

- Close the internal reservation before config/child connection; occupy the port and confirm the substitution test fails, then restore.
- Accept identity without the challenge; confirm the substituted-endpoint test fails, then restore.
- Omit challenge deletion on mismatch; confirm the residue assertion fails, then restore.
- Reset the deadline between phases; confirm the absolute 60-second test exceeds its bound and fails, then restore.
- Publish capability before external version readiness; confirm the unavailable-before-ready test fails, then restore.

## Focused Verification

```bash
npx vitest run tests/unit/cdp-chromium.test.ts tests/unit/cdp-session.test.ts tests/integration/cdp-bootstrap.test.ts tests/unit/config.test.ts
npm run typecheck
npm run lint
npm run format:check
npm run test:integration
git diff --check
```

Expected evidence includes exact call order, no retained challenge, no provisional resource after each failure, and unchanged non-CDP bridge configuration snapshots.

## Completion Boundary

Complete only after RED/GREEN/PROVE and focused checks pass. Update task state and stop before exposing any public managed-CDP path.
