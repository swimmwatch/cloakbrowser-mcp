---
render_macros: false
---

# Packet 01 — Tini, Launcher, and Display Lifecycle

Status: Ready

## Outcome

Replace the incomplete S6 image path with pinned Tini and a narrow Docker-only
TypeScript launcher. Implement demand-started, single-flight, retained Xvfb and insert
the headed-admission gate at the stdio and HTTP ownership boundaries without changing
public CLI, MCP, or configuration contracts.

Requirements: DHM-001, DHM-002, DHM-003, DHM-004, DHM-005, DHM-006, DHM-010.

## Pinned Inputs

- Source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`.
- Specification version: `9624ca40590114349de4999ccf1a35af771e602b7726e277a068e60d8b918931`.
- Review reference: `5444e611-25dd-48d2-bf22-4523cda23641`.
- Tini: `v0.19.0`.
- `tini-amd64` SHA-256:
  `93dcc18adc78c65a028a84799ecf8ad40c936fdfc5f2a57b1acda5a8117fa82c`.
- `tini-arm64` SHA-256:
  `07952557df20bfd2a95f9bef198b445e006171969499a1d361bd9e6f8e5e0e81`.

Before editing, reopen the specification and call `specification_check_state` with the
pinned source version. Stop on stale, unapproved, or unreviewed state.

## Prerequisite Evidence

- `Dockerfile:25-123` and `docker/s6-overlay/**` are partial S6 work to remove.
- `tests/e2e/docker-image.manual.ts:25-55` asserts S6-specific process paths and must be
  replaced, while its stdio timeout remains valid RED evidence.
- `src/bridge/config.ts:254` is the existing effective-headless resolution point.
- `src/server.ts:61-63` must not connect the upstream process for headed stdio until the
  shared display is ready.
- `src/http/server.ts:276-301` performs metadata validation and capacity reservation;
  the display gate belongs after those steps and before `createBridgeServer`.
- `src/http/server.ts:445-451` disposes a session and must not stop shared Xvfb.
- `src/cli.ts:14-56` owns application startup and signal behavior.

## Allowed Paths

- `Dockerfile`
- `.dockerignore`
- `docker/**` only to delete S6 assets and add launcher runtime assets if build output
  requires them
- `src/cli.ts`
- `src/server.ts`
- `src/bridge/config.ts`
- new narrow modules under `src/docker/**`
- focused tests under `tests/unit/**`, `tests/integration/**`, and `tests/e2e/**`
- `package.json`, `package-lock.json`, and existing Docker invocation scripts only where
  required to build or exercise the launcher
- `docs/specs/docker-headed-mode/tasks/todo.md` and `handoff.md` for packet evidence

Do not edit public documentation, CI workflow, MCP schemas, public options, or add a
runtime dependency. Preserve unrelated user changes in every allowed file.

## Ownership Boundaries

### Tini image contract

- Download exactly one official target binary in a build stage selected by
  `TARGETARCH`; reject unsupported targets and checksum mismatch.
- Install Tini without curl or verification tooling remaining in the runtime image.
- Set the entrypoint to Tini with `-s`, launcher as its main child, and keep CLI
  arguments as the final command arguments. Do not use `-g` or verbose environment.
- Preserve runtime `USER node`, current `PLAYWRIGHT_MCP_*` and
  `CLOAK_PLAYWRIGHT_MCP_*` defaults, `/data`, browser cache ownership, and no added
  capability or host display mount.

### Launcher lifecycle

- Spawn the CLI with inherited fd 0/1/2 and one private extra IPC descriptor. Do not
  inspect, pipe, relay, or normalize protocol bytes.
- Install signal and child-exit handling before exposing work. Own CLI and Xvfb process
  groups, idempotent shutdown, bounded graceful wait, and bounded escalation.
- Preserve normal CLI exit status and conventional `128 + signal` status unless an
  independent display/startup/cleanup failure already requires nonzero container exit.
- Implement a single authoritative display state and one shared startup promise. Xvfb
  has no TCP listener, runs as `node`, uses owner-only runtime state, and is considered
  ready only after an active X11 response, not a PID or socket marker.
- Never start Xvfb for `never_started`; once `ready`, keep it until launcher shutdown.
  Startup failure and unexpected post-start exit are terminal and never retried.

### CLI admission integration

- Outside the Docker launcher, missing IPC is a no-op and npm package behavior is
  unchanged.
- Stdio requests display after effective headless resolution and before upstream
  connection.
- HTTP requests display after authentication, initialize validation, and capacity
  reservation, but before bridge creation. Concurrent headed requests share the same
  launcher result. A disconnected waiter stops waiting locally without cancelling the
  startup or other waiters.
- Shutdown rejects new display requests and settles all pending requests within the
  launcher budget. Session disposal never sends a stop-display request.

## Test-First Execution

### RED

1. Preserve the existing Docker stdio test failure against the current S6 image:
   client MCP initialization times out because the CLI receives `/dev/null` instead of
   the client stdin pipe.
2. Replace S6 assertions with failing behavioral tests for:
   - Tini/launcher image config and unchanged CLI arguments;
   - headless stdio and HTTP browser work with no Xvfb process or X socket;
   - first headed stdio admission waiting for an active display;
   - HTTP validation/capacity rejection not triggering display;
   - simultaneous headed admissions sharing one spawn and cancellation not cancelling
     the shared startup;
   - display retained after all headed sessions close and reused later;
   - startup failure, post-start exit, shutdown during startup, repeated signals, exit
     status, and descendant cleanup;
   - inherited stdin/stdout byte preservation for Unicode, CRLF, large input,
     backpressure, and EOF.
3. Add unit tests for the display state machine and launcher exit arbitration. Harness
   or import failures are not valid RED evidence.

### GREEN

Implement only the image, launcher, and admission behavior described above. Use the
Node.js standard library and existing project code; do not add a supervisor framework,
generic service registry, restart policy, public configuration, or new npm dependency.
Remove obsolete S6 files and environment variables completely.

### PROVE

After GREEN:

- Mutate a test-only launcher fixture to consume one stdin byte; confirm the stdio byte
  preservation test fails, then restore it.
- Mutate the single-flight fixture to allow two Xvfb spawns; confirm the concurrent
  headed-admission assertion fails, then restore it.
- Mutate readiness to accept only a socket/PID marker; inject an unresponsive X server
  and confirm the readiness test fails, then restore it.
- Mutate session disposal to request display stop; confirm the retained/reuse test
  fails, then restore it.
- Mutate display-failure exit arbitration so later CLI exit 0 masks it; confirm the
  terminal-failure test fails, then restore it.

## Focused Verification

Run from the repository root:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run docker:lint
npm run docker:build
npm run test:e2e:docker:run
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
npm run check
git diff --check
```

Expected evidence includes clean MCP stdout, unchanged public contracts, no Xvfb in
headless-only work, one retained Xvfb after first headed demand, correct failure/exit
classification, and no surviving owned process after container exit. Local evidence is
amd64-only unless the current Docker runtime actually executes arm64.

## Completion Boundary

Complete packet 01 only when RED, GREEN, required PROVE mutations, and all focused
checks pass. Replace `handoff.md` with current evidence and update `todo.md`. Stop; do
not begin active health, CI, documentation, commit, or publication work without a new
authorized invocation.
