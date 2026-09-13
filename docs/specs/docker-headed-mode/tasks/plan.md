# Docker Headed Mode Implementation Plan

Status: Planned

## Workflow Inputs

- Specification: `docs/specs/docker-headed-mode/spec.md` (`Status: Approved`)
- Depth: `Standard`
- Active profiles: `core`, `operations`, `security`
- Planning artifacts: none beyond this task bundle
- Source version: `aaaeebcaeeebeee6c002e06b1288b222ad86806b2727cde376f6f790f4f87993`
- Specification version: `fad6bcccd0eac43e8a19841c851a8425a69f51cd2bcd14a21f9c83d2c07fe5a6`
- Completeness review: `3c616247-2370-4c25-9165-043ac7bfdb39`

Planning must stop and return to specification work if
`specification_check_state` no longer returns `status: pass`,
`coverage_status: reviewed`, and the source version above.

## Outcome

The Docker image starts S6 Overlay as its entrypoint, uses an `s6-rc` dependency
to hold the MCP CLI until Xvfb is ready, preserves the CLI command contract, and
fails the whole container when the required display fails. Real CloakBrowser
checks prove headed stdio and per-session Streamable HTTP behavior on both
published architectures. Documentation stops recommending Docker's external
`--init` because S6 owns the container PID 1 role.

No runtime TypeScript or public MCP, CLI, or configuration contract changes are
planned.

## Repository Evidence

- `Dockerfile:25-85` owns runtime assembly, keeps `USER node`, defaults
  `PLAYWRIGHT_MCP_HEADLESS=true`, and currently starts the Node CLI directly.
- `.dockerignore:1-28` excludes every path except an explicit allowlist, so a new
  Docker root filesystem directory must be added deliberately.
- `tests/e2e/docker-image.manual.ts:12-15` currently exercises only the fake
  upstream stdio bridge.
- `tests/e2e/distributionHarness.ts:87-117` constructs that Docker command and
  currently inserts an external `--init`.
- `scripts/compare-playwright-mcp-bridge.mjs:86-140` already exercises the real
  browser boundary in headless stdio mode but also inserts `--init`.
- `tests/integration/streamable-http.test.ts:218-229` proves per-session
  `headless` metadata with a fake upstream; it is the behavioral pattern for the
  Docker real-browser HTTP check.
- `package.json:46-83` owns local E2E, Docker build, smoke, parity, and final
  repository commands.
- `.github/workflows/ci.yml:167-264` already builds and runs the Docker image for
  `linux/amd64` and `linux/arm64`; only amd64 currently runs browser parity.
- `docs/docker.md:15-27`, `docs/getting-started.md:40-96`, and
  `README.md:76-93` currently recommend `--init`, which would put another init
  process in front of the selected S6 entrypoint.
- `docs/configuration.md:201-203` currently tells headed users to supply their
  own display and must distinguish the project image from generic Linux hosts.

Relevant paths already contain user changes: `.github/workflows/ci.yml`,
`package.json`, `docs/getting-started.md` and all its locale variants,
`docs/data/translation-manifest.json`, and the CI smoke recipe locale set.
Execution must re-read their current diffs and patch only the lines owned by the
packet. It must not replace or normalize unrelated edits.

## Verified External Inputs

S6 Overlay `v3.2.3.2` publishes the required assets with these GitHub release
digests:

| Asset                       | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `s6-overlay-noarch.tar.xz`  | `5379750ed30a84bbd2e2dd74847ba6b5bd29cd0b2e3ea2ec58049b57eb2eda12` |
| `s6-overlay-x86_64.tar.xz`  | `e6befcc96a437a3831386ecfc51808c5d3e939dc5fe3c02ae9284599e8aa2408` |
| `s6-overlay-aarch64.tar.xz` | `b17f17a82e7a515c682a91edaf2ffdabb73f891981b6c1fd712115693a2f8b4c` |

Authoritative references:

- `https://github.com/just-containers/s6-overlay/releases/tag/v3.2.3.2`
- `https://raw.githubusercontent.com/just-containers/s6-overlay/v3.2.3.2/README.md`
- `https://raw.githubusercontent.com/just-containers/s6-overlay/v3.2.3.2/doc/init.txt`
- `https://skarnet.org/software/s6-rc/s6-rc-compile.html`
- `https://skarnet.org/software/s6/s6-supervise.html`
- `https://skarnet.org/software/s6/s6-svstat.html`
- `https://manpages.debian.org/bookworm/xserver-common/Xserver.1.en.html`

The implementation must re-check the release asset names and digests before
editing the Dockerfile. A mismatch blocks the packet; it must not be converted
into an unpinned download.

## Architecture

| Unit                        | Boundary and responsibility                                                                                                                                                                                                              | Inputs and outputs                                                                 | Lifecycle, errors, and invariants                                                                                                                                                                           | Requirements                                | Verification                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| S6 asset build stage        | Downloads and verifies the noarch archive plus exactly one architecture archive, extracts them into an isolated root, and copies only the extracted overlay into the runtime image.                                                      | `TARGETARCH`, version, three pinned digests; extracted S6 filesystem.              | `amd64 -> x86_64`, `arm64 -> aarch64`; any other value or checksum mismatch fails the build. Download and extraction tooling does not enter the runtime image.                                              | DHM-007, DHM-010                            | Build-time negative digest and unsupported-architecture checks; amd64 and arm64 CI builds.         |
| Runtime image contract      | Installs the S6 root filesystem and project service definitions, exports the fixed local display, retains `USER node`, and changes the image contract from the Node entrypoint to `ENTRYPOINT ["/init"]` plus the existing CLI as `CMD`. | Existing runtime files and Docker CLI arguments; S6 init tree and CLI process.     | `S6_CMD_ARG0=node`, `S6_CMD_RECEIVE_SIGNALS=1`, quiet S6 diagnostics, unchanged CLI argv and exit status, no new capability or host mount.                                                                  | DHM-002, DHM-004, DHM-005, DHM-006, DHM-010 | Image config inspection, help/error exit checks, signal checks, fake-upstream protocol regression. |
| `xvfb` s6-rc longrun        | Owns one Xvfb process on fixed display `:99`, with screen `1280x720x24`, Unix socket only, and readiness notification on fd 3 via Xserver `-displayfd`.                                                                                  | S6 start/stop transition; `DISPLAY=:99`; local X11 socket and readiness event.     | Depends on S6 `base`; has bounded `timeout-up`; never listens on TCP; runs as the image's non-root user.                                                                                                    | DHM-001, DHM-003, DHM-005, DHM-010          | Immediate first browser action, startup-failure injection, `ss`/process/user inspection.           |
| `xvfb-ready` s6-rc oneshot  | Depends on the ready longrun, creates an owner-only readiness marker after successful transition, and removes it before planned shutdown.                                                                                                | Xvfb readiness; `/run/cloakbrowser-mcp/xvfb-ready`.                                | The marker distinguishes failed startup and unexpected post-ready exit from intentional service teardown. `/run/cloakbrowser-mcp` is owned by `node` and is not world-writable.                             | DHM-003, DHM-004, DHM-005, DHM-010          | Marker permission, startup failure, normal shutdown, and forced Xvfb termination checks.           |
| Xvfb finish policy          | Handles longrun termination and checks both the readiness marker and `s6-svstat -o wantedup`.                                                                                                                                            | Xvfb exit code/signal and current desired state.                                   | If still wanted, writes a concise startup or lost-display diagnostic to `stderr`, records a non-zero container result, and invokes S6 halt. If not wanted, exits silently so shutdown is not misclassified. | DHM-003, DHM-004, DHM-010                   | Forced pre-ready and post-ready failure tests plus a clean SIGTERM/SIGINT control.                 |
| Docker E2E harness          | Owns Docker CLI process creation, unique container names, separate stdout/stderr capture, HTTP port discovery, MCP clients, inspection, bounded waits, and cleanup.                                                                      | Selected image from `CLOAKBROWSER_MCP_DOCKER_IMAGE`; structured test observations. | No shell interpolation of untrusted values; cleanup runs on all terminal paths; timeouts kill only the owned container. No new runtime dependency.                                                          | DHM-001 through DHM-008, DHM-010            | Vitest Docker manual suite with RED/GREEN/PROVE evidence.                                          |
| Docker CI matrix            | Runs the already-built image's Docker E2E suite for both declared platforms and retains parity/security scanning.                                                                                                                        | Matrix image tag and platform; test and scan results.                              | No architecture may be silently skipped. Existing pinned actions and least-privilege permissions remain unchanged.                                                                                          | DHM-006, DHM-007, DHM-008, DHM-010          | actionlint, zizmor, both matrix jobs, retained Trivy and parity outputs.                           |
| Public Docker documentation | Describes built-in headed execution and removes the now-conflicting external init recommendation from every affected example.                                                                                                            | English source pages and locale counterparts; accurate Docker commands.            | Xvfb is not presented as a visible desktop, VNC, noVNC, host X11, or remote GUI. Identifiers and commands remain untranslated.                                                                              | DHM-002, DHM-005, DHM-009, DHM-010          | docs build, SEO validation, translation check, repository search for stale `--init` usage.         |

### Runtime dependency flow

```text
Docker starts /init
  -> s6-rc starts xvfb
     -> Xvfb writes readiness on fd 3
        -> xvfb-ready records ready state
           -> S6 starts CMD: node /opt/cloakbrowser-mcp/dist/cli.js <args>

unexpected Xvfb exit while wanted
  -> finish policy writes stderr diagnostic
  -> S6 records non-zero result and halts the container
```

## Platform Coverage

| Environment                | Planned evidence                                                                              | Availability                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Local `linux/amd64` Docker | Build, lifecycle suite, real headed stdio, real headed HTTP, default-headless control, parity | Available through the current Docker daemon.                                                                     |
| CI `linux/amd64`           | Same Docker manual suite against the matrix image plus Trivy and parity                       | Existing Docker matrix job.                                                                                      |
| CI `linux/arm64`           | Same Docker manual suite against the arm64 matrix image plus Trivy                            | Existing Docker matrix job under QEMU. Local buildx currently advertises only amd64, so CI is required evidence. |

If QEMU cannot run the arm64 real-browser scenario reliably, packet 02 remains
incomplete. The implementation must preserve the arm64 requirement and return
the observed failure for a runner decision; it must not skip or downgrade the
test.

## Packet Order

1. `01_s6_runtime_and_lifecycle.md` — write Docker behavioral checks first,
   implement S6/Xvfb lifecycle, and prove the local image contract.
2. `02_multiarch_ci.md` — wire the run-only Docker suite into both CI matrix
   entries and retain workflow security checks.
3. `03_documentation.md` — update the authoritative Docker guidance, every
   affected locale, and generated documentation state after behavior is proven.

Packet 02 depends on packet 01. Packet 03 also depends on packet 01 and may be
executed independently of packet 02, but workstream completion requires all
three packets and the remote architecture evidence.

## Requirement Coverage

| Requirement | Owning packet(s) |
| ----------- | ---------------- |
| DHM-001     | 01, 02           |
| DHM-002     | 01, 03           |
| DHM-003     | 01               |
| DHM-004     | 01               |
| DHM-005     | 01, 02, 03       |
| DHM-006     | 01, 02           |
| DHM-007     | 01, 02           |
| DHM-008     | 01, 02           |
| DHM-009     | 03               |
| DHM-010     | 01, 02, 03       |

## Compatibility, Recovery, and Rollback

- Existing stdio and Streamable HTTP MCP contracts, tool names, configuration
  precedence, and the two local introspection tools remain unchanged.
- The current headless default remains the control path; always-on Xvfb is
  infrastructure, not a new public toggle.
- Startup fails closed if Xvfb cannot become ready. Post-readiness display loss
  shuts down the CLI and container non-zero instead of restarting invisibly.
- Rollback is an image rollback to the previous release. There is no persisted
  data migration. Existing `/data` and CloakBrowser cache mounts remain valid.
- S6 and Xvfb diagnostics use `stderr`; stdio `stdout` remains exclusively MCP
  protocol output.

## Durable Documentation Decision

Durable documentation is warranted. The change crosses Docker image assembly,
PID 1 supervision, Xvfb readiness, the MCP CLI, CI, and operator commands; the
reason an external `--init` must no longer be used would otherwise be expensive
to rediscover. The nearest authoritative documents already exist, so packet 03
updates them rather than creating a new architecture document.

## Manual Gates

- GitHub CI must report successful Docker jobs for both `linux/amd64` and
  `linux/arm64` before DHM-007 and the workstream can be marked complete.
- Pushing a branch, opening a pull request, and any release action require
  separate user authorization and are outside these packets.
