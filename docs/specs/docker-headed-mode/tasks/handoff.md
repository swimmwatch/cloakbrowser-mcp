---
render_macros: false
---

# Docker Headed Mode Handoff

## Current State

- Packet 03 is incomplete. Its CI wiring and the added local acceptance coverage
  pass, but the remaining acceptance-matrix scenarios and native `linux/arm64` CI
  execution are still required. Packet 04 must not start.
- Specification state rechecked after implementation: `pass`, `reviewed`.
- Source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`.
- Specification version: `9624ca40590114349de4999ccf1a35af771e602b7726e277a068e60d8b918931`.
- Review reference: `5444e611-25dd-48d2-bf22-4523cda23641`.

## Packet 03 Checkpoint

- Changed paths: `.github/workflows/ci.yml`, `tests/e2e/docker-image.manual.ts`,
  `tests/e2e/dockerHarness.ts`, and `tests/e2e/distributionHarness.ts`.
- Docker CI now runs its acceptance suite for each image and uses native runners:
  `ubuntu-latest` for `linux/amd64` and `ubuntu-24.04-arm` for `linux/arm64`.
  The normal smoke command no longer adds external `--init`; the E2E suite retains
  one explicit compatibility case.
- Docker E2E adds real headed Streamable HTTP browser coverage, restricted runtime
  coverage (`--read-only`, dropped capabilities, `no-new-privileges`, writable
  temporary display mounts), non-root execution, owner-only health socket state,
  and no X11 TCP listener.
- Resume update: Docker E2E now also proves that unauthorized headed initialization
  and a headed initialization rejected by `sessionMax` do not create Xvfb. The
  HTTP harness can wait for an authenticated health endpoint without weakening the
  unauthenticated request assertion.
- Resume update: Docker E2E now proves two real headed Streamable HTTP sessions
  use distinct profiles and complete navigation plus screenshots, closing one headed
  session leaves the other operational, and `docker stop` cleanly terminates an
  active headed-session container. `npm run check` passed after these additions.
- Resume update: Docker E2E deterministically delays Xvfb only inside its temporary
  container, stops the container after startup begins but before display readiness,
  and proves the pending initialize fails cleanly. The production image is not
  modified. Full Docker E2E passed 19/19 and `npm run check` passed.
- Resume update: Docker E2E now terminates CLI and Xvfb concurrently and proves the
  launcher exits the container without leaving it runnable. Full Docker E2E passed
  20/20 and `npm run check` passed.
- RED: before implementation, Docker CI had no `test:e2e:docker:run` step and the
  added restricted-runtime and external-init assertions failed. GREEN:
  `npm run test:e2e:docker:run -- --reporter=dot` passed with 13 tests.
- PROVE: a nonexistent `CLOAKBROWSER_MCP_DOCKER_IMAGE` caused the run-only suite to
  fail without rebuilding; removing the X11 tmpfs mount caused the restricted
  headed test to fail; both mutations were restored.
- Local checks passed in `/home/dmitry-vasiliev/PycharmProjects/open-source/cloakbrowser-mcp`:
  `npm run check`, actionlint 1.7.12, and `python3 -m pipx run zizmor --min-severity high .`
  (offline mode; no findings, 51 ignored and 54 suppressed).
- Remaining packet work: cover the accepted cancellation, invalid/unauthorized or
  capacity-rejected initialization, child-exit and shutdown races, and independent
  per-session page/input/cookie/screenshot results. Native arm64 execution is also
  unavailable locally. Do not mark Packet 03 complete until the remaining scenarios
  pass and a remote `ubuntu-24.04-arm` CI run builds `cloakbrowser-mcp:ci-linux-arm64`
  and passes `npm run test:e2e:docker:run`.
- Next eligible action: resume Packet 03. No later packet is eligible yet.

## Completed Work

- Added a Docker-only Unix health socket at `/tmp/cloakbrowser-mcp-health.sock`, owned by the launcher and mode `0600`.
- Added nonce- and CLI-PID-bound IPC health probes. The response is scheduled by the CLI event loop; process liveness alone cannot pass health.
- Added fresh X11 setup probing after display demand. `never_started` remains healthy and never starts Xvfb; `starting`, `stopping`, and `failed` are unhealthy.
- Added the bounded Docker `HEALTHCHECK`: interval `2s`, timeout `1s`, start period `2s`, retries `2`.
- Preserved public `/healthz` and `/readyz` schemas, MCP stdio, HTTP session capacity, and display ownership.

## RED, GREEN, PROVE Evidence

- RED: the image initially had no `HEALTHCHECK`; the image-contract E2E failed with `Healthcheck: undefined`.
- GREEN: Docker E2E validates the image contract and real health transitions for headless CLI, retained Xvfb, and recovery after `SIGCONT`.
- PROVE mutations failed the intended checks, then were restored: cached CLI success, stale nonce, socket-only X11 validation, health-triggered Xvfb startup, and changed public `/healthz` payload.

## Verification

- Docker health timings: `interval=2s`, `timeout=1s`, `start-period=2s`, `retries=2`.
- Docker E2E observed both CLI and Xvfb `healthy → unhealthy → healthy` transitions within 8 seconds per direction; suite duration was 31.53 seconds.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run format:check` — passed.
- `npm run test:unit` — passed: 26 files, 218 passed, 4 skipped.
- `npm run test:integration` — passed: 3 files, 24 passed.
- `npm run docker:lint` — passed.
- `npm run docker:build` — passed locally for `linux/amd64`.
- `npm run test:e2e:docker:run` — passed: 9 tests.
- `npm run check` — passed.
- `git diff --check` — passed.

## Scope Boundary

- The local Docker evidence is `linux/amd64`; cross-architecture CI acceptance belongs to packet 03.
- Public Docker documentation and translations are deferred to packet 04.
- No commit, publication, or CI mutation was performed.

## Next Action

Run only packet 03 on a new explicit `incremental-implementation` invocation.
