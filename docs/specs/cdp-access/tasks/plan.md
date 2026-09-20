---
render_macros: false
---

# Managed CDP Access Implementation Plan

Status: Replanned against the current Approved specification. Packet 06 is reopened and ready only for a separate explicit implementation invocation. Packets 07 and 08 remain pending.

Planning does not authorize production changes, dependency changes, commits, pull requests, releases, or publication.

## Pinned Inputs

- Source version: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.
- Specification version: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`.
- Independent review reference: `f008baec-bf84-4454-88db-dab9801e85df`.
- Specification state: `Approved`; workflow check `pass`; coverage `reviewed`; no reported issues.
- Planning depth: `deep`.
- Active profiles: `core`, `backend`, `operations`, `security`, `cross-surface`.
- Required planning artifacts: `architecture/model.dsl`, `quality/scenarios.yaml`.

Every implementation invocation must reopen `cdp-access` through Engineer Agent Workflow MCP and call `specification_check_state` with the pinned source version. Stop and return to specification work if approval, versions, review freshness, confirmed scope, or required artifacts differ.

## Replanning Trigger

Packet 07 real-browser evidence showed that raw CDP `Browser.close` can leave the CloakBrowser upstream child unable to create a usable replacement target. The approved contract now requires a bounded upstream-child restart before the first later `browser_*` tool is forwarded.

Existing code does the opposite:

- `src/server.ts:110-130` forwards to one fixed upstream client first and only attempts CDP bootstrap after a successful result.
- `src/server.ts:170-227` retains the initial runtime and client for the lifetime of the bridge server.
- `src/cdp/session.ts:102-140` stores runtime, upstream owner, Chromium client, host, and internal port as immutable fields.
- `src/cdp/session.ts:149-164` can coalesce CDP bootstrap, but cannot replace the upstream child/runtime owner.
- `src/server.ts:366-378` discards the `StdioClientTransport` after connection, while the installed SDK transport owns bounded stdin, SIGTERM, and SIGKILL child shutdown.

Packets 01-05 and the activity/cleanup portion of Packet 06 have existing implementation evidence in `todo.md` and the worktree. This replan does not re-execute or certify that production work. Packet 06 is reopened only for the newly approved restart delta and affected regression coverage.

## Approved Restart Contract

- Browser loss immediately invalidates the current capability and sockets, but does not start a replacement by itself.
- The first later upstream `browser_*` call starts one session-scoped restart. Concurrent browser calls share that restart attempt.
- Restart makes the old child and browser unreachable, completes bounded cleanup, reserves a fresh internal port, creates a replacement runtime and child with the same session configuration/profile ownership, performs bootstrap and ownership proof, then publishes a fresh capability.
- The external proxy listener and leased external port remain owned by the MCP session throughout restart.
- No waiting request is forwarded to the known-lost child. After readiness, every waiter is forwarded to the replacement exactly once.
- A pre-forward restart failure fails the waiting MCP request through the existing request-failure surface, leaves CDP unavailable, cleans provisional resources, and permits one new attempt on a later call.
- After readiness, upstream success or failure is returned unchanged. A forwarded tool that causes a new browser loss is not retried and invalidates the just-published generation.
- Local tools, tool listing, discovery reads, ordinary CDP disconnects, and browser loss alone never trigger restart.
- Session shutdown or expiry cancels and wins against restart without leaving a replacement child or releasing the external lease before reachability closes.
- The complete restart, including old-owner cleanup and new readiness, shares the 60-second bound.

## Architecture Ownership

The authoritative runtime topology and sequences are in `architecture/model.dsl`.

| Unit | Ownership and boundary | Inputs and outputs | Lifecycle, errors, invariants | Requirements |
| --- | --- | --- | --- | --- |
| CDP configuration | `src/cdp/config.ts` with CLI, HTTP, and bridge adapters | CLI/env/metadata to validated process/session configuration | Existing completed boundary; disabled-by-default and validation remain unchanged | CDP-001, CDP-011, CDP-012 |
| External proxy and lease | `src/cdp/allocator.ts`, `src/cdp/httpProxy.ts`, `src/cdp/webSocketProxy.ts` | Stable external listener, generation publication/invalidation, activity | Survives child restart; old generation is unreachable before any replacement; lease releases only at session cleanup | CDP-002, CDP-004-CDP-010, CDP-013 |
| Replaceable upstream generation owner | `src/cdp/session.ts`, `src/cdp/types.ts` | Factory callbacks create internal reservation, runtime, upstream client, and Chromium client | Owns exactly one current child/runtime/internal endpoint; bounded disposal precedes replacement; provisional owner rolls back completely | CDP-003, CDP-007-CDP-009, CDP-013 |
| Stable session coordinator | `ManagedCdpSessionRuntime` in `src/cdp/session.ts` | Browser-tool call, probe, snapshot, dispose | Owns restart single-flight, waiting calls, generation counter, cancellation, exact-once forwarding, stable proxy/lease | CDP-002, CDP-007-CDP-010, CDP-013 |
| MCP composition | `src/server.ts` | Tool list/call requests and unchanged upstream results | Managed browser calls route through the coordinator; unmanaged mode remains fixed-client passthrough; list cache never calls a disposed client | CDP-009, CDP-011, CDP-012 |
| Verification fixtures | fake upstream, lifecycle integration, packaged real-browser harness | Child PID, forwarding records, readiness and cleanup observations | Distinguish old/new children, no pre-readiness forwarding, no overlap or leak | CDP-009, CDP-013, CDP-014 |
| Operator and developer documentation | existing README and docs set | Verified configuration, lifecycle, safety, client examples | Packet 08 runs only after Packet 07 records final real-browser behavior | CDP-012, CDP-014, CDP-015 |

### Dependency Direction

`src/cdp/session.ts` owns lifecycle policy through injected factories and small owner interfaces. It may depend on Node platform APIs but must not import the Streamable HTTP controller or rewrite upstream MCP tool contracts. `src/server.ts` adapts MCP SDK clients/transports into those owners and keeps SDK result types at the composition boundary.

The coordinator owns the stable external proxy and lease. A replaceable generation owner contains only the current internal reservation handoff, generated bridge runtime, upstream client/transport, Chromium discovery client, and generation readiness. The external proxy never owns child restart policy.

No global mutex is added. Only restart creation is single-flight per session; after shared readiness, waiting browser-tool calls proceed under the existing upstream concurrency contract.

## Packet Order

| Packet | Current outcome | Dependency | Planning status |
| --- | --- | --- | --- |
| 01 | Configuration, capability, URL foundations | Current specification compatibility | Completed evidence retained; no re-execution authorized |
| 02 | Process-local allocator and typed HTTP proxy | 01 | Completed evidence retained |
| 03 | WebSocket relay and proxy shutdown | 02 | Completed evidence retained |
| 04 | Initial browser bootstrap and generation state | 01-03 | Completed evidence retained |
| 05 | Stdio/HTTP integration and discovery | 04 | Completed evidence retained |
| 06 | Upstream-child restart, activity, ordered cleanup | 05 | Reopened; ready only for explicit Packet 06 implementation |
| 07 | Real-browser and distribution verification | Revised 06 complete | Paused pending Packet 06 evidence |
| 08 | Operator and developer documentation | 07 complete | Pending |

No packet authorizes another packet, commit, push, pull request, release, or publication. Each implementation invocation stops after its packet and updates `todo.md` and `handoff.md`.

## Requirement Coverage

| Requirement | Owning units | Packets | Discriminating scenarios |
| --- | --- | --- | --- |
| CDP-001 | configuration, capability, composition | 01, 05 | CDP-QS-001, 004, 011 |
| CDP-002 | allocator, coordinator, composition | 02, 04-07 | CDP-QS-002, 009, 012 |
| CDP-003 | generation owner and discovery | 04, 06, 07 | CDP-QS-003, 008, 012 |
| CDP-004 | allocator and ordered cleanup | 02, 05, 06 | CDP-QS-002, 010 |
| CDP-005 | HTTP proxy and WebSocket relay | 01-03, 07 | CDP-QS-004-007 |
| CDP-006 | capability and authority policy | 01-03 | CDP-QS-004, 005, 011 |
| CDP-007 | admission and replacement readiness | 04-06 | CDP-QS-003, 007, 008 |
| CDP-008 | coordinator and bridge info | 04-07 | CDP-QS-005, 008 |
| CDP-009 | replaceable owner, single-flight restart, cleanup | 03, 04, 06, 07 | CDP-QS-008, 010, 012 |
| CDP-010 | relay and concurrent MCP/CDP composition | 03, 06, 07 | CDP-QS-006, 009, 012 |
| CDP-011 | validation and launch path | 01, 04, 06, 07 | CDP-QS-001, 003, 012 |
| CDP-012 | composition and delivery | 01, 02, 05-08 | CDP-QS-001, 002, 012, 013 |
| CDP-013 | bounds, cancellation, logging, cleanup | 02-07 | CDP-QS-004, 006-008, 010, 011 |
| CDP-014 | all verification layers | 01-07 | CDP-QS-001-013 |
| CDP-015 | verified operator documentation | 07, 08 | CDP-QS-012, 013 |

## Verification Strategy

Packet 06 follows RED, GREEN, PROVE:

1. Add fake-owner and fake-upstream checks that execute the intended forwarding assertions before implementation.
2. Observe the current failure: fixed-client forwarding occurs before any child replacement, and concurrent unavailable calls cannot share a child restart.
3. Implement the smallest replaceable-owner and session-coordinator change that satisfies the approved lifecycle.
4. Correct implementation while any correct check fails; do not weaken recovery or exact-once assertions.
5. Apply Packet 06 mutations for eager restart, forward-before-readiness, duplicate forwarding, retained old child, released external lease, and shutdown-loses-to-restart.
6. Run focused unit/integration checks and the full repository check named in Packet 06.

Packet 07 then reruns the original CloakBrowser raw-close scenario repeatedly and completes the engine/transport, TLS, Docker, and delivery-stage matrix. A one-off pass is not sufficient evidence for deterministic replacement.

## Compatibility, Rollout, Recovery, And Security

- Default and non-CDP behavior remain unchanged. Managed restart exists only inside a CDP-enabled MCP session after known browser loss.
- The same session configuration, engine, profile ownership, proxy settings, headless mode, extensions, and related runtime options create the replacement child.
- Tabs, in-memory state, and other state lost with the terminated browser are not restored.
- The external port and session capability route stay unavailable during restart; the capability rotates only after readiness.
- Capability URLs, child arguments, profile paths, and upstream diagnostics remain redacted.
- Restart failure is session-local and retryable only by a later browser-tool call. There is no background loop.
- Existing upstream tool schemas and successful/failing tool payloads remain unchanged after forwarding.
- Rollback before release removes the new restart routing while preserving already verified disabled-mode behavior. External release rollback remains a separately authorized operation.

## Risks And Controls

| Risk | Planned control |
| --- | --- |
| Waiting requests reach the old child | Dispose old owner before replacement creation; zero-call assertion on old fake owner |
| Two concurrent requests create two children | One session-scoped restart promise; child PID and factory-call cardinality assertions |
| Tool is forwarded twice | Per-request forwarding counters and post-readiness exactly-once assertions |
| Cleanup or readiness exceeds the bound | One absolute 60-second deadline covers old cleanup through external readiness |
| Shutdown leaves a replacement child | Abort restart, await/observe provisional cleanup, assert no live child/listener before completion |
| Tool listing calls a disposed client | Cache successful pages or route cache misses through the current owner |
| External port is released during restart | Stable proxy/lease owner separate from replaceable generation owner |
| Replacement loses configuration/profile ownership | Capture immutable session options once and compare fake/real replacement launch evidence |
| Sensitive lifecycle data reaches logs | Existing redaction plus unique-sentinel error and stderr checks |
| Platform claims exceed evidence | Packet 07 separates local, pull-request, and release-only evidence |

## Durable Documentation Decision

Durable developer documentation remains warranted. The behavior crosses the MCP caller, bridge, replaceable upstream child, Chromium, external proxy, optional TLS terminator, and CDP client. The restart-before-forward rule and stable-external/replaceable-internal ownership would be expensive to rediscover and can otherwise look like an unnecessary child restart. Packet 08 updates the nearest authoritative documents only after Packet 07 verifies the behavior.

## Completion Boundary

Planning is complete when both manifest-listed artifacts and all packet contracts match the pinned Approved specification and final workflow check. Implementation remains incomplete. The next authorized action is a separate explicit Packet 06 incremental-implementation invocation. Packet 07, Packet 08, commit, push, pull request, release, and publication remain unauthorized.
