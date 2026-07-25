# Packet 02 — Consume The Upstream Dependency

## Outcome

Raise the `cloakbrowser` dependency lower bound and lockfile to the exact stable
version qualified in packet 01 while preserving the thin bridge and all
existing public behavior.

## Prerequisites And Dependencies

- Packet 01 is complete.
- Its qualification record names the exact accepted stable version `V`.
- No unresolved withdrawal or integrity warning applies to `V`.

## Owned Requirements

- R2 Stable Upstream Dependency Gate
- R8 Public Interface Stability
- R9 Existing Compatibility
- R13 Rollback

## Scope

- Change the direct `cloakbrowser` dependency range so its minimum is exactly
  `V` and older unsupported versions cannot resolve.
- Regenerate `package-lock.json` with npm so the root dependency declaration
  matches `package.json` and the locked package satisfies the new range.
- Preserve the existing semver compatibility style unless `V` itself requires
  a different stable-major boundary.
- Verify existing bridge configuration, doctor, and local tool code continue to
  delegate to upstream APIs without platform-specific branches.

## Non-Goals

- No source, test, workflow, Docker, public documentation, package-version, or
  release change.
- No prerelease, fork, Git, file, override, or vendored dependency.
- No bridge-local platform mapping, download, verification, extraction, cache,
  or fallback logic.
- No CLI, environment, MCP, HTTP, process, logging, or upstream tool-contract
  change.

## Relevant Contracts

- `package.json` remains the direct dependency authority and
  `package-lock.json` must be reproducible with `npm ci`.
- Existing Node engine range `^22.13.0 || >=24.0.0` is unchanged.
- Existing Linux, macOS, Windows x64, Docker, stdio, Streamable HTTP, doctor,
  and local tool behavior must remain unchanged.
- Rollback restores the previous dependency declaration and lockfile together;
  it never deletes cache data.

## Expected Files

- `package.json`
- `package-lock.json`
- Packet/checklist/handoff state under
  `docs/specs/win32-arm64-support/tasks/`

No runtime source file is expected to change. Stop if the dependency cannot be
consumed without a runtime bridge edit and return the conflict to specification
review.

## Objective Acceptance

- The direct range's lower bound is exactly qualified `V`.
- The lockfile root declaration matches and the installed
  `cloakbrowser` version satisfies the range.
- `npm ci --ignore-scripts` succeeds from the lockfile.
- Package verification and the existing repository suites pass, subject only
  to a separately recorded translation-service blocker.
- A diff inspection shows no platform logic or public interface change.

## Verification

Focused checks:

```bash
npm ci --ignore-scripts
npm ls cloakbrowser
npm run upstream:check:cloakbrowser
npm run package:verify
git diff -- package.json package-lock.json
```

Repository checks:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:integration
npm run test:e2e:run
npm run check
```

Run and record `npm run check`. If it fails only because the existing
specification/planning localizations are blocked by DeepL quota, record that
exact known failure and the passing component commands; do not report the full
check as passed.

## Failure, Rollback, And Recovery

- If installation, lockfile reproducibility, package verification, or existing
  compatibility fails, restore only this packet's dependency and lockfile
  changes and leave prior user changes untouched.
- If `V` is withdrawn or its integrity changes, mark packet 01 invalid and stop.
- Do not clear any user or CI CloakBrowser cache as recovery.

## Manual Gates

- No external mutation is required for this packet.
- Commit, push, PR, publication, and release remain separate
  **MANUAL GATE** actions and are not authorized.

## Completion Checklist

- [ ] Packet 01 version copied exactly.
- [ ] `package.json` lower bound raised.
- [ ] `package-lock.json` regenerated reproducibly.
- [ ] No runtime or public interface changes introduced.
- [ ] Focused checks recorded.
- [ ] Repository checks recorded truthfully.
- [ ] Handoff updated.
- [ ] `todo.md` packet link checked.

## Handoff

Record `V`, the resolved lockfile version/integrity, exact changed files, and
all check results in `handoff.md`. The only next eligible packet is packet 03.

