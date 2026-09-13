# Packet 02 — Multi-Architecture CI

Status: Blocked on Packet 01

## Outcome

Run the completed Docker behavioral suite against the already-built
`linux/amd64` and `linux/arm64` matrix images while preserving current parity,
artifact upload, vulnerability scanning, and workflow security controls.

Requirements: DHM-001, DHM-005, DHM-006, DHM-007, DHM-008, DHM-010.

## Pinned Inputs

- Source version:
  `aaaeebcaeeebeee6c002e06b1288b222ad86806b2727cde376f6f790f4f87993`
- Specification version:
  `fad6bcccd0eac43e8a19841c851a8425a69f51cd2bcd14a21f9c83d2c07fe5a6`
- Review reference: `3c616247-2370-4c25-9165-043ac7bfdb39`
- Dependency: packet 01 completed with passing Docker E2E evidence.

Recheck the pinned workflow state and packet 01 evidence before editing.

## Prerequisites And Evidence

- `.github/workflows/ci.yml:167-229` builds a loaded image for both target
  platforms using pinned setup and build actions.
- `.github/workflows/ci.yml:230-264` currently runs a `--help` smoke, amd64-only
  parity, Trivy, and SARIF upload; it does not run real headed-browser checks.
- `package.json:46-83` must expose a run-only Docker E2E command so CI does not
  rebuild or test the wrong default image tag.
- `.github/workflows/ci.yml` and `package.json` already contain unrelated user
  edits. Preserve them byte-for-byte outside this packet's lines.

## Allowed Paths

- `.github/workflows/ci.yml`
- `package.json` only if packet 01 did not already add the run-only command
- `docs/specs/docker-headed-mode/tasks/todo.md`
- `docs/specs/docker-headed-mode/tasks/handoff.md`
- this packet's status and evidence sections

Do not alter action SHAs, job permissions, release publishing, Trivy policy,
the node OS matrix, or the unrelated Playwright Console E2E job.

## Implementation Boundary

- Keep the existing Docker matrix and image build.
- Remove external `--init` from the Docker smoke so the selected S6 entrypoint is
  actually PID 1.
- After the build, run the run-only Docker manual suite with
  `CLOAKBROWSER_MCP_DOCKER_IMAGE` set to `${{ matrix.image_tag }}`.
- Run the same real-browser and lifecycle assertions for both matrix entries.
- Retain amd64 parity comparison, report upload, Trivy scanning, and SARIF upload
  in their current order unless a demonstrated dependency requires moving only
  the new E2E step.
- Do not add broad permissions, mutable action tags, or a silent
  `continue-on-error` path.

## Test-First Execution

### RED

Before editing the workflow, run a discriminating check that confirms the
Docker job lacks the run-only E2E step and still passes `--init` to the image:

```bash
rg -n 'test:e2e:docker:run|docker run --rm --init' .github/workflows/ci.yml
```

Record the current missing/present observations. This is a configuration slice;
the check, not a unit test, is its RED evidence.

### GREEN

Add the matrix E2E step and remove the external init flag. Run the repository's
workflow validators and the local amd64 command without weakening the Docker
suite.

### PROVE

Temporarily point `CLOAKBROWSER_MCP_DOCKER_IMAGE` at a nonexistent tag in a
copied workflow command or local shell invocation. Confirm the run-only suite
fails instead of silently rebuilding or falling back to
`cloakbrowser-mcp:dev`, then discard the mutation.

## Verification

```bash
npm run test:e2e:docker:run
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
npm run check
git diff --check
```

### MANUAL GATE: remote architecture evidence

After separate authorization to push or open a pull request, require both
Docker matrix jobs to pass:

- `docker (linux/amd64)` — real headed stdio, real headed HTTP, lifecycle,
  parity, and Trivy;
- `docker (linux/arm64)` — the same Docker manual suite plus Trivy.

If arm64 fails under QEMU, keep this packet incomplete and record the exact
failure. Do not skip the browser check or reduce the supported platform list.

## Completion

Packet 02 remains incomplete until local workflow checks and both remote matrix
jobs pass. Update `todo.md` and replace `handoff.md` with current evidence. Stop;
do not publish, approve, merge, or start another packet automatically.
