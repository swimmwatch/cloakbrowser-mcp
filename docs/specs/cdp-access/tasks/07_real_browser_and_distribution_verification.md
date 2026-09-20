---
render_macros: false
---

# Packet 07 — Real-Browser And Distribution Verification

Status: Paused until the revised Packet 06 upstream-child restart has complete evidence. Resume only through a separate explicit Packet 07 invocation.

## Outcome

Add the required real-Chromium, packaged Node, Docker, engine/transport, advertised-scheme, teardown, architecture, and delivery-stage gates. This packet may correct defects exposed by its checks only within already planned CDP ownership paths; it must not broaden the public contract.

Requirements: CDP-002, CDP-003, CDP-005, CDP-006, CDP-009, CDP-010, CDP-011, CDP-012, CDP-013, CDP-014, CDP-015.

## Pinned Inputs

- Source version: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.
- Specification version: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`.
- Review reference: `f008baec-bf84-4454-88db-dab9801e85df`.
- Required dependency evidence: revised Packet 06 complete against the current pins in `todo.md` and current `handoff.md`.

## Prerequisite Evidence

- `tests/e2e/distributionHarness.ts` owns packaged CLI process composition.
- `tests/e2e/playwright-console.manual.ts:33` is the current real Playwright probe and does not cover managed CDP.
- `tests/e2e/dockerHarness.ts:120-181` publishes only the MCP port and needs explicit one-to-one CDP range publication.
- `tests/e2e/docker-image.manual.ts:35` is the current Docker distribution suite.
- `.github/workflows/ci.yml:49-72` owns the existing platform/Node quality matrix and package verification.
- `.github/workflows/release.yml:37-39` owns multi-architecture image targets and release validation.
- Revised Packet 06 must provide fake-upstream evidence for bounded old-child disposal, single-flight replacement, pre-readiness zero forwarding, exactly-once post-readiness forwarding, and shutdown cancellation.
- `tests/e2e/cdp-access.manual.ts:114-157` is partial RED evidence: Playwright recovery passed, while repeated CloakBrowser raw-close recovery remained nondeterministic under the superseded same-child behavior.

Recheck line evidence, workflow pins, dependency checks, and the full worktree before editing.

## Scope

Allowed test, fixture, script, dependency, and workflow paths:

- `tests/e2e/cdp-access.manual.ts`
- `tests/e2e/cdp-docker.manual.ts`
- `tests/e2e/distributionHarness.ts`
- `tests/e2e/dockerHarness.ts`
- `tests/e2e/docker-image.manual.ts`
- a narrowly scoped test TLS-terminator fixture under `tests/fixtures/`
- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

Production paths may be corrected only when a real-browser check proves an implementation defect within `src/cdp/**`, `src/server.ts`, `src/http/server.ts`, `src/bridge/config.ts`, or `src/bridge/tools.ts`. Record the failing evidence and keep the fix inside the approved contract.

Required planning updates: `tasks/todo.md`, `tasks/handoff.md`.

Non-goals: tags, releases, publication, QEMU reported as native runtime evidence, Open WebUI support, Playwright Server gateway, broad refactoring, public documentation, commits, pushes, or pull requests.

## Required Runtime Matrix

Pull-request evidence:

| Distribution | MCP transport | Browser engine | Required observations |
| --- | --- | --- | --- |
| Packaged Node | stdio | cloak | Eager bootstrap, managed TCP endpoint, retained Playwright pipe, shared MCP/CDP state, deterministic upstream-child replacement, cleanup |
| Packaged Node | Streamable HTTP, two sessions | playwright | Distinct children, ports, capabilities, profiles, process-default/metadata override behavior, cross-session isolation |
| Packaged Node | stdio | playwright | Launch-option preservation, deterministic upstream-child replacement, teardown |
| Packaged Node | Streamable HTTP, two sessions | cloak | Launch-option preservation, isolation, concurrent MCP/CDP observation |
| Packaged Node | selected supported transport | both | Direct http/ws and test-terminated https/wss discovery plus real browser WebSocket; bridge and Chromium hops remain plaintext |
| Docker linux/amd64 | selected supported transport | default cloak | One-to-one published range, real discovery, real browser WebSocket, disabled session consumes no port |

Exercise an isolated persistent profile at least once per engine rather than multiplying it across every pair.

Release-only evidence:

- Docker linux/amd64 real-browser smoke with the playwright engine.
- Native linux/arm64 real-browser smoke with cloak and playwright engines.
- Arm64 image build remains mandatory when no native runner is available, but it is not runtime evidence. Missing native execution remains an explicit release blocker.

## Test-First Execution

### RED

1. Add a real-browser harness that starts packaged stdio or Streamable HTTP, invokes `cloakbrowser_bridge_info`, connects with Playwright `chromium.connectOverCDP`, and observes owned process/socket behavior without logging the capability.
2. Add state-sharing tests for page, cookie, storage, target events, multiple CDP clients, and non-conflicting concurrent reads.
3. Add two-session isolation and persistent-profile cases from the matrix, including process default true with explicit session false and process false with explicit session true.
4. Add launch evidence that bridge-managed TCP CDP coexists with Playwright's `--remote-debugging-pipe` in both engine paths.
5. Add a substituted-endpoint ownership failure against real browser startup.
6. Add direct http/ws and test-terminated https/wss cases. Assert the terminator preserves the leased port, Host, Origin, and one-to-one session routing while both downstream hops remain plaintext.
7. Add separate teardown cases for Playwright client's `browser.close()` and raw CDP `Browser.close`. For raw close, record the old and replacement upstream child PIDs, prove no eager child starts, then prove the first later browser tool is forwarded exactly once only after replacement readiness. Do not assume the two client teardown paths are equivalent.
8. Add Docker range-publication WebSocket smoke tests and disabled-session no-port assertions.
9. Add CI/release matrix jobs that execute the exact delivery-stage cases and fail closed on missing required evidence.

### GREEN

Make the harness, distribution scripts, and workflows satisfy the matrix. Correct only implementation defects demonstrated by RED evidence and rerun the owning lower-level packet checks. Do not change specification acceptance to fit observed behavior.

### PROVE

- Skip one engine-specific real-browser pair; confirm matrix completeness fails, then restore.
- Reuse one profile or port across two HTTP sessions; confirm isolation fails, then restore.
- Skip ownership challenge validation; confirm the substituted-endpoint check fails, then restore.
- Publish https/wss without routing through the TLS fixture, or terminate TLS inside the bridge; confirm topology checks fail, then restore.
- Let the terminator route one session capability to another port; confirm the isolation check fails, then restore.
- Treat Playwright `browser.close()` as raw `Browser.close` without observing it; confirm separate teardown expectations fail, then restore.
- Reuse the old upstream child after raw `Browser.close`; confirm the PID/order assertion fails, then restore.
- Permit one waiting browser tool to reach the child before replacement readiness; confirm the exactly-once ordering assertion fails, then restore.
- Mark emulated or absent arm64 execution as native; confirm evidence classification fails, then restore.

## Focused And Final Verification

Run locally where prerequisites exist:

```bash
npm run build
npm run package:verify
npm run test:e2e:run
npm run test:e2e:docker:run
npm run bridge:compare
npm run check
git diff --check
```

After workflow edits, also run:

```bash
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
```

Record host architecture, engine, transport, browser version, advertised scheme path, and every skipped or unavailable environment. An environmental failure remains a failed required check for that delivery stage.

## Manual Gates

- `MANUAL GATE — remote CI`: read back required pull-request results only after a separately authorized push/PR operation. This packet does not authorize one.
- `MANUAL GATE — release`: native arm64 and release-only amd64 evidence executes only in a separately authorized release workflow. Do not publish merely to obtain evidence.

## Completion Boundary

Complete local packet work only when both engines repeatedly pass the raw-close replacement scenario, every locally available RED, GREEN, PROVE, and final check passes, and workflows encode the remote gates. `handoff.md` must list remote PR/release evidence as pending until actually observed. Stop before documentation or external mutation.
