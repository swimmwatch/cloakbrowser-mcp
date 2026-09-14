---
render_macros: false
---

# Packet 03 — Multi-Architecture Acceptance and CI

Status: Local implementation and verification complete; remote CI evidence pending.

## Outcome

Complete the real Docker acceptance suite for headed/headless concurrency, cancellation,
isolation, lifecycle, health, and restricted runtime, then run the same suite against
the existing `linux/amd64` and `linux/arm64` CI images without weakening parity or
security checks.

Requirements: DHM-001, DHM-002, DHM-003, DHM-004, DHM-005, DHM-006, DHM-007, DHM-008,
DHM-010, DHM-011.

## Pinned Inputs

- Source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`.
- Specification version: `9624ca40590114349de4999ccf1a35af771e602b7726e277a068e60d8b918931`.
- Review reference: `5444e611-25dd-48d2-bf22-4523cda23641`.
- Dependencies: packets 01 and 02 completed with local Docker evidence.

Reopen and recheck the pinned specification and dependency evidence before editing.

## Prerequisite Evidence

- `tests/e2e/docker-image.manual.ts` and `tests/e2e/dockerHarness.ts` contain partial
  S6-era work and packet 01/02 additions; this packet consolidates behavioral coverage,
  not runtime behavior.
- `tests/integration/streamable-http.test.ts:218-229` proves metadata independence only
  with the fake upstream and is not sufficient real-browser evidence.
- `package.json:46-83` contains build-and-run and run-only Docker E2E commands.
- `.github/workflows/ci.yml:167-265` already builds both architectures, runs amd64
  bridge parity, scans both images with Trivy, and uploads SARIF/artifacts.
- The local Docker builder previously advertised amd64 only. Remote arm64 execution is
  therefore a mandatory manual gate.

## Allowed Paths

- `tests/e2e/docker-image.manual.ts`
- `tests/e2e/dockerHarness.ts`
- `tests/e2e/distributionHarness.ts`
- `scripts/compare-playwright-mcp-bridge.mjs`
- `package.json`, `package-lock.json`
- `.github/workflows/ci.yml`
- test fixtures under `tests/fixtures/**`
- `docs/specs/docker-headed-mode/tasks/todo.md` and `handoff.md`

Do not change runtime behavior in this packet. If an acceptance scenario exposes a
runtime defect, record it and return ownership to packet 01 or 02 instead of patching
the symptom in the test or workflow.

## Acceptance Matrix

The real Docker suite must cover:

- default and explicit headless stdio/HTTP browser work with no Xvfb before headed
  demand;
- real headed stdio and per-session HTTP browser work with no X-server error;
- two simultaneous first headed HTTP sessions plus one headless session, with exactly
  one Xvfb spawn and independent page, input, cookies, and screenshot results;
- cancellation of one startup waiter, session close during other work, all headed
  sessions closed then later reuse, and shutdown during startup;
- invalid, unauthorized, and capacity-rejected initialize requests never triggering
  display;
- CLI/Xvfb spawn and readiness failures, post-ready loss, repeated signals, concurrent
  child exits, graceful-shutdown timeout, exit-code precedence, and descendant cleanup;
- active health transitions and protocol cleanliness during simultaneous MCP traffic;
- non-root execution, owner-only state, no X11 TCP listener, no extra capabilities,
  `no-new-privileges`, all capabilities dropped, and read-only root filesystem with
  only documented application/display paths writable;
- normal invocation and an explicit external `docker --init` compatibility run, with
  bundled Tini acting as subreaper and no warning/fatal output.

## Test-First Execution

### RED

Before workflow changes, ensure the run-only suite fails if any required real-browser,
concurrency, health, or restricted-runtime assertion is removed or still missing. Also
record that the CI Docker job does not yet invoke `npm run test:e2e:docker:run` for each
matrix image. Configuration search alone is only CI-wiring RED evidence.

### GREEN

- Finish reusable Docker helpers with bounded waits, deterministic cleanup, unique
  names, and exact process/health inspection. Never hide failures with broad retries.
- Keep `test:e2e:docker` responsible for building the local image and
  `test:e2e:docker:run` responsible only for exercising
  `CLOAKBROWSER_MCP_DOCKER_IMAGE`.
- Add the run-only suite to both Docker matrix entries using `matrix.image_tag`.
- Remove external `--init` from normal image smoke/parity invocations; retain one
  explicit compatibility scenario in the E2E suite.
- Preserve amd64 parity comparison, report upload, Trivy scan, SARIF upload, pinned
  actions, top-level `contents: read`, job-only write permission, and required-job
  aggregation.

### PROVE

- Point the run-only suite at a nonexistent tag; confirm it fails instead of rebuilding
  or falling back to `cloakbrowser-mcp:dev`, then restore it.
- Disable one concurrency barrier; confirm the exact-one-Xvfb assertion fails, then
  restore it.
- Start an unnecessary Xvfb in the headless control fixture; confirm absence checks
  fail, then restore it.
- Remove the read-only-root writable display mount; confirm the restricted headed test
  fails with an actionable result, then restore it.
- In a copied workflow command, suppress the E2E exit code; confirm the workflow
  validator or packet review detects the weakening, then discard the copy.

## Verification

```bash
npm run test:e2e:docker:run
npm run bridge:compare -- "$CLOAKBROWSER_MCP_DOCKER_IMAGE" --report bridge-parity-report.json
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
npm run check
git diff --check
```

### Manual gate: remote architecture evidence

After separately authorized push/PR work, require successful jobs for:

- `docker (linux/amd64)` — full real Docker suite, parity, and Trivy;
- `docker (linux/arm64)` — the same real Docker suite and Trivy.

If arm64 fails under QEMU or its native runner, keep this packet incomplete and record
the exact failure. Do not skip browser checks or reduce declared platform support.

## Completion Boundary

Packet 03 remains incomplete until all local checks and both remote architecture jobs
pass. Update `todo.md`, replace `handoff.md`, and stop. Do not approve, merge, publish,
release, or start documentation automatically.
