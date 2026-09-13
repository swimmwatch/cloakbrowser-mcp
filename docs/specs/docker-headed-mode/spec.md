# Docker Headed Mode

Status: Approved

## Outcome

Docker distributions of `cloakbrowser-mcp` provide a container-local Xvfb display for
their full lifetime so that existing headed-browser configuration works through both
stdio and Streamable HTTP. The change preserves current CLI, MCP, configuration,
security, and default headless behavior.

The container MUST use S6 Overlay as the process supervisor for this lifecycle;
the project MUST NOT introduce a custom process supervisor.

## Supported Platforms

- Docker runtime: `linux/amd64` and `linux/arm64`.
- Node package execution outside the project Docker image is unchanged.
- Both stdio and Streamable HTTP transports remain supported.

## Requirements

### DHM-001: Always-available virtual display

Every project Docker container MUST start a container-local Xvfb display before the MCP
server begins normal request handling. Display availability MUST NOT depend only on the
process-level value of `PLAYWRIGHT_MCP_HEADLESS`, because a Streamable HTTP session may
request headed mode independently.

#### Acceptance

- A default Docker invocation starts successfully with the virtual display available.
- With `PLAYWRIGHT_MCP_HEADLESS=false`, a real CloakBrowser browser tool starts and
  completes without an X-server or `DISPLAY` error.
- With the container default left at `PLAYWRIGHT_MCP_HEADLESS=true`, a Streamable HTTP
  session initialized with `headless: false` starts and uses a real CloakBrowser browser
  successfully.
- A headed session and a headless session can coexist without changing each other's
  runtime choice.

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

### DHM-003: Startup and failure behavior

The MCP server MUST begin normal operation only after Xvfb is ready to accept browser
connections. If the display cannot be established, the container MUST fail closed with
a non-zero exit status and a concise diagnostic on `stderr`; it MUST NOT report a ready
service or defer the failure to the first browser request.

#### Acceptance

- A successful startup cannot race the first browser launch against Xvfb readiness.
- A forced display-startup failure prevents the MCP server from becoming usable, exits
  non-zero, and identifies display startup as the failure source on `stderr`.
- No display diagnostic or lifecycle message is written to MCP `stdout`.

### DHM-004: Process lifecycle

The Docker runtime MUST treat the MCP server and Xvfb as one container lifecycle. CLI
arguments, exit status, interruption, and cleanup MUST remain observable as if the CLI
were the container entrypoint directly.

If Xvfb exits unexpectedly after startup readiness, the runtime MUST stop the
MCP server, clean up owned display resources, and exit non-zero. It MUST write
a concise diagnostic to `stderr` that identifies loss of the virtual display,
and MUST NOT write that diagnostic or other lifecycle messages to MCP `stdout`.

#### Acceptance

- All arguments following the image name reach the `cloakbrowser-mcp` CLI unchanged.
- Normal CLI exit preserves its exit status.
- `SIGTERM` and `SIGINT` reach the application, and the container exits within the
  Docker stop grace period.
- A forced post-readiness Xvfb exit stops the MCP server, exits the container
  non-zero, and identifies virtual-display loss on `stderr`.
- Application exit or startup failure terminates Xvfb; container inspection after exit
  reveals no surviving owned process or display resource.

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
extensions, proxies, and browser isolation behavior.

#### Acceptance

- Existing unit and integration suites pass without weakening their assertions.
- Browser tool names, inputs, outputs, error envelopes, and local tool count are
  unchanged.
- Stdio continues to reserve `stdout` for MCP protocol messages.
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

Automated coverage MUST exercise the real Docker browser boundary that the existing fake
upstream distribution test does not cover.

#### Acceptance

- A Docker stdio end-to-end check launches a real CloakBrowser browser with
  `PLAYWRIGHT_MCP_HEADLESS=false` and observes a successful browser tool result.
- A Docker Streamable HTTP check leaves the process default headless and initializes one
  session with `headless: false`, then observes a successful real-browser result.
- A control check proves default headless operation still succeeds.
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

### DHM-010: S6 Overlay supervision

The Docker image MUST use S6 Overlay `v3.2.3.2` with modern `s6-rc` service
management. S6 `/init` MUST remain PID 1, Xvfb MUST be a readiness-notifying
longrun service, and the `cloakbrowser-mcp` CLI MUST remain the container command
started only after that readiness dependency is satisfied.

The integration MUST preserve Docker's direct-entrypoint contract: the existing
CLI remains `CMD`, `S6_CMD_ARG0` preserves its argument-zero behavior,
`S6_CMD_RECEIVE_SIGNALS=1` forwards signals, arguments after the image name
reach the CLI unchanged, and the CLI exit status remains the container exit
status. An unexpected Xvfb exit after readiness while the service is still
required MUST stop the CLI and fail the container non-zero; an intentional
container shutdown MUST NOT be reported as an Xvfb failure.

S6 Overlay installation MUST pin both the noarch archive and the target-specific
binary archive by exact version and SHA-256 digest. Docker `amd64` MUST select
the S6 `x86_64` archive and Docker `arm64` MUST select the S6 `aarch64` archive.
The final runtime MUST continue as the existing non-root `node` user; writable
S6 runtime state, including `/run`, MUST be prepared for that user without
world-writable permissions.

#### Acceptance

- Container inspection observes `/init` as PID 1 and the MCP CLI as the retained
  container command, with all supplied CLI arguments unchanged.
- The MCP CLI cannot begin normal request handling before the S6 Xvfb service
  reports readiness.
- `SIGTERM` and `SIGINT` are delivered to the CLI, a normal CLI exit preserves
  its exact status, and an intentional shutdown produces no false Xvfb-loss
  diagnostic.
- A forced post-readiness Xvfb exit while the service is required stops the CLI,
  exits the container non-zero, and reports the lost display only on `stderr`.
- S6 initialization, supervision, and service logs never appear on MCP `stdout`.
- The build fails when either S6 archive digest is wrong or when `TARGETARCH` is
  unsupported; successful `amd64` and `arm64` builds use the declared S6 archive
  mapping.
- Runtime inspection observes the MCP CLI and Xvfb running as the non-root
  `node` user and no world-writable S6 runtime directory.

## Failure And Recovery

- A virtual-display startup failure is terminal for that container invocation. The
  operator recovers by correcting the image or runtime environment and restarting the
  container.
- A failed headed browser request remains an MCP tool error with upstream diagnostic
  context, but absence of the required display must normally be detected during
  container startup.
- Rolling back to an earlier image restores its former headless-only Docker behavior;
  no stored data or migration rollback is required.

## Non-Goals

- Creating or maintaining a project-specific process supervisor instead of S6
  Overlay.
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
always-available isolated display, real headed-browser checks pass through stdio and
per-session Streamable HTTP configuration, failure and signal behavior is verified,
existing compatibility checks remain green, and updated documentation accurately
describes the virtual-display behavior.
