# Release v1.13.0 dependency refresh

Status: Approved

## Outcome

Prepare one local, reviewable change set on `release/v1.13.0` for the stable
`v1.13.0` release. It refreshes the specified direct dependencies, their npm
lockfile resolution, the Playwright MCP Docker baseline, and action pins. It
also carries the required compatibility, test, documentation, and release
metadata updates.

The release PR consolidates rather than merges Dependabot PRs. It targets
`main` and, once separately authorized, must use the title
`chore(release): prepare v1.13.0` and include `Closes #129` and `Closes #130`.

## Requirements

1. **DEP-01 — package refresh.** With npm `11.19.0`, update the direct
   dependencies to the supplied versions: `@playwright/mcp` `^0.0.80`,
   `cloakbrowser` `^0.5.10`, `@types/node` `^26.4.1`,
   `@vitest/coverage-v8` and `vitest` `^5.0.0`, `eslint` `^10.9.1`,
   `eslint-plugin-jsdoc` `^64.3.4`, `eslint-plugin-perfectionist` `^5.11.0`,
   `tsx` `^4.23.13`, and `typescript-eslint` `^8.69.0`. Regenerate
   `package-lock.json` using that npm version. Keep existing Vitest include
   patterns, timeouts, and coverage thresholds unless Vitest 5 proves an
   incompatible configuration.
2. **DEP-02 — documentation tooling.** Set
   `mkdocs-git-revision-date-localized-plugin` to `>=1.5.4` in the Python
   dependency definition.
3. **CI-01 — workflow pins.** Pin every `github/codeql-action` component to
   `ff2f1c621b7f889edc0d3c761ac2e6a3f8cdb0dd # v4.37.7` and every
   `docker/setup-buildx-action` component to
   `37fe631027851001ddb9b187196cc803df7f5f0e # v4.3.0`.
4. **DOCKER-01 — image baseline.** Use
   `mcr.microsoft.com/playwright/mcp:v0.0.80@sha256:dda1f7f9b812e22946635c8af7df9288b96d3b9e3f0f1b8576d6823e2031c1de`
   in Dockerfile and all CI/release workflow baselines. Add
   `fonts-urw-base35` to the final runtime image and prove it is installed in
   the built container.
5. **CLOAK-01 — public integration.** Continue to use only CloakBrowser's
   public `ensureBinary`, `binaryInfo`, `buildLaunchOptions`,
   `getDefaultStealthArgs`, and `humanizeBrowser` APIs. Keep runtime cleanup
   when any call fails.
6. **CLOAK-02 — error fidelity.** Add a unit test proving an error from
   `buildLaunchOptions` propagates without masking and temporary runtime state
   is removed.
7. **CLOAK-03 — humanization smoke.** Exercise a humanization action after
   navigation and `selectOption`.
8. **CLOAK-04 — documented security and license behavior.** Document
   fail-closed GeoIP behavior, its maximum 20-second timeout, and explicit
   invalid or unavailable license errors. Do not add a SessionSeats tool: it
   is not exported by CloakBrowser `0.5.10`'s public package entry point.
9. **PW-01 — upstream parity.** Refresh npm, Docker, parity baseline, and
   upstream reference to Playwright MCP `0.0.80` commit
   `4c1fb03bad3bae379b0ae0e3d81d2660de56bd91`. The default 24 upstream tools
   remain forwarded unchanged.
10. **PW-02 — capability parity.** Add a parity scenario with
    `PLAYWRIGHT_MCP_CAPS=devtools`. It must compare bridge and baseline
    schemas and cover `browser_start_recording` and `browser_stop_recording`.
11. **PW-03 — configuration compatibility.** Do not add a bridge `--caps`
    flag: child-process inheritance of `PLAYWRIGHT_MCP_*` already carries
    `PLAYWRIGHT_MCP_CAPS`.
12. **COMP-01 — public compatibility.** Preserve the existing public CLI,
    MCP, Streamable HTTP, Node support, platform support, and transport
    contracts. Do not claim Windows ARM64 support; issue #89 remains open.
13. **COMP-02 — generated compatibility documentation.** Add a compatibility
    row for Playwright MCP `0.0.80`, Docker `v0.0.80`, CloakBrowser `0.5.10`,
    and unchanged Node/platform/transport support, then regenerate the
    compatibility tables.
14. **REL-01 — release metadata.** Run `npm run version:apply -- v1.13.0`,
    update `CHANGELOG.md` according to Keep a Changelog 1.1.0, and preserve
    an empty `[Unreleased]` section above the dated `1.13.0` section with
    correct comparison links.
15. **REL-02 — documentation and translations.** Update the public tools,
    GeoIP, and configuration documentation. Update each affected localized
    Markdown file surgically and then refresh only its accurate translation
    manifest entries. Do not bulk-regenerate translations.
16. **QA-01 — verification.** Run the requested CI, package, Docker, smoke,
    bridge parity, generated-documentation, translation, actionlint, and
    zizmor checks. Inspect and remove `bridge-parity-report.json` afterward.
    A failure blocks GitHub operations.
17. **GH-01 — manual delivery gates.** Commit, push, PR creation, PR or issue
    closure, merge, tagging, and publishing require separate explicit user
    authorization. Publishing `v1.13.0` is out of scope.
18. **GH-02 — post-green replacement cleanup.** After a green, separately
    created replacement release PR, close Dependabot PRs #120, #122–#125,
    #127, and #128 as superseded with a comment linking the replacement PR and
    the actually included versions. Re-read GitHub state after every mutation.
19. **GH-03 — obsolete issue cleanup.** Under the same manual gate, close
    #110, #119, and #126 as superseded by #129 and the replacement release PR.
    Do not close #89 or #107. #129 and #130 close only when the release PR is
    merged.

## Constraints and non-goals

- The bridge forwards upstream Playwright MCP tools unchanged and keeps only
  `cloakbrowser_binary_info` and `cloakbrowser_bridge_info` as local tools.
- No public CLI option, MCP tool, HTTP route, or environment namespace is
  added for this update.
- Preserve the user's untracked `.trackerignore` exactly.
- No Dependabot PR is merged; no GitHub state is changed in this work until a
  separate manual gate is granted.
- No tag, package publication, Docker publication, registry publication, or
  release merge is performed.

## Failure handling and rollback

Any failed validation stops the work before GitHub operations. Restore only
the failed packet's local changes by a targeted follow-up change; do not reset
or delete unrelated worktree content. CloakBrowser configuration failures must
remain visible to operators and release temporary runtime resources.

## Acceptance evidence

The change set is acceptable when all requirements above are implemented and
the requested validation commands pass. Container inspection proves
`fonts-urw-base35`; parity output proves default and devtools schemas match;
documentation checks prove compatibility and translations are current. The
release PR and GitHub cleanup remain explicitly gated actions.
