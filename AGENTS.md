# AGENTS.md

Operating manual for AI coding agents working in this repository.

## About The Project

`cloakbrowser-mcp` is a stdio MCP bridge for upstream `@playwright/mcp`. It starts upstream Playwright MCP as a child process, injects the CloakBrowser Chromium executable through a generated Playwright MCP config, forwards upstream tools unchanged, and adds only two local introspection tools.

- Runtime: Node.js `>=20`, ES modules, TypeScript `strict` with `NodeNext`.
- Public surface: CLI package only, `bin: cloakbrowser-mcp`.
- Docker base: pinned official Playwright MCP image from `Dockerfile`.

## Golden Rules

1. Write the simplest possible code. Do only what was requested.
2. Use the `context7` MCP tool whenever you need up-to-date documentation or API references for external libraries.
3. Everything in this repository is written in English.
4. AI-agent reasoning and code-agent reasoning for this repository must be in English.
5. Do not copy, rewrite, or mutate upstream Playwright MCP browser tool contracts.

## Project Layout

```text
src/
  cli.ts                  CLI entry point
  server.ts               outer MCP proxy server
  index.ts                metadata export only
  bridge/                 config generation, env parsing, upstream path resolution, local tools
  runtime/                console fallback source strings
  project/                project metadata
tests/
  unit/                   env/config/local tool tests
  integration/            fake-upstream MCP proxy tests
  fixtures/               fake upstream MCP server
```

## Daily Commands

```bash
npm run dev
npm test
npm run test:unit
npm run test:integration
npm run typecheck
npm run lint
npm run format
npm run format:check
npm run build
npm run package:verify
npm run docker:build
npm run docker:smoke
npm run bridge:compare
npm run check
```

`npm run check` must pass before any change is considered done.

## TypeScript

- Keep `strict` mode on.
- ESM only. Internal imports end with `.js`.
- Prefer explicit types and small pure functions.
- Do not use `console.*` in runtime code. CLI help/version may write to `process.stdout`; errors may write to `process.stderr`.
- Do not add `any`, `// @ts-ignore`, or non-null assertions to silence the checker.

## Bridge Rules

- Upstream Playwright MCP tools are forwarded unchanged.
- Local tools are limited to `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.
- `PLAYWRIGHT_MCP_*` is the primary configuration namespace.
- `CLOAK_PLAYWRIGHT_MCP_*` is only for bridge-specific Cloak toggles.
- Do not add `CLOAKBROWSER_MCP_*` aliases.
- Do not restore the old native adapter, custom capability model, origin policy, artifact manager, verify helpers, or custom browser tools.

## Tests

- Vitest.
- Unit tests live under `tests/unit/`.
- Integration tests live under `tests/integration/`.
- Use the fake upstream MCP server for proxy behavior.
- Tests must write only to `tmpdir()` paths they create and clean up.
- Prefer property-based tests for parsers, option normalization, environment
  handling, and other boundary-heavy pure logic.

## Supply Chain And GitHub Security

- Keep GitHub workflow permissions least-privilege: use top-level
  `contents: read`, and declare write permissions only on the specific job that
  needs them.
- Pin external GitHub Actions by full commit SHA. Keep the intended upstream
  version in a trailing comment, for example `# v6`, so updates remain
  reviewable.
- Pin Docker images used by the Dockerfile and workflows with `tag@sha256:...`
  references. Preserve the readable tag next to the digest.
- Use image reference variables such as `NODE_IMAGE_REF` for pinned image refs;
  avoid tag-only variables for build inputs.
- When changing the pinned upstream Playwright MCP image, keep
  `scripts/lib/playwright-mcp-upstream.mjs` able to read the tag from a
  `tag@sha256:...` value.
- Do not disable zizmor or OpenSSF Scorecard findings broadly. Suppress only a
  narrowly scoped finding with a clear reason.
- Run actionlint and zizmor after workflow, Docker, token permission, or
  registry publishing changes:

```bash
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
```

- Keep `SECURITY.md` actionable with a private vulnerability reporting path.
- Repository settings such as branch protection, rulesets, required reviewers,
  and required checks are maintainer-controlled. Do not change them without
  explicit confirmation of the exact policy.

## Documentation

Update `README.md`, `docs/getting-started.md`, `docs/configuration.md`, `docs/docker.md`, or `docs/tools.md` when public CLI, Docker, environment, or tool-surface behavior changes.

Compatibility tables are generated from `docs/data/version-compatibility.json`. For release work, add the new compatibility row there, run `npm run docs:compatibility`, and verify both the full table in `docs/version-compatibility.md` and the compact compatibility table in `README.md` are updated. Run `npm run docs:compatibility:check` before finishing so the generated tables in `README.md`, `docs/index.md`, and `docs/version-compatibility.md` cannot drift.

For release preparation, publishing, verification, or recovery requests, read and follow `.agents/skills/project-release/SKILL.md`.

For Pull Request creation, updates, or review-prep requests, read and follow `.agents/skills/project-pull-request/SKILL.md`.

`CHANGELOG.md` must follow Keep a Changelog `1.1.0`. The pinned specification URL is `https://keepachangelog.com/en/1.1.0/`. Before editing release notes, open and scan that specification, then write human-readable entries in reverse chronological order with an `[Unreleased]` section, ISO dates, comparison links, and standard sections such as `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`.

## Commit And PR Hygiene

- One logical change per commit.
- Before creating a commit for local changes, ask the user for explicit confirmation that the commit should be created.
- Commit messages must follow Conventional Commits `1.0.0`.
- The pinned specification URL is `https://www.conventionalcommits.org/en/v1.0.0/`.
- Before creating a commit, open and scan the pinned specification, then choose the commit `type`, optional `scope`, optional breaking-change marker, subject, body, and footers according to that version.
- Use lowercase conventional types such as `feat`, `fix`, `docs`, `test`, `ci`, `build`, `refactor`, `perf`, `style`, or `chore` when they match the change.
- Keep commit subjects concise, imperative, and present tense after the conventional prefix.
- Bump `version` only when explicitly asked.
- Call out security-sensitive changes in the PR description.

## Things Not To Do

- Do not add dependencies you do not import.
- Do not introduce a bundler or new runtime without explicit approval.
- Do not write MCP runtime logs to `stdout`.
- Do not commit `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/`, or `node_modules/`.
- Do not weaken TypeScript, ESLint, or Prettier configuration.
