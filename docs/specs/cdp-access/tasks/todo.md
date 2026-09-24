---
render_macros: false
---

# Managed CDP Access Checklist

This is the sole completion checklist for the workstream. A checked implementation item requires recorded evidence in `handoff.md`; planning text or code presence alone is not completion.

## Planning Gate

- [x] Approved specification and fresh independent review observed through Workflow MCP.
- [x] Deep scope, active profiles, and required planning artifacts confirmed through Workflow MCP.
- [x] CDP-001 through CDP-015 read through requirement tools with all continuations completed.
- [x] Upstream-child restart-before-forward, single-flight, exactly-once, failure, cancellation, and cleanup requirements incorporated.
- [x] Architecture model updated and pinned.
- [x] Quality scenarios updated, parsed as YAML, and pinned.
- [x] Eight packet contracts, dependency order, RED -> GREEN -> PROVE checks, and durable documentation decision updated.
- [x] Final `specification_check_state` passed source `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.

## Packet 01 — Configuration, Capability, And URL Foundations

- [x] RED tests cover per-setting CLI-over-environment precedence, both `--no-*` flags, positive/negative conflicts, invalid pool/host/scheme/raw-argument classes.
- [x] RED tests cover process default false/true and HTTP absent/true/false inheritance and overrides.
- [x] Configuration, capability comparison, authority formatting, and http/ws plus https/wss URL primitives implemented.
- [x] Tests prove scheme selection changes only published URLs and does not create TLS or change the Chromium hop.
- [x] Required PROVE mutations and focused checks passed.

## Packet 02 — Allocator And Typed HTTP Proxy

- [x] RED tests cover concurrent lease selection, exhaustion, immediate external collision, route/method/body/header/authority policy, rewrites, and readiness.
- [x] Every CDP-005 status/code/header/envelope branch has an exact discriminating test, including upstream normalization and timeouts.
- [x] Listener-as-lease allocator and bounded HTTP proxy implemented.
- [x] Rejected or normalized failures expose no protected data or unsupported upstream body/header.
- [x] Required PROVE mutations and focused checks passed.

## Packet 03 — WebSocket Relay And Proxy Shutdown

- [x] Direct WebSocket dependency versions, licenses, lockfile changes, Node support, and audit results recorded.
- [x] RED tests cover connection, message, queue, handshake, close, activity, and shutdown bounds.
- [x] Local close pairs `1001/going_away`, `1002/protocol_error`, `1009/message_too_big`, `1011/internal_error`, and `1013/try_again_later` have fixed redacted reasons.
- [x] Bidirectional relay, backpressure, active counts, connection-local failure, and close-before-release ordering implemented.
- [x] Required PROVE mutations, audit, package verification, and focused checks passed.

## Packet 04 — Initial Bootstrap And Generation State

- [x] RED tests cover internal port handoff, both launch-option paths, ownership challenge, absolute deadline, readiness, and rollback.
- [x] Playwright's remote-debugging-pipe remains present beside the managed loopback TCP endpoint.
- [x] Session-owned unavailable/ready generation state and one-use challenge implemented.
- [x] Required PROVE mutations and focused checks passed.

## Packet 05 — Initial Session Integration And Discovery

- [x] RED tests cover stdio process default, HTTP metadata absent/true/false, capacity ordering, eager readiness, and bridge-info schema.
- [x] Public CLI/environment/metadata contracts and session composition integrated.
- [x] Two simultaneous HTTP sessions remain isolated; pool exhaustion does not lower non-CDP capacity.
- [x] Bridge info advertises the selected scheme without claiming built-in TLS.
- [x] Required PROVE mutations and focused checks passed.

## Packet 06 — Upstream-Child Restart, Activity, And Ordered Cleanup

Existing retained evidence:

- [x] Browser-loss invalidation closes old capability sockets and retains the external lease.
- [x] Accepted CDP requests and frames refresh only the owning HTTP session; quiet sockets do not.
- [x] Ordered session cleanup closes reachability before external port release.

Reopened work:

- [x] RED proves browser loss, local tools, and list-tools do not eagerly start a replacement.
- [x] RED proves the first later browser tool disposes the old child and reaches no upstream before replacement readiness.
- [x] Concurrent browser calls share one restart and each forwards exactly once to one replacement PID.
- [x] Pre-forward restart failure forwards nothing, cleans provisional resources, remains unavailable, and permits a later bounded attempt.
- [x] Post-readiness upstream success and failure remain unchanged; a tool-caused new loss is not retried.
- [x] Replacement preserves immutable session configuration/profile ownership, retains the external port, and rotates internal port, PID, generation, and capability.
- [x] One absolute 60-second bound includes old cleanup through external readiness.
- [x] DELETE, expiry, stdio shutdown, and signals cancel restart and leave no child or provisional owner.
- [x] Tool-list cache hits or current-owner misses never call a disposed client and never initiate restart.
- [x] Required PROVE mutations, focused checks, package verification, and `npm run check` pass.

## Packet 07 — Real-Browser And Distribution Verification

- [x] Packaged Node stdio and two-session HTTP real-browser pairs pass with cloak and playwright.
- [x] Repeated raw `Browser.close` tests deterministically replace the upstream child for both engines before exactly-once tool forwarding.
- [x] Direct http/ws and terminated https/wss discovery and WebSocket paths pass.
- [x] Playwright client disconnect and raw `Browser.close` behavior are separately observed and recorded.
- [ ] Pull-request linux/amd64 Docker default-cloak smoke passes.
- [x] Release linux/amd64 playwright and native linux/arm64 both-engine gates are encoded; unavailable native evidence remains explicitly blocked.
- [x] Workflow lint, security checks, final repository checks, and required PROVE mutations pass.

## Packet 08 — Operator And Developer Documentation

- [x] Canonical configuration, tools, Docker, security, architecture, and entry-point documentation describe verified behavior.
- [x] Process default/HTTP override, negative flags, error semantics, limits, lifecycle, and capability secrecy are explicit.
- [x] Restart-before-forward, stable external lease, replaceable child ownership, exact-once forwarding, and failure recovery are explicit.
- [x] https/wss is documented as publication through an operator-owned same-port TLS terminator; the bridge listener and Chromium hop remain plaintext.
- [x] Open WebUI/Playwright Server incompatibility and client-specific teardown observations are explicit.
- [x] Every affected localization and translation-manifest entry is updated consistently.
- [x] Documentation, SEO, compatibility, translation, and final repository checks pass.

## Final Gate

- [ ] Every CDP-001 through CDP-015 acceptance criterion maps to passing evidence.
- [x] `npm run check` passes without weakened assertions.
- [ ] Required packaged CLI, real-browser, Docker, documentation, and security checks pass for the delivery stage.
- [ ] Final handoff records any remaining release-only evidence honestly.
- [ ] No commit, push, pull request mutation, release, or publication occurred without separate authorization.

Pinned contract: source `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`; specification `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`; review `f008baec-bf84-4454-88db-dab9801e85df`.
