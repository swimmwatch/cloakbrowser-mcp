---
render_macros: false
---

# Docker Headed Mode Implementation Plan

Status: Planned

## Workflow Inputs

- Specification: `docs/specs/docker-headed-mode/spec.md` (`Status: Approved`).
- Depth: `Standard`.
- Active profiles: `core`, `operations`, `security`.
- Planning artifacts: task bundle only.
- Source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`.
- Specification version: `9624ca40590114349de4999ccf1a35af771e602b7726e277a068e60d8b918931`.
- Completeness review: `5444e611-25dd-48d2-bf22-4523cda23641`.
- Workflow state at planning: `pass`; coverage: `reviewed`.

Before every packet, reopen the specification and call `specification_check_state`
with the pinned source version. Stop on stale, unapproved, or unreviewed state.

## Planning Basis

### Approved behavior

- The image uses Tini `v0.19.0` as init and a narrow Docker-only Node.js/TypeScript
  launcher as Tini's main child. Tini forwards signals and reaps adopted children;
  the launcher owns ordered CLI/Xvfb lifecycle and exit classification.
- The launcher passes file descriptors 0, 1, and 2 directly to the CLI. MCP stdio
  traffic is never consumed, buffered, or relayed by the launcher.
- Xvfb is demand-started. A headless-only container never starts it. The first
  effective headed admission starts one shared, bounded readiness attempt. Once ready,
  the same process remains required until container shutdown.
- HTTP authentication, initialize metadata validation, and capacity admission happen
  before a request can trigger Xvfb. Concurrent headed requests share one startup;
  cancelling one waiter does not cancel it for the others.
- Unexpected Xvfb exit after display demand is terminal. There is no restart or
  fallback to headless mode.
- Docker health uses an owner-only local channel, a fresh CLI event-loop response, and,
  after display demand, a fresh X11 protocol response. It does not use MCP stdin/stdout,
  create sessions, start a browser, or start Xvfb.
- Existing HTTP `/healthz` and `/readyz` schemas and authentication remain unchanged.
  Capacity exhaustion alone does not make Docker health fail.
- A shared X server is not a tenant boundary. Existing Playwright page/context
  isolation remains required, but native X11 focus, clipboard, and display capture are
  not promised as per-session isolation.

### Repository evidence

- `Dockerfile:25-123` contains an incomplete S6 Overlay implementation that must be
  removed rather than adapted.
- `docker/s6-overlay/**` and the S6-specific assertions in
  `tests/e2e/docker-image.manual.ts:25-55` are obsolete partial work.
- `src/bridge/config.ts:254` resolves effective `headless` using the existing option
  override and environment default.
- `src/server.ts:61-63` prepares runtime configuration before connecting the upstream
  stdio child. This is the stdio headed-admission boundary.
- `src/http/server.ts:276-301` validates metadata and reserves capacity before creating
  a session bridge; `src/http/server.ts:350-377` applies per-session option precedence;
  `src/http/server.ts:445-451` owns session disposal.
- `src/http/server.ts:453-490` owns the public health/readiness schemas that must not
  change.
- `src/cli.ts:14-56` owns CLI transport startup and application signal handling.
- `tests/integration/streamable-http.test.ts:218-229` already verifies independent
  per-session headless metadata with the fake upstream.
- `tests/e2e/dockerHarness.ts` is an untracked, partial S6-oriented harness;
  `tests/e2e/distributionHarness.ts` and
  `scripts/compare-playwright-mcp-bridge.mjs` contain current Docker invocation paths.
- `.github/workflows/ci.yml:167-265` already builds separate `linux/amd64` and
  `linux/arm64` images and retains parity, Trivy, SARIF, and required-job checks.
- Public Docker commands still recommend external `--init` across the English and
  localized documentation set.

All line references are from the planning snapshot. The worktree contains unrelated
user changes. Every executor must reread the scoped diff and patch only packet-owned
lines.

## Verified External Input

Tini `v0.19.0` official release assets are pinned per target architecture:

| Target | Asset | SHA-256 |
| --- | --- | --- |
| `amd64` | `tini-amd64` | `93dcc18adc78c65a028a84799ecf8ad40c936fdfc5f2a57b1acda5a8117fa82c` |
| `arm64` | `tini-arm64` | `07952557df20bfd2a95f9bef198b445e006171969499a1d361bd9e6f8e5e0e81` |

Authoritative references:

- `https://github.com/krallin/tini/releases/tag/v0.19.0`
- `https://github.com/krallin/tini/tree/v0.19.0`
- `https://github.com/krallin/tini/blob/v0.19.0/src/tini.c`

Run bundled Tini with `-s` so it registers as a subreaper when an external
`docker --init` places it below PID 1. Do not use `-g`; the launcher owns ordered
forwarding and escalation. Keep Tini verbose output disabled because it can use
`stdout`.

## Target Architecture

```text
container PID 1: tini -s -- node dist/docker/launcher.js <original CLI args>
                           |
                           +-- CLI (inherited fd 0/1/2, private IPC fd)
                           |     |
                           |     +-- existing stdio or Streamable HTTP bridge
                           |
                           +-- Xvfb (only after effective headed demand)

Docker HEALTHCHECK
  -> owner-only Unix socket in launcher
     -> fresh CLI event-loop ping over private IPC
     -> fresh X11 setup handshake only when launcher state is not never-started
```

The launcher is the single authority for display phase:
`never_started -> starting -> ready -> stopping`, with terminal `failed` behavior.
All simultaneous headed admissions await the same startup promise. A session may stop
waiting without changing that shared attempt. No public configuration or protocol
surface is added.

## Implementation Units

| Unit | Ownership | Main dependencies | Requirements | Evidence |
| --- | --- | --- | --- | --- |
| Tini image contract | Downloads and verifies one official binary, makes Tini the image entrypoint, removes S6 assets/configuration, preserves non-root runtime and CLI arguments. | `Dockerfile`, `.dockerignore`, packaged CLI build. | DHM-002, DHM-004, DHM-005, DHM-010 | Image config, process tree, help/error exits, normal and external-init signal checks. |
| Docker launcher | Owns CLI/Xvfb child groups, display state, single-flight startup, readiness, terminal failure, bounded ordered shutdown, cleanup, and exit status. | Tini, Xvfb, internal control protocol. | DHM-001, DHM-003, DHM-004, DHM-005, DHM-010 | Unit lifecycle state tests plus local Docker fault injection. |
| Headed admission gate | Requests display only after effective mode is known; integrates stdio before upstream connection and HTTP after validation/capacity admission but before bridge creation. | Existing config precedence and launcher IPC. | DHM-001, DHM-002, DHM-003, DHM-006 | Unit/integration concurrency and cancellation tests. |
| Active health | Runs read-only bounded probes through an owner-only socket, a fresh CLI event-loop ping, and conditional X11 setup handshake. | Launcher identity/state, CLI IPC, X11 protocol. | DHM-004, DHM-005, DHM-006, DHM-011 | Direct probe tests and observed Docker health transitions. |
| Docker acceptance | Exercises real CloakBrowser stdio/HTTP, concurrent session isolation, faults, restricted runtime, and both architectures. | Completed launcher and health behavior. | DHM-001-DHM-008, DHM-010, DHM-011 | Local amd64 E2E and required remote amd64/arm64 jobs. |
| Operator documentation | Removes external-init guidance and documents demand-start, retention, limits, health guarantees, writable paths, and recovery. | Proven image behavior and health settings. | DHM-002, DHM-005, DHM-009-DHM-011 | Built English/localized docs and stale-guidance search. |

## Packet Order

1. `01_tini_launcher_and_display_lifecycle.md` — replace S6 with Tini and implement
   the narrow launcher, demand-started Xvfb, stdio/HTTP admission gate, and bounded
   lifecycle.
2. `02_active_health_and_failure_handling.md` — add private active health plumbing,
   conditional X11 probing, Docker health declaration, and health/failure evidence.
3. `03_multiarch_acceptance_and_ci.md` — finish real-browser concurrency and
   restricted-runtime coverage, run the same image suite in both architecture jobs,
   and retain existing CI security/parity steps.
4. `04_documentation.md` — update public Docker guidance, all affected localizations,
   generated documentation, and the durable lifecycle/health explanation.

Packet 02 depends on packet 01. Packet 03 depends on packets 01 and 02. Packet 04 may
prepare prose after packets 01 and 02 pass locally, but the workstream cannot complete
until packet 03 has both architecture results.

## Requirement Coverage

| Requirement | Owning packet(s) |
| --- | --- |
| DHM-001 | 01, 03 |
| DHM-002 | 01, 03, 04 |
| DHM-003 | 01, 03 |
| DHM-004 | 01, 02, 03 |
| DHM-005 | 01, 02, 03, 04 |
| DHM-006 | 01, 02, 03 |
| DHM-007 | 03 |
| DHM-008 | 03 |
| DHM-009 | 04 |
| DHM-010 | 01, 02, 03, 04 |
| DHM-011 | 02, 03, 04 |

## Compatibility, Recovery, and Rollback

- Existing CLI options, environment variables, MCP schema, tool forwarding, local
  tools, output paths, profiles, proxies, extensions, HTTP authentication, TLS, and
  session capacity semantics stay unchanged.
- Runtime diagnostics stay on `stderr`; stdio `stdout` remains MCP-only. Internal
  control channels are absent and inactive outside the project Docker launcher.
- Xvfb startup or post-start loss fails the container. Health failures do not restart
  services; orchestration recovery is outside the image contract.
- Rollback is image rollback to the preceding release. There is no data migration;
  existing `/data` and CloakBrowser cache mounts remain compatible.

## Durable Documentation Decision

Durable documentation is required because the behavior spans image init, launcher/CLI
ownership, per-session HTTP admission, active health, shutdown deadlines, and a
non-obvious keep-started display policy. Packet 04 updates the nearest authoritative
Docker/configuration/security pages and their localized counterparts. No separate ADR
is planned: the approved specification already records the selected architecture and
rejected S6/custom-init alternatives.

## Manual Gates

- GitHub CI must report successful Docker jobs for both `linux/amd64` and
  `linux/arm64` before DHM-007 and the workstream can be complete. A QEMU or
  architecture-specific real-browser failure remains a failure; do not skip or
  downgrade the required scenario.
- Commit, push, pull request, approval, merge, publication, and release actions require
  separate explicit user authorization and are outside these packets.
