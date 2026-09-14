---
render_macros: false
---

# Packet 02 — Active Docker Health and Failure Handling

Status: Blocked on Packet 01

## Outcome

Declare and implement a bounded Docker health check that verifies the current launcher,
a fresh CLI event-loop response, and, after display demand, a fresh X11 protocol
response. Keep MCP stdio and public HTTP probe contracts untouched.

Requirements: DHM-004, DHM-005, DHM-006, DHM-010, DHM-011.

## Pinned Inputs

- Source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`.
- Specification version: `9624ca40590114349de4999ccf1a35af771e602b7726e277a068e60d8b918931`.
- Review reference: `5444e611-25dd-48d2-bf22-4523cda23641`.
- Dependency: packet 01 completed with passing launcher/admission evidence.

Reopen and recheck the pinned specification and verify packet 01 evidence before
editing. Stop on stale state or incomplete dependency.

## Prerequisite Evidence

- `src/http/server.ts:453-490` owns the public `/healthz` and `/readyz` payloads; their
  schema, authentication, and capacity semantics are frozen.
- Packet 01 owns the launcher/CLI private IPC and the single authoritative display
  state. Health extends that channel; it must not create a second lifecycle authority.
- The image currently has no accepted `HEALTHCHECK`; PID or S6 marker checks do not meet
  DHM-011.

## Allowed Paths

- `Dockerfile`
- packet-01 modules under `src/docker/**`, only for health-specific extensions
- `src/cli.ts`, only for Docker-private event-loop ping registration/teardown
- focused health tests under `tests/unit/**`, `tests/integration/**`, and `tests/e2e/**`
- `package.json` and build-copy configuration only if required to invoke the internal
  probe executable
- `docs/specs/docker-headed-mode/tasks/todo.md` and `handoff.md`

Do not change `src/http/server.ts` response bodies, authentication, readiness capacity
logic, public CLI options, environment variables, MCP tools, ports, or schemas.

## Ownership Boundaries

### Private health channel

- Expose one owner-only Unix socket created and removed by the launcher. Validate peer
  access, current launcher/CLI instance identity, request nonce, and fresh response.
- The launcher sends a bounded ping over the existing private IPC descriptor. The
  response must be scheduled by the CLI event loop itself; a launcher-only heartbeat or
  cached success is insufficient.
- Missing IPC outside Docker stays inactive and does not affect npm execution.
- Channel setup failure is startup failure. Stale socket files, replies from an earlier
  CLI, identity mismatch, shutdown state, or inaccessible channel fail the probe.

### Display probe

- Read display phase only from the launcher authority. In `never_started`, health
  succeeds without Xvfb and never triggers it. In `starting`, `stopping`, or `failed`,
  health fails.
- In `ready`, make a fresh bounded X11 setup handshake over the local Unix socket. Do
  not accept only PID existence, path existence, or the historical readiness result.
- Prefer the smallest Node.js `net` protocol probe needed for X11 setup over installing
  `x11-utils`; do not introduce a runtime package unless the standard-library approach
  is proven insufficient and separately approved.

### Docker health declaration

- Add finite `interval`, `timeout`, `retries`, and `start-period` values that fit the
  internal probe deadlines and documented shutdown budget.
- Probe is read-only and concurrency-safe. It starts no Xvfb, browser, upstream MCP
  child, or HTTP/MCP session and emits no client-visible protocol content.
- A failed health check marks the container unhealthy but does not restart services.
  Terminal CLI/display failures continue to terminate the container through packet 01.

## Test-First Execution

### RED

Add failing tests that observe actual Docker health transitions and distinguish:

- headless-only healthy operation with no Xvfb;
- incomplete startup and display `starting` as unhealthy;
- healthy headed operation and retained-display health after sessions close;
- launcher process alive but CLI `SIGSTOP` or blocked event loop as unhealthy, then
  healthy again after resume and a fresh response;
- live Xvfb with an unresponsive X11 protocol as unhealthy;
- stale socket, stale identity, replayed nonce, missing/inaccessible endpoint, channel
  setup failure, and shutdown as unhealthy;
- concurrent health probes during first headed startup never returning cached
  no-display success and never spawning Xvfb;
- full HTTP session capacity preserving infrastructure health while existing
  `/readyz` returns its unchanged not-ready result;
- simultaneous MCP traffic and health probes preserving protocol bytes and session
  counts.

Directly invoking a probe helper is necessary unit evidence but not sufficient; the
suite must inspect Docker's `starting`, `healthy`, and `unhealthy` states after its
configured failure budget.

### GREEN

Implement the owner-only socket, identity/nonce protocol, CLI event-loop ping, X11
handshake, and image `HEALTHCHECK`. Keep the protocol internal, versioned, bounded, and
small. Reuse packet 01 state/IPC; do not add a second daemon or independent state file.

### PROVE

After GREEN:

- Return a cached CLI success without scheduling the event loop; confirm the SIGSTOP
  scenario fails to detect health, then restore it.
- Accept a stale CLI identity or nonce; confirm the replay test fails, then restore it.
- Replace the X11 handshake with PID/socket existence; confirm the unresponsive-display
  scenario fails, then restore it.
- Let a probe in `never_started` request display startup; confirm the headless absence
  assertion fails, then restore it.
- Change public `/healthz` or `/readyz` payload shape in a temporary mutation; confirm
  existing HTTP contract tests fail, then restore it.

## Focused Verification

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run docker:lint
npm run docker:build
npm run test:e2e:docker:run
npm run check
git diff --check
```

Record the declared health timings and observed transition durations. Redact private
runtime paths or nonce values from diagnostics where disclosure is unnecessary.

## Completion Boundary

Complete packet 02 only when every RED/GREEN/PROVE scenario and focused check passes,
including real Docker health state transitions. Update `todo.md`, replace `handoff.md`,
and stop. Do not start multiarchitecture CI, documentation, commit, or publication
without a new authorized invocation.
