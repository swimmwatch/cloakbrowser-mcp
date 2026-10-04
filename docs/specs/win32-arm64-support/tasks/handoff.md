# Native Windows ARM64 Handoff

## Current State

- Planning status: approved on 2026-07-25.
- Implementation status: packet 01 was executed and is blocked; it remains
  incomplete.
- Completed packets: none.
- Next eligible packet: none. Re-run
  [01_qualify_upstream_release.md](01_qualify_upstream_release.md) only after a
  newer stable upstream release appears.

## Active Blockers

- Reconfirmed on 2026-07-25, npm `latest` remains
  `cloakbrowser@0.5.2`. Its immutable tarball maps only `win32-x64`, and signed
  Free release `chromium-v146.0.7680.177.5` publishes no
  `cloakbrowser-windows-arm64.zip`; it therefore fails R2.
- The Pro workflow protection model is selected:
  same-repository PR/manual CI with a protected `windows-arm64-pro` GitHub
  Environment and fork PRs skipped.
- The GitHub secret identifier is intentionally unresolved. Packet 05 is
  blocked until a maintainer provides a non-sensitive identifier; no credential
  value may be requested or persisted.
- DeepL MCP reported `Quota for this billing period has been exceeded` on
  2026-07-25. The specification and planning Markdown localizations are
  explicitly deferred; no untranslated placeholders or false translation
  manifest hashes may be created. Packet 07 must clear the deferral before the
  final `docs:translations:check` can pass.

## Planning Changes

- `docs/specs/win32-arm64-support/decisions.yaml`
- `docs/specs/win32-arm64-support/tasks/plan.md`
- `docs/specs/win32-arm64-support/tasks/todo.md`
- `docs/specs/win32-arm64-support/tasks/handoff.md`
- `docs/specs/win32-arm64-support/tasks/01_qualify_upstream_release.md`
- `docs/specs/win32-arm64-support/tasks/02_consume_upstream_dependency.md`
- `docs/specs/win32-arm64-support/tasks/03_add_native_windows_smoke_harness.md`
- `docs/specs/win32-arm64-support/tasks/04_wire_public_windows_arm_ci.md`
- `docs/specs/win32-arm64-support/tasks/05_wire_protected_pro_ci.md`
- `docs/specs/win32-arm64-support/tasks/06_validate_native_ci.md`
- `docs/specs/win32-arm64-support/tasks/07_publish_compatibility_contract.md`

## Planning Verification

Populate after the packet bundle is validated:

- YAML parse: passed.
- Prettier: passed for the decision ledger and all planning Markdown.
- Packet contract/requirement coverage: passed; seven packets contain every
  required section, all packet links resolve, and R1–R13 are mapped.
- Documentation checks: `docs:build` and `docs:seo:validate` passed.
  `docs:translations:check` failed only for the 110 explicitly deferred
  localized counterparts for the specification and planning bundle.

Do not claim the translation check passed while the recorded DeepL blocker
remains.

## Packet 01 Execution

- Result: blocked and incomplete. The candidate fails R2 before Pro, cache, or
  negative-integrity qualification can begin.
- Requirements evaluated: R2, with R4, R5, R7, and R13 left gated by the failed
  upstream prerequisite.
- Changed files:
  - `docs/specs/win32-arm64-support/tasks/01_qualify_upstream_release.md`;
  - `docs/specs/win32-arm64-support/tasks/todo.md`;
  - `docs/specs/win32-arm64-support/tasks/handoff.md`.
- `decisions.yaml` was intentionally unchanged because
  `current.upstream-support` already records the same authoritative result.
- No credential, private URL, authorization header, normal user cache,
  package metadata, source, test, workflow, public contract, or compatibility
  documentation was accessed or changed.
- The protected Pro manual gate was not reached because the public package
  mapping and Free archive already fail.
- No next packet is eligible. Packet 02 must remain unchecked.

Focused verification:

- `npm view cloakbrowser dist-tags versions --json`: passed; `latest` is
  `0.5.2`, with no newer published version.
- `npm view cloakbrowser@0.5.2 ... --json`: passed; immutable integrity,
  tarball URL, and source revision match the qualification record.
- `npm pack cloakbrowser@0.5.2`: passed in an isolated
  `/tmp/cloakbrowser-qualification.*` directory; tarball SHA-1 and integrity
  match npm metadata, and the temporary directory was removed.
- Published `dist/config.js` inspection: passed; only `win32-x64` and
  `windows-x64` are present.
- GitHub release query for `chromium-v146.0.7680.177.5`: passed; assets are the
  Linux x64 archive, Windows x64 archive, `SHA256SUMS`, and
  `SHA256SUMS.sig`, with no Windows ARM64 archive.
- `npm run upstream:check:cloakbrowser`: passed and reported `0.5.2` as the
  latest upstream version.

Repository verification:

- Prettier check for `docs/specs/win32-arm64-support`: passed.
- `npm run docs:build`: passed.
- `npm run docs:seo:validate`: passed.
- `npm run docs:translations:check`: failed as expected for exactly 110
  explicitly deferred localized counterparts in this workstream.
- `npm run check`: failed at the same translation gate after typecheck, lint,
  format, and compatibility checks passed. Server validation, build, tests, and
  packaged E2E did not run because the command uses `&&`.
- No verification command accessed a credential, private URL, authorization
  header, or normal user cache.

## Unrelated Worktree State

The following pre-existing changes are outside this plan and must be preserved:

- modified `AGENTS.md`;
- modified `.agents/skills/project-pull-request/SKILL.md`;
- modified `.agents/skills/project-release/SKILL.md`;
- untracked repository-owned agent skill/reference files outside this
  specification bundle.

Stop if an implementation packet would overlap those files.
