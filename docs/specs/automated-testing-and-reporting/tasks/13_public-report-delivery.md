# 13 — Separate Pages publication and PR report link

Status: Implemented and externally activated; publication verified for SHA 4a800b8d5d313676b39dc5a141dc367f5d442adb. Packet completion and acceptance of the current PR head remain open — 2026-10-12.
Requirements: TEST-007, TEST-008, TEST-009 (delivery amendment)
Dependencies: 10; external setup authorization before live publication
Delivery order: after 10, before 11; existing packet IDs remain stable

## Pinned inputs and provenance

- `source_version`: `b5768150e20c92ec9131fc4c767229b1f076ed86e089fc5f9829e737eb09f9ba`
- `specification_version`: `bce84e8b28612a6db2d677395921717b37003dab1f993d0ec867dee1dc2b7627`
- `review_ref`: `10107cff-c8d4-488d-9294-ccb07412a357`
- User instruction: `301e19f0-2621-412e-b6b4-dc23d3666ddd`, revision 1,
  recorded through scenario MCP on 2026-10-10.
- Reconciliation approval: `95e828ec-3581-4edc-abd2-8808a24ecc0d`, revision 1.
  Comment-handler decision: `4f47ba22-bd13-49e3-a54f-5690e27eb4a7`, revision 1.
  Independent review passed 24/24 current items;
  MCP state is pass/reviewed, Approved, with a recorded approval checkpoint.
- CWD: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`

TEST-007/008/009 and the scope manifest now cover this delivery amendment.
Keep generated output out of the source repository/npm package; only the dedicated
report repository may version generated public HTML. Do not hand-edit workflow YAML
state; recheck current specification freshness before implementation.

## Outcome and repository evidence

A PR exposes one merged matrix report through a browser link. Documentation Pages
and release publication remain outside the report publisher's ownership.

Existing project documentation deployment is
`.github/workflows/release.yml:377` (upload `site/`), `:392` (Pages permission)
and `:407` (deploy). Producer/aggregation ownership is packet 10 and existing
`.github/workflows/ci.yml:49`, `:127`, `:187`.

Official references:
[workflow_run security and privileges](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run),
[repository-scoped GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token),
[PR issue-comment API](https://docs.github.com/en/rest/issues/comments#create-an-issue-comment).

## Selected projects, Actions and repositories

This selected approach is covered by the approved reviewed specification.
Use these components:

| Component | Exact project | Responsibility |
| --- | --- | --- |
| Generator | [Allure Report 3](https://github.com/allure-framework/allure3), development package `allure` | Generate one HTML report from validated merged results; packet 03 owns the version and compatibility probe |
| Publisher | [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) | Publish trusted generated output to the separate reports repository |
| PR comment handler | Project-owned `scripts/publish-test-report.mjs` | Render validated statistics and verified URL; update only one fixed-marker comment with verified bot authorship and current SHA/run/attempt |
| Source repository | [swimmwatch/cloakbrowser-mcp](https://github.com/swimmwatch/cloakbrowser-mcp) | Own tests, aggregation, trusted publisher workflow and checks |
| Reports repository | Proposed `swimmwatch/cloakbrowser-mcp-reports` | Own sanitized generated HTML and independent project Pages publication; exact identity and creation require separate authorization |

Use the existing packet-03 safe adapter and Allure 3 generator. Do not use
`simple-elf/allure-report-action`: its generator is Allure 2, as explained by the
[official Allure 3 Pages guide](https://allurereport.org/docs/guides/github-pages/).
`deivydasp/allure-deployer-action-v2` is a researched alternative, not a selected
dependency or an audited implementation.

### Concrete configuration and verification

- Configure `peaceiris/actions-gh-pages` with `external_repository` set to the
  confirmed reports repository, `publish_branch: gh-pages`, and `publish_dir`
  pointing only to trusted regenerated output. Supply `personal_token` with a
  short-lived GitHub App installation token scoped to the reports repository.
  Do not use a broad personal access token.
- Configure the reports repository's Pages source as branch `gh-pages`, root
  directory. No second Pages deployment workflow or source-repository Pages-write
  permission is needed. Leave documentation deployment independent.
- Stage reports under `pr/<number>/run/<id>-attempt-<attempt>/<sha>/`. Use
  `keep_files: true` to preserve other runs, rather than relying on the beta
  `destination_dir` input. Guarded publisher cleanup owns explicit deletion of
  expired report paths; `keep_files` does not implement retention. Serialize
  publication and cleanup across the destination repository.
- After successful deployment and exact entrypoint verification, use the trusted
  project-owned handler for the immutable URL and regenerated statistics.
  Never update or delete a user comment carrying the same marker. Re-fetch
  current PR head, workflow runs and bot comments before updating.
- Before adding workflow `uses:` entries, select supported releases, inspect
  both Actions and pin them to verified full commit SHAs with version comments.
  Record exact commits and permission checks in implementation evidence. This
  plan does not invent unverified Action pins.

Expected URLs if the proposed destination repository is confirmed:

```text
Documentation: https://swimmwatch.github.io/cloakbrowser-mcp/
Reports: https://swimmwatch.github.io/cloakbrowser-mcp-reports/
PR report: https://swimmwatch.github.io/cloakbrowser-mcp-reports/pr/<number>/run/<id>-attempt-<attempt>/<sha>/
```

One CI run produces one combined matrix report retaining Linux/macOS/Windows,
Node and other environment variants. Missing producers are visible as incomplete
evidence. A second branch in the source repository is not a second independent
Pages site.

## Scope and ownership

After authorization, allowed source paths:
`.github/workflows/publish-test-report.yml`, `scripts/publish-test-report.mjs`,
report validation helpers from packets 02/03, reports-repository branch-based Pages
setup instructions, publisher unit/integration tests and fixtures,
and plan/checklist/handoff. `eslint.config.js` is authorized only for the
technical default-project-file limit 44 → 45; preserve all lint rules.
The separate repository is an external delivery target,
not another source checkout implicitly authorized for mutation.

No edits to `release.yml`, documentation `site/`, existing Pages settings,
Docker base, runtime, required checks or default-branch history trust rules.
The report repository's exact owner/name must be confirmed before external setup;
`cloakbrowser-mcp-reports` is only an example.

### Publication flow and security

1. CI calls the reusable publisher after merged report generation for a PR whose
   head repository matches the source repository. A manual CI run may publish only
   when GitHub's API associates its exact head SHA with one current open PR.
   This route works before merging the publication workflow into the default branch.
   Fork PR reports use the trusted default-branch `workflow_run` publisher after
   CI completes. Fetch PR/run/SHA/attempt identity through GitHub's API, never from
   artifact-supplied metadata. Active publication accepts only the current caller's
   exact run ID and attempt; older executions cannot replace a newer report.
2. Download only that run's expected data artifacts and validate bounded schema,
   identities, paths, attachments, omissions and redaction. Never checkout/execute
   fork PR code or publish producer-supplied HTML/config/JavaScript. Same-repository
   callers use their reviewed workflow revision; fork notifications and retention
   use the default-branch publisher. Generate HTML using
   trusted pinned reporting code/assets; reject unsafe evidence.
3. Publish one merged report retaining OS/architecture/Node/engine/level variants.
   Immutable path: `pr/<number>/run/<id>-attempt-<attempt>/<sha>/`.
   Restrict writes to this validated destination; preserve other runs and PRs.
4. Write generated output to the separate report repository using a GitHub App
   installation token scoped only to that repository with contents-write permission.
   Its branch-based Pages publication serves the reports site. No source
   documentation Pages permission or source contents-write grant is needed.
5. Await successful deployment and verify its exact entrypoint before linking.
   Re-fetch current PR head and latest eligible CI run, then update one bot-owned
   comment identified by a fixed marker. Link the same URL from publisher Job Summary.
   Comment includes tested SHA, counts, environment failures and incomplete status.
   An older run/attempt must not overwrite the newer link.
6. Serialize report-repository writes, use conflict-safe updates and idempotent
   run identity. Duplicate events do not create duplicate reports/comments.
7. Remove only public report paths older than 14 days through a scoped scheduled
   cleanup. Missing/expired report has an explicit unavailable state and an Actions
   run fallback (and artifacts while retained); no green empty page is generated.

The source publisher job alone gets actions-read and pull-requests-write.
Test jobs remain read-only and cannot access the report installation credential.
Fork results never update trusted history. The publisher must treat artifacts as
untrusted despite its privileged trigger. Pages output is public and is not a
secret store; no raw logs/results or credentials are committed to the report repo.

Separate project Pages repositories may share an origin. Repository separation
protects publishing ownership, not browser-origin isolation. Safe trusted rendering
and exclusion of arbitrary artifact HTML/assets are mandatory.

## Test-first acceptance

| Criterion | RED check, expected observation and PROVE |
| --- | --- |
| Matrix merge/link | Simulated completed run with distinct OS/Node producers produces one report; comment retains tested SHA and every environment result |
| Website preservation | Fake GitHub client rejects writes to source repository/Pages; publisher destination allowlist and scoped paths are observed; PROVE wrong-target mutation |
| No privilege crossing | Fork/malicious artifact attempts repo/path/PR substitution or executable HTML; rejection before write/execute; PROVE absence guard |
| Stale/rerun safety | Older SHA/run/attempt and duplicate event cannot overwrite a newer link or another PR's output; PROVE removing freshness/idempotency guard |
| Failure transparency | Failed tests still produce a truthful report; missing output/deploy failure produces explicit unavailable/incomplete state and no broken success link |
| Secret safety | Synthetic credential/header/capability canaries absent from published tree, comment and summary; second sanitization detects unsafe input |
| Retention/recovery | Fixed-clock 14-day cleanup removes only expired owned report paths, preserving live reports and unrelated files; publisher can be disabled without changing docs |
| Authorized live proof | Public URL opens actual merged report, PR comment resolves to its SHA/run and documentation deployment/site remain intact |

Write discriminating tests before publisher behavior. Use a fake GitHub API/client
for local mutation/permission tests, then separately authorized live proof for
deployment/link behavior. Correct checks must not be weakened. New absence,
structural and existing-behavior assertions require PROVE and restored mutations.

## Commands and prerequisites

Prerequisites: refreshed specification/review pins and packet 10. Add the named
tests before these existing runner commands:

```bash
rtk proxy npm exec -- vitest run tests/unit/test-report-publisher.test.ts tests/integration/test-report-publisher.test.ts
rtk proxy npm run check
rtk proxy docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
rtk proxy python3 -m pipx run zizmor --min-severity high .
```

## Manual gates

Prepare reviewable code/tests/templates before requesting external activation.
MANUAL GATE: separately obtain exact target-repository confirmation, authorization for its
creation/Pages settings, GitHub App installation/credentials, and activation of
public publication/automatic PR comments. This plan edit grants none of those
external mutations. Do not create a repository, publish or message a PR now.

## Completion and stop

Required local or authorized live checks failing/unavailable leave this packet
incomplete. Roll back by disabling only the report publisher and retaining sanitized
Actions results/summary; do not alter documentation deployment. Record commands,
results, blockers and ownership in `todo.md`/`handoff.md`, recheck specification
freshness and stop. Commit/push/PR and downstream packets need separate authorization.


## Historical execution checkpoint — 2026-10-10

Superseded by the local-verification checkpoint below. The component and ESLint
decisions described here have since been resolved.

The explicit invocation started local packet 13 preparation. No publisher workflow,
external credentials, repository, Pages setting, PR comment or publication was added.
Existing documentation deployment and packet 10 workflows remain untouched.

Implemented initial pure policy functions in `scripts/publish-test-report.mjs`:
API-record run/PR/source identity, separate destination validation, current-head/
latest-run/attempt filtering, bot-comment freshness and owned 14-day report-path
selection. These are preparatory helpers, not an executable publisher or completed
acceptance. Fifteen unit cases pass. Restored mutations removing source-target,
current-head and retention-path guards each fail the intended assertions. Initial
RED was a missing module, so it is not behavior proof; PROVE provides that proof.
Scoped ESLint passes with one complexity warning. Diff whitespace check passes.

Required `npm run check` fails in ESLint: the new script takes default-project
files beyond the existing limit 44. No limit or rule was weakened. A pending
user question requests exact scope approval for `eslint.config.js` and 44 to 45.
Full packet acceptance remains incomplete; integration, malicious-artifact,
publisher workflow, actionlint/zizmor and authorized live proof are not executed.

A material selected-component conflict was confirmed directly in the official
Allure Action v0.11.0 source, SHA
`1a856297ee7a92306bc462c26783245a98d4dcfb`:

- `src/github.ts:17–18,43–50`: comment selection/update uses marker without author
  verification; `:71–82` deletes marker comments without author verification.
- `src/index.ts:431–499`: the Action owns summary/section comment updates and
  deletions; a preflight cannot prevent a new user comment racing that lookup.
- `action.yml`: no author-aware comment mode or statistics-only input.

Source: https://github.com/allure-framework/allure-action/blob/1a856297ee7a92306bc462c26783245a98d4dcfb/src/github.ts

The approved single-bot-owned-comment contract cannot be guaranteed by directly
wiring this Action. Incremental implementation must not silently replace this
explicitly selected component. Pending user choice: reconcile the specification
so Allure 3 + peaceiris publication remain, while trusted project code owns guarded
comments, or defer until an official Action satisfies the contract. This finding
is an implementation blocker, not a completed security review or an upstream CVE.
No confirmed guarantee about Allure HTML escaping is claimed; its malicious-input
rendering tests remain mandatory before public output.

Scout identified candidate upstream pins (not added to workflow):
peaceiris/actions-gh-pages v4.1.0 `84c30a85c19949d7eee79c4ff27748b70285e453`,
actions/create-github-app-token v3.2.0 `bcd2ba49218906704ab6c1aa796996da409d3eb1`.
Main-agent audit of those exact sources remains pending before use. Exact report
repository, external activation and credentials also remain separate user gates.

Next owner: user chooses the component/scope decisions; separately authorized
specification/planning owner reconciles the selected Action requirement; main
agent resumes packet 13 and required verification afterward. Checklist 13 remains
unchecked; no downstream packet is authorized. Scenario state was unchanged and
Approved at start; managed workflow documents were not edited.

## Activation and rollback instructions

These instructions are not authorization for external actions.

1. Confirm the exact reports-only repository under `swimmwatch`; proposed name:
   `cloakbrowser-mcp-reports`. Separately authorize creation and public Pages.
2. Initialize its `gh-pages` branch and `.nojekyll` before the first publisher
   checkout. Select Pages → Deploy from a branch → `gh-pages` → root.
3. Separately authorize a GitHub App installed only on that destination, with
   Contents read/write, Pages read and implicit Metadata read. Do not install
   it on the source repository for this operation.
4. In source Actions variables, set `TEST_REPORT_REPOSITORY` to the confirmed
   owner/name and `TEST_REPORT_APP_CLIENT_ID` to the App client ID. Store the
   private key only in Actions secret `TEST_REPORT_APP_PRIVATE_KEY`; never
   in files, logs or chat. The publisher job's source token has contents/actions
   read and pull-requests write.
5. Deliver the reviewed workflow and CI caller together through separately
   authorized commit/push/PR steps. Same-repository PR publication uses that CI
   revision directly; the default-branch delivery is needed for fork notifications
   and scheduled retention. Leave `TEST_REPORT_PUBLICATION_ENABLED`
   unset/false until setup and public-report/automatic-comment activation are approved.
6. Set that variable to `true` only after activation authorization. This enables
   both publication and daily cleanup. Existing documentation settings stay intact.
7. When the user asks to inspect completed CI evidence, open the PR report link,
   verify SHA/run/attempt and all matrix variants, then check the documentation
   site and deployment. Do not launch or poll remote CI automatically.

Retention is 14 days; validated expired report paths are removed, and only their
exact bot-owned comment pointers become unavailable with an Actions fallback.
Disable the enable flag to stop publishing and cleanup. Existing public reports
remain until separately authorized removal; CI artifacts and Job Summary continue.

## Local verification checkpoint — 2026-10-10

The local implementation is verified; authorized live proof is pending.
Checklist 13 remains unchecked. The historical component/lint blockers are resolved
by the recorded user answers and the reviewed specification amendment.

Verified publisher pins: peaceiris v4.1.0
`84c30a85c19949d7eee79c4ff27748b70285e453` (peeled tag commit),
create-github-app-token v3.2.0
`bcd2ba49218906704ab6c1aa796996da409d3eb1`, and download-artifact v8.0.2
`9000827ccba6bdab643e8b6fd33ac0654aef8333` from packet 10.
Exact Action sources and tag resolution were checked before wiring.

- Publisher tests: 31 passed (15 unit, 16 integration), including valid-manifest
  executable artifacts, forged paths, post-write raw secrets, bot ownership,
  duplicate events, wrong-target API writes, live owned reports and symlinks/junctions.
- Relevant RED: `/tmp/packet13-boundary-red.log`; missing API export was a harness
  failure followed by PROVE. A permission regex incorrectly matched the permitted
  App input `permission-contents`; corrected to actual YAML permission keys.
- Six restored mutations: author ownership, idempotency, allowed API methods,
  live retention, source rights and trusted checkout. Each failed its assertion.
  Logs: `/tmp/packet13-prove-{author,idempotency,api-write,live-retention,source-rights,trusted-checkout}.log`.
  Earlier destination/head/path mutations remain recorded in the historical checkpoint.
- `npm run check`: exit 0, 700 passed / 4 unchanged skips in 60 files, plus
  six passing fast packaged CLI cases; `/tmp/packet13-check-final.log`.
- Pinned actionlint and offline zizmor: exit 0.
  `/tmp/packet13-actionlint-final.log`, `/tmp/packet13-zizmor-final.log`.
  Online-only zizmor audits were not run.
- The only new inline exception is `dangerous-triggers` for intentional
  `workflow_run`. Trusted default-branch code, disabled caches, validated data,
  HTML regeneration, delayed destination-only credentials and source-write
  prohibition are guarded by tests. No global audit is disabled.
  [Trigger audit](https://docs.zizmor.sh/audits/#dangerous-triggers);
  [scoped ignores](https://docs.zizmor.sh/usage/#comments).
- Actual regenerated failed-test HTML opened on verified Free Chromium
  `146.0.7680.177.5`; test detail opened, injected script did not execute,
  no executable `onerror` node or control secret appeared. Browser and all
  temporary data were cleaned; no probe file retained.

Evidence is Linux x64 / Node 24. Native macOS/Windows, public Pages URL, GitHub
writes and documentation coexistence remain unverified. No external mutation,
commit/push/PR or remote CI observation occurred.

Next action: the user confirms the destination and separately authorizes setup
and activation; the main agent performs only those approved actions and obtains
live proof when completed CI evidence is requested. Packets 11/12 need separate
authorization.

## External activation checkpoint — 2026-10-11

The user confirmed the proposed destination and authorized external setup and
public report/comment activation. Repository swimmwatch/cloakbrowser-mcp-reports
exists; Pages uses gh-pages/root. Source documentation Pages configuration is
unchanged. Source destination variable is saved; enable flag remains false until
App credentials and trusted workflow delivery are ready.

GitHub App CloakBrowser MCP Reports is created and installed only on the reports
repository (App ID 5267277, installation 170077714). The user confirmed access
and generated the private key. Source Client ID variable and private-key Actions
secret are saved. A temporary installation token verified exactly one repository,
Contents write, Pages read and Metadata read; it was revoked after verification.
Source documentation Pages configuration remains unchanged. Source main returns
404 for the publisher workflow and lacks reporting prerequisites, so publisher-only
delivery is insufficient. No report/comment publication has occurred.
PR 167 was closed at the user's request on 2026-10-11 and its auto-merge
was disabled. Source delivery is consolidated into `release/v1.15.0`, where
reporting implementation, periodic suites and CI fixes are preserved. No
replacement PR was created. Publication remains dependent on delivering the
trusted workflow to main. Existing Pages and App configuration are unchanged.
Local validation and remaining ownership are recorded in the handoff.
Packet 13 remains unchecked; no remote CI was launched, polled or awaited.


## Publication caller correction — 2026-10-11

The successful CI run `38141041561` uploaded its combined artifact but did not
publish Pages: `workflow_run` was not installed on the default branch and the
publisher excluded manual runs. CI now calls `publish-test-report.yml` through
`workflow_call` after `test-report`, with explicit source permissions and only the
reports App key. Same-repository PR and manual callers use `github.sha`; fork
notifications and retention use the default branch. Direct fork callers are
rejected before credentials are created. Manual runs without an open PR skip
publication explicitly while retaining their Actions artifact. Public HTML is
still regenerated from validated producer evidence, and a link is written only
after the Pages build and exact entrypoint digest have been verified.

Independent 6.1 Sol review found no actionable defects. Publisher unit and
integration tests passed (39/39); pinned actionlint and offline zizmor passed.
The reviewer did not run tests or exercise live publication. Actual
Pages publication remains unverified: the release branch currently has no open
PR, and this change does not create a replacement PR or modify Pages/App settings.
