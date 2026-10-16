# 12 — Verified developer testing instructions

Status: Planned; execution requires explicit packet authorization
Requirements: TEST-001, TEST-002, TEST-007, TEST-008, TEST-009, TEST-010, TEST-011
Dependencies: 11 complete; functional acceptance, actual report commands and platform evidence recorded

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Explain implemented test/report behavior with verified commands, including
fake-versus-real evidence, safe diagnostics and trusted history rules.
Documentation follows functional end-to-end acceptance.

Canonical contributor guidance: `docs/contributing.md:10` checks and `:17`
checklist. Extension text at `docs/configuration.md:281` currently describes
positive verification as manual; change only that affected test guidance after
packet 08 proves automation. Localization/check scripts are owned by
`scripts/update-doc-translations.mjs` and translation manifest.

## Scope and ownership

Allowed: `docs/contributing.md` and its ten localized counterparts;
the affected testing paragraph in `docs/configuration.md` and counterparts;
only their changed entries in `docs/data/translation-manifest.json`;
existing documentation checks if a proven defect requires correction;
plan/checklist/handoff.
No release changelog, compatibility data row, README rewrite, generated CLI changes
or bulk translation regeneration. Existing compatibility tables must still verify.

Use `project-docs-maintainer` when executing this packet because generated and
localized docs must stay consistent. English owns changed prose; preserve identifiers,
commands, URLs and Markdown structure. Use DeepL if available, otherwise manually
translate only changed prose into ru/be/uk/es/pt-BR/zh/ja/de/fr/hi.

Documentation owner consumes actual packet 11 evidence. Reporting scripts and
upstream/runtime contracts remain authoritative; prose cannot invent flags,
guarantees, coverage numbers or successful unexecuted platforms.

## Test-first documentation acceptance

Define a command/comprehension checklist before editing prose, then validate it
against the implemented tooling. Do not run implementation changes in this packet.

RED: before editing, record which command/comprehension outcomes the current
documentation cannot support. GREEN: describe only implemented commands and have
the independent reader demonstrate those outcomes. PROVE for absence/structural
claims reuses the owning packets' recorded evidence; do not mutate unchanged
production behavior merely to validate prose.

Required reader outcomes:

- Select fast mock/fake-upstream checks versus real Chromium npm/CDP/Docker suites.
- Run tests with safe results, generate local HTML, open it and locate CI artifacts.
- Open the merged public report from the PR link, identify its tested SHA and
  environments, and understand 14-day expiry and artifact fallback. Explain that
  publishing uses a separate repository and does not deploy project documentation.
- Understand statuses, retries versus previous launches and incomplete/missing jobs.
- Identify supported environments and actual-version evidence; current old Docker
  base is not proof of npm MCP 0.0.83 compatibility.
- Explain which controlled screenshots/logs may be attached, what is redacted,
  retention and why PR/fork runs cannot update trusted history.
- Recover from stale/corrupt results using a new owned run directory without
  deleting unrelated data or revealing credentials.

Have a reader who did not author the implementation follow only these docs,
execute the copy-ready examples and answer the checklist; record observed results.
This is documentation usability acceptance, not a separately mandated code-review
workflow. Review itself stays optional.

## Commands and prerequisites

Prerequisites: 11, installed reporting tooling, existing MkDocs environment.
Declare actual result paths printed by the collect command; the examples below
use a fresh explicit run ID and must not overwrite an earlier run.

```bash
rtk proxy npm run test:report -- --suite unit --run-id docs-unit
rtk proxy npm run test:report:generate -- --input artifacts/test-results/docs-unit --output artifacts/test-report/docs-unit
rtk proxy npm run test:report:open -- --report artifacts/test-report/docs-unit
rtk proxy npm run docs:build
rtk proxy npm run docs:seo:validate
rtk proxy npm run docs:translations:check
rtk proxy npm run docs:compatibility:check
rtk proxy npm run check
```

Run the documentation validation before edits to establish baseline, then after
localized changes. Existing correct checks must not be weakened. Record missing
MkDocs/translation prerequisites as failed or unavailable required checks; no
claim of completed documentation until checks and reader outcomes pass.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.
