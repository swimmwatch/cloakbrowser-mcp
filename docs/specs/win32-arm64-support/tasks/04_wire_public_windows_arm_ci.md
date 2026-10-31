# Packet 04 — Wire Public Windows ARM64 CI

## Outcome

Run the existing quality/package suites across the full supported Node.js
matrix on GitHub's native Windows ARM64 runner and add a separate public Free
default-engine smoke.

## Prerequisites And Dependencies

- Packet 03 is complete.
- `npm run test:e2e:windows-arm64:free` passes on native Windows ARM64.
- GitHub still exposes the public-repository runner label `windows-11-arm`.

## Owned Requirements

- R1 Supported Platform
- R3 Free First-Run And Cached Flow
- R5 Transparent Cache Transition
- R6 Diagnostics
- R9 Existing Compatibility
- R10 Native Free CI Gate
- R13 Rollback

## Scope

Update `.github/workflows/ci.yml`:

- Add `windows-11-arm` to the existing `quality` operating-system matrix so
  `npm run check` and `npm run package:verify` run for Node.js
  `22`, `24`, `25`, and `26`, as derived from `NODE_CHECK_VERSIONS`.
- Add one dedicated `windows-11-arm` Free smoke job using native Node.js 24.
  It installs with `npm ci --ignore-scripts` and runs
  `npm run test:e2e:windows-arm64:free`.
- Keep the Free job public and credential-free. It must not reference the Pro
  secret, persist the CloakBrowser cache across jobs, or upload the downloaded
  binary.
- Preserve top-level `permissions: contents: read`, existing concurrency,
  pinned action SHAs/comments, and all existing jobs/matrices.
- Give the real-download smoke a bounded timeout that accommodates the signed
  archive download without weakening other job timeouts.

The Free test itself owns clean/warm/cache-transition assertions inside an
isolated job-local temp path; the workflow must not prepopulate that path.

## Non-Goals

- Do not add the Pro credential or Pro job here.
- Do not add Windows Docker, self-hosted runners, x64 emulation, artifact
  uploads, dependency caching beyond existing npm setup, or a browser cache
  shared across runs.
- Do not change release, deployment, documentation, or repository settings.
- Do not reduce the existing Linux, macOS, Windows x64, Node, package,
  coverage, docs, Docker, security, or parity coverage.

## Relevant Contracts

- The exact native runner label is `windows-11-arm`.
- The quality matrix covers every Node version from
  `NODE_CHECK_VERSIONS`; the Free browser smoke runs once on native Node 24.
- The default engine must remain CloakBrowser; the smoke cannot set Playwright
  fallback or fake-upstream variables.
- Workflow permissions stay least-privilege and all external actions stay
  pinned by full SHA with readable version comments.

## Expected Files

- `.github/workflows/ci.yml`
- Packet/checklist/handoff state under
  `docs/specs/win32-arm64-support/tasks/`

No test or runtime file is owned by this packet. If packet 03 changes are
insufficient, stop and return to a separately authorized packet 03 fix.

## Objective Acceptance

- The expanded quality matrix has 24 combinations: six operating systems by
  four Node versions, including native Windows ARM64.
- The Free smoke is a distinct `windows-11-arm` job and runs the packaged,
  default-engine test with no credential.
- Existing matrix entries and jobs remain semantically unchanged.
- Workflow syntax, action pinning, permissions, actionlint, and high-severity
  zizmor checks pass.
- No public support claim is added by this packet.

## Verification

Focused local checks:

```bash
npm run format:check
npm run test:e2e:windows-arm64:free
```

The native smoke is recorded as not run unless executed on Windows ARM64.

Workflow checks:

```bash
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
```

Repository checks:

```bash
npm run check
git diff -- .github/workflows/ci.yml
```

Record the known translation-service blocker separately if it is the only full
check failure. Workflow acceptance still requires actionlint and zizmor to
pass.

## Failure, Rollback, And Recovery

- A missing runner label, architecture mismatch, or non-native execution is a
  hard failure; do not substitute `windows-latest`.
- Repeated upstream download failure is recorded and rerun later; it does not
  justify caching or bypassing verification.
- Rollback removes only the Windows ARM64 matrix entry and Free job. If the
  accepted dependency is invalid, use the coordinated R13 rollback rather than
  altering user caches.

## Manual Gates

- **MANUAL GATE — external CI:** observing the actual GitHub runner requires a
  separately authorized push/PR or workflow dispatch handled in packet 06.
- Commit, push, PR, merge, publication, and release remain separate
  **MANUAL GATE** actions.

## Completion Checklist

- [ ] `windows-11-arm` added to the full Node quality matrix.
- [ ] Dedicated public Free smoke job added.
- [ ] No Pro secret, browser cache, or downloaded binary is persisted.
- [ ] Permissions and pinned actions preserved.
- [ ] Actionlint and zizmor pass.
- [ ] Local/repository checks recorded.
- [ ] Handoff updated.
- [ ] `todo.md` packet link checked.

## Handoff

Record the matrix cardinality, Free job name, runner/Node selection, actionlint,
zizmor, and repository results in `handoff.md`. Packet 06 remains blocked until
packet 05 also completes.

