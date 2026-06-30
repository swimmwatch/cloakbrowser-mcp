---
name: project-release
description: Use when preparing, publishing, verifying, or recovering a cloakbrowser-mcp release. Requires a confirmed target version such as v1.2.8, can propose one from changes since the previous release, and guides branch, version metadata, changelog, PR, GitHub Release, registry, Docker, npm, and docs verification.
---

# Project Release

Use this skill only for `cloakbrowser-mcp` release work. Require a confirmed
target version such as `v1.2.8`, and decide whether it is stable or prerelease
before preparing, publishing, or recovering a release. If the user has not
provided a target version, propose one from the unreleased changes and ask the
user to confirm it or choose a different tag before release execution.

Release tags use Semantic Versioning 2.0.0 with the repository's `v` prefix,
for example `v1.2.8` or `v1.2.8-rc.1`. The pinned specification URL is
`https://semver.org/spec/v2.0.0.html`.

## Choosing The Target Version

- If the user provides a target tag, validate it before changing files.
- If no target tag is provided, fetch tags and inspect changes since the
  previous release tag:

```bash
git fetch origin --tags --prune
git describe --tags --abbrev=0
git log --oneline <previous-tag>..HEAD
```

- Also inspect `[Unreleased]` in `CHANGELOG.md`, merged PR titles, and
  Conventional Commit subjects when available.
- Propose the next tag using Semantic Versioning 2.0.0:
  - `MAJOR` for backward-incompatible public API, CLI, MCP protocol, config, or
    artifact contract changes;
  - `MINOR` for backward-compatible user-facing features;
  - `PATCH` for backward-compatible fixes, dependency updates, docs, CI, or
    packaging-only changes.
- Present the proposed tag and short rationale, then ask the user to confirm it
  or choose another tag. Do not run `npm run version:apply` until the tag is
  confirmed.

## Preconditions

- Start from a clean worktree; do not overwrite unrelated user changes.
- Fetch latest refs and branch from current `main` unless the user explicitly
  gives another base.
- Confirm no existing Git tag or GitHub Release already uses the target version.
- Before confirming the release tag, open and scan
  `https://semver.org/spec/v2.0.0.html`, then validate that the requested tag
  is the `v`-prefixed form of a SemVer 2.0.0 version.
- Exclude known failing or unrelated dependency PRs unless the user explicitly
  includes them.
- Before editing `CHANGELOG.md`, open and scan
  `https://keepachangelog.com/en/1.1.0/`.
- Before committing, open and scan
  `https://www.conventionalcommits.org/en/v1.0.0/`.

## Version Preparation

Run the release version script with the exact tag:

```bash
npm run version:apply -- vX.Y.Z
```

The script updates:

- `package.json`
- `package-lock.json`
- `server.json`

Documentation release tags and pinned install examples are rendered at MkDocs
build time from `package.json` through `docs_macros.py`; do not manually rewrite
those values in Markdown sources.

Manual release updates still required:

- add one new row to `docs/data/version-compatibility.json`;
- run `npm run docs:compatibility`;
- verify `README.md`, `docs/index.md`, and `docs/version-compatibility.md`
  changed as expected;
- verify the new compatibility row records the actual `@playwright/mcp`,
  Playwright MCP Docker base, CloakBrowser dependency, supported transport, and
  platform;
- run `npm run docs:compatibility:check`;
- move current `[Unreleased]` entries in `CHANGELOG.md` into
  `## [X.Y.Z] - YYYY-MM-DD`;
- add or update the empty `[Unreleased]` section above the new release;
- update changelog compare links so `[Unreleased]` compares
  `vX.Y.Z...HEAD` and `[X.Y.Z]` compares the previous tag to `vX.Y.Z`;
- update release docs examples only if they are intended to show the current
  release instead of a generic example.

Do not bump the package version outside release preparation.

## Validation

Before opening or merging the release PR, run:

```bash
npm run check:ci
npm run package:verify
npm run docker:build
npm run docker:smoke
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12 -color
python3 -m pipx run zizmor --min-severity high .
npm run docs:build
npm run docs:seo:validate
```

Remove `bridge-parity-report.json` after inspecting it. If a check fails, fix
the smallest release-relevant cause and rerun the relevant command.

## PR And Release Flow

- Commit release preparation as `chore(release): prepare vX.Y.Z`.
- For release PR creation or updates, also read and follow
  `.agents/skills/project-pull-request/SKILL.md`.
- Open a PR to `main` with a concise release summary and validation list.
- Call out security-sensitive release workflow changes, especially registry
  credentials, public image publishing, OIDC, or token behavior.
- Wait for required PR checks to pass before merging.
- For stable releases, create a published GitHub Release with:
  - tag `vX.Y.Z`;
  - target `main`;
  - title `vX.Y.Z`;
  - notes from the `CHANGELOG.md` section.
- Mark prerelease versions as GitHub prereleases. Stable releases publish npm
  `latest` and Docker `latest`; prereleases publish npm `next` and prerelease
  Docker tags only.

## Post-Release Verification

Watch the unified `Release` workflow until `metadata`, `npm`, `docker`,
`mcp-registry`, `docs-build`, and `docs-deploy` complete. `docs-deploy`
must run only after npm, Docker, and MCP Registry publishing have succeeded.

Then verify:

```bash
npm view cloakbrowser-mcp@X.Y.Z version
docker pull swimmwatch/cloakbrowser-mcp:X.Y.Z
docker run --rm --init swimmwatch/cloakbrowser-mcp:X.Y.Z --help
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:X.Y.Z
npm run registry:check -- --version X.Y.Z
```

Confirm Docker Hub overview, short description, npm, GHCR, Docker Hub, docs,
and the official MCP Registry are current. GitHub `/mcp` visibility is curated
separately and may lag; treat it as a warning unless the user makes it a gate.

## Recovery

- If Docker Hub overview update fails with `Forbidden`, the
  `DOCKERHUB_TOKEN` secret needs a Docker Hub personal access token with
  read/write/delete permissions for `swimmwatch/cloakbrowser-mcp`; rerun failed
  release jobs after the secret is updated.
- If npm, GHCR, Docker Hub, or MCP Registry already published artifacts, do not
  delete and retag the same release for code defects. Prepare a follow-up patch
  release instead.
- Rerun failed jobs only after confirming the failure is transient or caused by
  a fixed external configuration.
- Keep release recovery notes in the final status report, including published
  artifact state and any warnings.
