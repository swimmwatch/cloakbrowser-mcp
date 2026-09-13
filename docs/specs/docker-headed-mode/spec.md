# Docker Headed Mode

Status: Approved

Revision note: the user selected Tini with a narrow Xvfb/MCP lifecycle module on
2026-09-13. Earlier approval and review receipts apply only to the previous S6
revision. This update does not authorize implementation or replanning.

## Outcome

Docker distributions of `cloakbrowser-mcp` provide a container-local Xvfb display
on the first effective headed admission, then keep it until container shutdown.
Headless-only operation does not start Xvfb. Existing headed-browser configuration
works through stdio and Streamable HTTP. Current CLI, MCP, configuration, security,
and default headless behavior remain unchanged.

The container MUST use Tini for init responsibilities and a narrow Docker-only
Node.js/TypeScript module to manage Xvfb and the existing MCP CLI. The project MUST
NOT implement its own init or a general-purpose service supervisor. HTTP sessions,
upstream children, and browser behavior remain owned by the existing application.

## Supported Platforms

- Docker runtime: `linux/amd64` and `linux/arm64`.
- Node package execution outside the project Docker image is unchanged.
- Both stdio and Streamable HTTP transports remain supported.

## Requirements

### DHM-001: Demand-started, retained virtual display

Xvfb MUST NOT start for a headless-only container. Use the effective browser mode
after existing validation and precedence, not only the process environment.
A stdio headed runtime requires a ready display before its upstream/browser
runtime becomes usable. In HTTP, the first admitted session whose effective mode
is headed triggers startup; listener startup or a headed process default alone
does not. Authentication, metadata validation and capacity admission precede
a request's ability to trigger display startup.

Concurrent headed admissions MUST share exactly one owned startup attempt and
the same bounded readiness outcome. Headed runtimes cannot proceed until ready.
The application retains session ownership and resolved mode; only the Docker
launcher owns display process state. Internal coordination cannot change public
schemas or consume MCP protocol streams.

Once triggered, Xvfb MUST remain until container shutdown, even if the initiating
session fails, is cancelled or closes, and even if only headless sessions remain.
No session owns or stops the shared display. Later headed sessions reuse it.
This is the user's explicit keep-started choice, not an idle-stop policy.

#### Acceptance

- Real headless browser work succeeds without DISPLAY in stdio and HTTP.
  Process-tree and socket inspection show no owned Xvfb process or listening
  X socket before a headed admission, including under concurrent health probes.
- Stdio with effective `headless: false` starts and uses a real CloakBrowser
  browser without X-server or DISPLAY errors.
- HTTP with a headless default supports a session with `headless: false`.
  Conversely, a headless session under a headed default does not start Xvfb.
- Concurrent first headed admissions cause one Xvfb spawn, await its readiness
  and then perform independent browser work alongside a headless session.
- Closing all headed sessions leaves the same Xvfb process running. A later
  headed session reuses it; headless sessions retain their own mode.
- Invalid, unauthorized and capacity-rejected initialization does not start Xvfb.

### DHM-002: Existing headless configuration contract

The Docker image MUST retain `PLAYWRIGHT_MCP_HEADLESS=true` as its default. Existing
environment and Streamable HTTP initialize-metadata precedence, accepted values, and
validation behavior MUST remain unchanged. The fix MUST NOT add a new public CLI option,
environment variable, or MCP field.

#### Acceptance

- A container started without a headless override continues to launch browsers in
  headless mode.
- `PLAYWRIGHT_MCP_HEADLESS=false` continues to produce `headless: false` in the upstream
  Playwright configuration.
- Per-session `headless` metadata continues to override the process default only for that
  session.
- The public CLI help, configuration names, initialize schema, and upstream browser tool
  schemas contain no new field for the virtual display.

### DHM-003: Bounded display readiness and failure

The CLI may start without Xvfb to resolve configuration and accept HTTP requests.
Only a headed runtime admission waits for display readiness, within a documented
finite deadline. A live PID, stale file or socket path alone is not readiness.
Headless-only startup and browser work do not wait for an unnecessary display.

If triggered display startup fails or times out, the container MUST fail closed:
reject waiting headed admissions, stop admitting new work, clean up the CLI and
owned resources within the shutdown budget, and exit nonzero with a concise
display-startup diagnostic on stderr. This is terminal even if the initiating
request disconnected. No hidden retry is allowed. Cancelling one request MUST NOT
cancel shared startup for other waiters or turn a startup failure into success.

#### Acceptance

- Headed browser launch cannot race Xvfb readiness; headless-only startup works
  without starting or waiting for Xvfb.
- Inject spawn failure, early exit, an unresponsive X server and readiness
  timeout: no waiting headed runtime becomes usable, no waiter outlives the
  failure/cleanup budget and the container exits nonzero.
- Disconnect one of multiple waiting HTTP clients: the other admissions still
  receive the shared readiness outcome and no duplicate Xvfb is spawned.
- No display diagnostic or lifecycle message is written to MCP stdout.

### DHM-004: Process lifecycle

The MCP CLI and any triggered Xvfb share one container lifecycle. CLI arguments,
exit status, interruption and cleanup remain observable as if the CLI were the
entrypoint directly. A never-started display is not a failure.

After triggering, Xvfb remains required for that container invocation, even with
no headed sessions. Any unexpected display exit, including exit 0, MUST stop the
CLI, clean up owned display resources and exit nonzero with a concise display-loss
diagnostic on stderr. No restart or silent headless-only degradation is allowed.
Session disposal never stops Xvfb.

#### Acceptance

- All image arguments reach the CLI unchanged. Normal CLI exit preserves its
  status unless an independent infrastructure failure occurred.
- SIGTERM/SIGINT reach the application; the container exits within the documented
  default Docker stop grace period.
- Force Xvfb exit with active headed sessions and after all have closed: both
  terminate the container nonzero and identify display loss on stderr.
- CLI exit, startup failure and shutdown terminate any started Xvfb; no owned
  process or display resource survives container exit.
- Shutdown racing first headed admission prevents new work and new display spawns
  after shutdown begins, settles pending admissions and cleans up any process
  already spawning. Headless-only shutdown needs no display process.

### DHM-005: Display isolation and privilege

Xvfb MUST remain accessible only within the container's local process boundary. The
change MUST preserve the non-root runtime user and MUST NOT require additional Linux
capabilities, privileged mode, host display mounts, or a network listener.

#### Acceptance

- The final runtime executes the MCP server and display service without root privilege.
- No X11 TCP port listens on any container interface.
- Display authentication and temporary resources, if present, are readable only by the
  owning runtime context and are removed when the container exits.
- Existing secret-redaction, filesystem-mount, browser sandbox, HTTP authentication, and
  TLS behavior remains unchanged.

### DHM-006: Transport and protocol compatibility

The fix MUST preserve the existing stdio and Streamable HTTP contracts, upstream
Playwright MCP tool forwarding, two local introspection tools, output paths, profiles,
extensions, proxies, and browser isolation behavior. The launcher does not serialize
all browser operations or create a shared browser/profile for HTTP sessions.
A shared X server supports multiple clients but is not a tenant security boundary:
native X11 focus, selection/clipboard and desktop capture are shared-display
facilities, not newly guaranteed per-session resources. Existing Playwright
page/context isolation remains required. OS-desktop automation and stronger
hostile-tenant isolation are outside this change.

#### Acceptance

- Existing unit and integration suites pass without weakening their assertions.
- Browser tool names, inputs, outputs, error envelopes, and local tool count are
  unchanged.
- Stdio continues to reserve `stdout` for MCP protocol messages.
- The launcher passes client stdin/stdout descriptors directly to the CLI without
  consuming, buffering, reserializing, or relaying protocol data. Xvfb does not read
  client stdin; Xvfb and launcher diagnostics go to stderr.
- Byte-stream tests preserve Unicode, CRLF, large input, and backpressure; EOF reaches
  the CLI. This does not introduce a new application exit-on-EOF policy.
- Streamable HTTP health, readiness, session limits, session cleanup, and independent
  runtime metadata continue to behave as before.

### DHM-007: Platform parity

The headed-mode outcome, failure behavior, non-root execution, and display isolation
MUST be equivalent on the published `linux/amd64` and `linux/arm64` images.

#### Acceptance

- Both platform images build from the same declared Docker contract.
- Automated evidence on each architecture launches a real CloakBrowser browser in
  headed mode without an X-server error.
- An architecture-specific inability to provide the required display fails the build or
  acceptance check rather than silently publishing reduced support.

### DHM-008: Regression coverage

Automated coverage MUST exercise the real Docker browser boundary that the
existing fake upstream distribution test does not cover. Concurrent HTTP coverage
MUST include two headed sessions and one headless session, simultaneous first
admission, cancellation while waiting, session close during other work, and
shutdown during display startup. Each session observes only its own page, input,
cookies and browser screenshot results under the existing supported session
configuration. Verify pending admission capacity and exactly one display spawn;
sequential success alone is not concurrency evidence.

#### Acceptance

- A Docker stdio end-to-end check launches a real CloakBrowser browser with
  `PLAYWRIGHT_MCP_HEADLESS=false` and observes a successful browser tool result.
- A Docker Streamable HTTP check leaves the process default headless and initializes one
  session with `headless: false`, then observes a successful real-browser result.
- A control check proves default headless operation succeeds without Xvfb or a
  display socket. Deliberately starting an unnecessary display must make this
  absence assertion fail.
- Lifecycle checks distinguish correct signal forwarding, exit-code propagation,
  startup failure, and cleanup from implementations that merely make browser launch
  succeed.
- Existing fake-upstream bridge coverage remains in place for deterministic protocol
  forwarding checks.

### DHM-009: Operator documentation

Public Docker documentation MUST describe headed-mode support and its observable limits.
It MUST explain that Xvfb supplies a virtual display inside the container and does not
create a visible desktop window or remote viewing service.

#### Acceptance

- The primary Docker documentation includes a working
  `PLAYWRIGHT_MCP_HEADLESS=false` example.
- Documentation distinguishes headed execution from visible desktop access and does not
  claim VNC, noVNC, host-X11, or GUI streaming support.
- Every affected localized page is updated consistently and the translation manifest
  validates.
- Documentation describes headless operation without Xvfb, first-headed startup,
  keep-started behavior, shared-display limits, Tini/launcher ownership,
  startup/shutdown deadlines,
  display-loss behavior, required writable paths, and the Docker health guarantee.
  It does not equate a live PID with a responsive MCP server or browser.

### DHM-010: Tini and bounded Docker lifecycle ownership

The image MUST bundle Tini `v0.19.0`, pinned by version and target-specific SHA-256
digest. `TARGETARCH=amd64` selects the official `tini-amd64` binary and `arm64`
selects `tini-arm64`; unsupported architectures or checksum mismatches fail the
build. Operators MUST NOT need to supply `docker --init` for correct operation.

Tini MUST be PID 1 in a normal container invocation. When an external init is
present, bundled Tini MUST operate as a child subreaper instead of requiring PID 1.
Tini owns adopted-child reaping, forwarding signals to its main child, and
propagating that child's exit status. It does not own display readiness or health.

Tini's main child MUST be a Docker-only Node.js/TypeScript lifecycle launcher,
separate from the MCP event loop. The launcher owns exactly Xvfb and the existing
CLI, not individual HTTP sessions, upstream tool contracts, or browser workers.
Its responsibilities are limited to shared display demand/readiness, failure classification,
signal forwarding, exit status, bounded shutdown, and owned-resource cleanup.
No service registry, generic dependency graph, restart framework, new public
configuration namespace, or non-Docker startup dependency may be introduced.

The launcher MUST start the CLI with its original arguments and inherited stdio.
It MUST start Xvfb only on the effective headed demand defined in DHM-001 and
release that runtime's admission only after display readiness. A spawned
PID, stale readiness file, or existing socket path alone is not readiness. Startup
MUST have a finite deadline and handle spawn errors, display exit, and interruption
before readiness without admitting a headed runtime or leaving owned children behind.

The launcher MUST install signal handling before launching children. On a normal
SIGTERM/SIGINT it forwards the signal to the CLI, keeps Xvfb available while the
application closes browsers, then stops Xvfb and cleans up. Repeated signals and
concurrent child exits MUST not start duplicate shutdown sequences. Failure to
exit gracefully MUST trigger bounded escalation for the owned process groups;
sending a signal to a parent PID alone is not sufficient descendant cleanup.
The internal cleanup deadline MUST fit within the documented default Docker stop
grace period. These deadlines are internal settings, not new public options.

Unexpected Xvfb exit, including exit 0, while the display is required MUST initiate
CLI shutdown and a nonzero container exit. Neither Xvfb nor the CLI may be silently
restarted. Expected Xvfb exit during launcher-requested cleanup is not display loss.
Normal CLI exit preserves its exact status; a display/startup/cleanup failure MUST
not be masked by a subsequent CLI exit 0. If the CLI dies from an unhandled signal,
the launcher preserves the conventional `128 + signal number` status unless an
independent infrastructure failure already requires a nonzero result.

Tini MUST forward to the launcher, not indiscriminately signal its entire process
group with `-g`. The launcher owns ordered forwarding and escalation. Tini verbose
output MUST be disabled, including environment-based verbosity, because its INFO
and DEBUG logs use stdout. Lifecycle diagnostics MUST remain on stderr.

The runtime MUST retain the non-root `node` user and require no privilege escalation,
additional capabilities, or S6 runtime directory layout. Tini and the launcher MUST
work with external `docker --init` and with `no-new-privileges`, all capabilities
dropped, and a read-only root filesystem when documented application/display
writable paths are mounted. Private lifecycle/health state MUST be owner-only;
changing browser sandbox policy or promising arbitrary-UID operation is out of scope.

#### Acceptance

- Inspect the normal process tree: Tini is PID 1, the launcher is its main child,
  and the CLI and any demand-started Xvfb are launcher-owned processes running as `node`.
- Repeat protocol and signal checks with external `docker --init`; bundled Tini
  registers as a subreaper and emits no PID-1 warning or fatal error.
- Run real headed stdio and per-session HTTP checks under the documented restricted
  runtime mounts, not only an echo consumer or fake upstream.
- Verify startup timeout, Xvfb spawn failure, exit before/after readiness, CLI spawn
  failure, CLI exit 0/nonzero, SIGTERM/SIGINT during startup and operation, repeated
  signals, simultaneous child exits, and a child that ignores graceful shutdown.
- Verify the display remains available during normal application cleanup, no normal
  stop produces a false display-loss diagnostic, and injected display failure cannot
  be overwritten by a later successful CLI exit.
- Verify descendant cleanup and adopted-zombie reaping, including abnormal CLI or
  launcher exit; no owned process survives container exit. Tini reaping alone MUST
  not be cited as proof of graceful browser shutdown.
- Verify byte/EOF preservation and clean MCP stdout with noisy Xvfb/launcher probes
  and an inherited Tini verbosity setting that would otherwise enable stdout logs.
- Build checks reject a wrong binary digest and unsupported target; both published
  architectures pass the same lifecycle and real-browser acceptance suite.

### DHM-011: Active Docker health check

The final image MUST declare a Docker `HEALTHCHECK` aligned with the Tini/launcher
lifecycle. Healthy means that the launcher is running, the CLI has its expected current
identity, is not stopped or a zombie, and its event loop returns a fresh response
within the probe deadline. Before any headed admission, absent Xvfb is expected
and MUST NOT fail health. Once display startup is triggered, its current identity,
process state and a fresh display-protocol response become required until
container shutdown, even after the last headed session closes. PID existence, an open socket path, cached health, or
a past startup notification MUST NOT satisfy this contract.

The active MCP response MUST originate in the CLI event loop, not only in the
launcher or an independent worker. In stdio mode it MUST use a private local
request/response channel with owner-only access; it MUST NOT consume or inject
client-owned MCP stdin/stdout. Docker-only health plumbing in the CLI is permitted,
but must remain inactive in normal non-Docker npm execution. In HTTP mode an
existing authenticated health endpoint may supply the active response without
changing its public schema or authentication rules; equivalent private probing is
also permitted. Neither mode may add a public endpoint, port, tool, or configuration
field. Internal channel selection is not a user-facing option.

The probe MUST be read-only, bounded, and safe under concurrent invocations. It
MUST NOT launch a browser, allocate a public MCP session, alter session/browser
state, or expose credentials, protocol content, or sensitive paths in diagnostics.
Channel creation and teardown are lifecycle-owned; stale endpoints or replies from
an earlier CLI instance MUST fail identity/freshness validation. Failure to establish
the required private channel prevents healthy startup and produces a nonzero startup
failure rather than silently disabling active health.

The check MUST fail during incomplete startup, shutdown, process identity mismatch,
in-progress display startup, unavailable required display, or an unresponsive CLI, including a live process with a blocked
event loop. Display phase and identity MUST come from the single launcher authority.
A concurrent transition from never-started to starting cannot reuse a stale
no-display health success: recheck or fail conservatively within the probe budget.
The check MUST NOT depend on `/run/s6`, S6 state or a second independently
maintained lifecycle authority. Existing `/healthz` and `/readyz` response schemas,
authentication, and session-capacity semantics remain unchanged; capacity exhaustion
alone is not container ill health. A healthy container does not guarantee that every
browser session, upstream operation, or remote website is responsive.

The image MUST declare finite probe interval, timeout, retry, and startup-grace
settings. A failed check marks the container unhealthy according to those settings;
it MUST NOT restart services or silently recover sessions. Terminal process/display
failures retain DHM-004 behavior. An alive but unresponsive MCP is reported unhealthy;
operator/orchestrator recovery remains outside this change.

#### Acceptance

- Observe actual Docker health transitions, not only direct execution of the probe:
  startup, healthy operation, and unhealthy after the configured failure budget.
- With the launcher still responsive, stop the CLI with SIGSTOP and separately block
  its event loop without stopping its process. Both become unhealthy within the
  configured budget; resuming the CLI permits recovery after a successful fresh probe.
- Reject stale identity/readiness evidence, stale replies, missing or inaccessible
  health endpoints, unavailable required Xvfb, and shutdown state. A live but unresponsive
  Xvfb also fails the active display check.
- Observe healthy headless-only operation with no Xvfb. First display startup
  is not healthy until ready; retained Xvfb remains health-required after all
  headed sessions close. Race health probing against first display startup to
  reject stale no-display success. Probes never start or restart Xvfb.
- Inject channel-setup failure and verify startup fails rather than reporting healthy.
  Confirm owner-only access and removal of owned endpoints on normal cleanup.
- Probes neither consume protocol bytes nor produce client-visible messages or create
  sessions, including during simultaneous MCP traffic and concurrent health checks.
- Full HTTP session capacity may make readiness return its existing not-ready result
  while Docker health remains healthy if infrastructure and the CLI respond.
- Default non-Docker npm invocation opens no Docker health channel and retains its
  current behavior. The same positive/negative health contract passes on both images.

## Failure And Recovery

- A virtual-display startup failure is terminal for that container invocation. The
  operator recovers by correcting the image or runtime environment and restarting the
  container.
- A failed headed browser request remains an MCP tool error with upstream diagnostic
  context, but display failure is detected at headed admission before browser work,
  not deferred to the first browser tool. Headless-only operation does not
  trigger that display admission.
- Rolling back to an earlier image restores its former headless-only Docker behavior;
  no stored data or migration rollback is required.

## Non-Goals

- Creating an init implementation or a general-purpose service supervisor. The narrow
  Docker-only Xvfb/MCP lifecycle module in DHM-010 is explicitly in scope.
- Managing HTTP sessions or browser workers through Tini, or adding transparent
  restarts that pretend to preserve sessions after display loss.
- Providing a visible desktop, VNC, noVNC, RDP, or host-X11 integration.
- Adding a public switch that enables or disables Xvfb.
- Changing `@playwright/mcp`, CloakBrowser, MCP schemas, browser tool contracts, or
  headless-value parsing.
- Changing non-Docker npm package behavior.
- Expanding published container platforms beyond `linux/amd64` and `linux/arm64`.
- Changing browser sandbox defaults, HTTP authentication, TLS, proxy, extension, profile,
  artifact, or network-access policies.

## Objective Acceptance

The specification is satisfied when both published Docker architectures provide the
demand-started container-local display retained until shutdown, real headed-browser
checks pass through stdio and
per-session Streamable HTTP configuration, Tini/launcher lifecycle and active Docker
health checks pass, existing compatibility checks remain green, and documentation
accurately describes virtual-display behavior and the health guarantee.

## Revision Evidence And Delivery Boundary

- Confirmed Standard depth, core/operations/security profiles and no separate
  planning artifacts remain unchanged. Original scope rationale describing
  always-on Xvfb is historical: the later explicit headless amendment and
  keep-started answer replace that lifecycle policy, not other scope obligations.
- An isolated amd64 probe on 2026-09-13 against local image
  `sha256:1bb03d275cd4d757cc8e8323a66658388f21164631cc0088c2869c0d381b0a65`
  launched bundled CloakBrowser Chromium 146.0.7680.177 with Playwright
  1.63.0-alpha-2026-08-31, `headless: true`, no DISPLAY/WAYLAND_DISPLAY and no
  Xvfb process. It loaded a data URL, verified its title and closed successfully.
  The S6 entrypoint was bypassed: this proves headless independence, not future
  launcher acceptance on either architecture.
- [Playwright CI documentation](https://playwright.dev/docs/ci#running-headed)
  describes Xvfb for headed Linux execution.
  [X.Org concepts](https://www.x.org/guide/concepts/) describe multiple clients on
  one X server and shared input focus. These facts motivate concurrency tests,
  not a new per-tenant X11 isolation promise.
- The user selected Tini plus the narrow module and active MCP responsiveness checks
  in the current task. Previous S6 decisions and review receipts remain historical
  evidence, not approval of this draft.
- [Tini documentation](https://github.com/krallin/tini/tree/v0.19.0) defines one-child
  init behavior, subreaping, signal groups, and exit propagation; the
  [pinned source](https://github.com/krallin/tini/blob/v0.19.0/src/tini.c) confirms
  verbose stdout logging. These capabilities do not implement DHM-004 or DHM-011.
- Previous isolated amd64 probes validated byte/EOF preservation, signals, and all
  23 fake-upstream calls with Tini, including restricted runtime and external init.
  They did not validate the proposed launcher, real headed sessions, or arm64.
- The required Docker E2E failure in `tasks/handoff.md` remains unresolved. No prior
  review pass or isolated probe is final-image production acceptance.
- Existing S6 task packets require replanning after this draft is reviewed and
  approved; this update does not authorize implementation or rewrite those packets.
- This internal engineering specification has no localized variants. Public Docker
  documentation and translations remain DHM-009 implementation work; no public
  documentation or translation-manifest hashes are changed in this revision.
