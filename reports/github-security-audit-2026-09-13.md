# GitHub Security Audit — 2026-09-13

## Scope and sources

This is a read-only consolidation of the repository's open GitHub Security
alerts on 2026-09-13. It does not change dependencies, workflows, repository
settings, or alert state.

Sources:

- GitHub Dependabot API: 7 open alerts.
- GitHub code-scanning API: 14 open alerts.
- GitHub secret-scanning API: 0 open alerts.
- Local `npm audit --json` after `npm ci`: 2 vulnerable package entries (1
  high, 1 moderate).

The code-scanning alerts currently point to commit
`8131d1b72cfe658aa2d74c11162b53bd120fe81d`, not the current `main` tip at
the time of this audit. They should therefore be treated as findings to
revalidate, not proof that every finding still applies unchanged.

## Deduplicated findings

### P0 — Protect `main` before changing code

One [Branch-Protection alert](https://github.com/swimmwatch/cloakbrowser-mcp/security/code-scanning/1)
reports that `main` is unprotected. A separate
[Code-Review alert](https://github.com/swimmwatch/cloakbrowser-mcp/security/code-scanning/66)
reports zero approved changesets in its sample. These are two symptoms of the
same repository-governance gap, not two independent code defects.

Proposed remediation for maintainers:

1. Create a GitHub ruleset targeting `main` that requires pull requests,
   blocks force pushes and branch deletion, and has no broad bypass actors.
2. Require at least one approval from someone other than the latest pusher;
   dismiss stale approvals when the pull-request diff changes.
3. Require the relevant CI checks before merge and require the head branch to
   be up to date with `main`.
4. Apply the equivalent protection to release branches when they exist.

GitHub documents the available ruleset controls for required reviews, status
checks, and force-push blocking in
[Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
This is a repository-settings change and requires maintainer authorization; it
cannot be fixed by a package update.

### P1 — Four dependency upgrade actions cover all known advisories

The 7 Dependabot alerts plus the aggregate
[Scorecard Vulnerabilities alert](https://github.com/swimmwatch/cloakbrowser-mcp/security/code-scanning/70)
contain nine advisory records. They reduce to the following four package
actions:

| Package and exposure | Advisory records | Current affected resolution | Patched target | Proposed remediation |
| --- | --- | --- | --- | --- |
| `qs`, production transitive dependency through `@modelcontextprotocol/sdk` → Express | [#39](https://github.com/swimmwatch/cloakbrowser-mcp/security/dependabot/39), [#44](https://github.com/swimmwatch/cloakbrowser-mcp/security/dependabot/44) | `6.15.3` | `6.16.0` | Update the upstream SDK/Express chain when it provides the patch, or add a narrowly scoped root `overrides.qs` entry, regenerate `package-lock.json`, and run HTTP/integration tests. |
| `brace-expansion`, development transitive dependency through ESLint plugins | [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg), [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | nested `5.0.7` copies under `eslint-plugin-import-x` and `eslint-plugin-sonarjs` | `5.0.9` | Upgrade the parent plugins if available; otherwise use a root override to `5.0.9`, regenerate the lockfile, and run lint and the full check. |
| `fast-uri`, development transitive dependency only in `tools/video/30-second-demo/package-lock.json` | [#36](https://github.com/swimmwatch/cloakbrowser-mcp/security/dependabot/36), [#38](https://github.com/swimmwatch/cloakbrowser-mcp/security/dependabot/38), [#41](https://github.com/swimmwatch/cloakbrowser-mcp/security/dependabot/41), [#43](https://github.com/swimmwatch/cloakbrowser-mcp/security/dependabot/43) | `3.1.5` | `3.1.6` or newer; `3.1.7` is already selected by the root project | Update the Remotion dependency tree in the video subproject, or add a scoped override there, then regenerate its own lockfile and verify the video build. |
| `js-yaml`, development transitive dependency only in `tools/video/30-second-demo/package-lock.json` | [#45](https://github.com/swimmwatch/cloakbrowser-mcp/security/dependabot/45) | `4.3.1` | `4.3.2` | Update the video subproject's parent dependency or add a scoped override, regenerate its lockfile, and verify the video build. |

The local root audit currently reports only `qs` and `brace-expansion`; it does
not install the video subproject's independent lockfile. That explains why the
GitHub Security view has more dependency alerts than the root `npm audit`.

Before merging any dependency remediation, run `npm ci`, `npm audit`, `npm run
check`, the affected video-project checks, and a fresh Scorecard/Dependabot
scan. Keep overrides temporary where an upstream dependency upgrade can remove
them.

### P2 — One workflow supply-chain finding repeated ten times

Alerts [#120](https://github.com/swimmwatch/cloakbrowser-mcp/security/code-scanning/120)
through [#129](https://github.com/swimmwatch/cloakbrowser-mcp/security/code-scanning/129)
all report the same Scorecard result: `npmCommand not pinned by hash`. They are
historical repetitions of one finding, not ten distinct locations.

The current workflows and Dockerfile install npm from the registry with commands
such as `npm install --global npm@${NPM_VERSION}`. A version pin is reproducible
but does not meet Scorecard's content-hash pinning model for a command that
downloads and executes a package.

Options, in order of preference:

1. Remove the global npm download where the runner's bundled npm is sufficient.
2. Move the required npm version into a maintained, digest-pinned build image,
   so CI does not download it during the workflow.
3. If a runtime install is unavoidable, fetch a versioned npm tarball and
   verify its published integrity before installation. Confirm with a fresh
   Scorecard run because its `npmCommand` detector may still not recognize this
   pattern.

Do not suppress the finding solely to improve a score. The Scorecard
[Pinned-Dependencies check](https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies)
is useful here, but the remediation should be validated against the current
workflow rather than the stale code-scanning result.

### P3 — OpenSSF Best Practices badge is a process improvement

The [CII-Best-Practices alert](https://github.com/swimmwatch/cloakbrowser-mcp/security/code-scanning/69)
is low severity and does not identify an exploitable code path. It reports that
the repository has not enrolled in the OpenSSF Best Practices Badge program.

Proposed remediation: create a project entry, complete the applicable
questionnaire truthfully, link the resulting badge from the repository only
after it reaches the intended level, and revisit it periodically. This is
worth doing after branch protection and dependency remediation; it should not
block an urgent security fix.

## Non-findings

- No open secret-scanning alerts were returned by GitHub.
- The report does not classify the Docker Headed Mode or Playwright issues as
  security findings; neither appeared in the queried GitHub Security alert
  sources.

## Recommended order of work

1. Apply the `main` ruleset and require CI/review gates.
2. Patch `qs` and `brace-expansion` in the root dependency tree; verify runtime
   HTTP behavior and full checks.
3. Patch `fast-uri` and `js-yaml` in the independent video subproject lockfile.
4. Replace or harden global npm installation in CI and Docker, then rerun
   Scorecard.
5. Rerun GitHub code scanning on the current `main` commit; close or dismiss
   only findings shown to be fixed or inapplicable, with an auditable reason.
6. Consider the OpenSSF badge as follow-up governance work.
