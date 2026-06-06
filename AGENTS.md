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
4. Do not copy, rewrite, or mutate upstream Playwright MCP browser tool contracts.

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

## Documentation

Update `README.md`, `docs/getting-started.md`, `docs/configuration.md`, `docs/docker.md`, or `docs/tools.md` when public CLI, Docker, environment, or tool-surface behavior changes.

For release preparation, publishing, verification, or recovery requests, read and follow `.agents/skills/project-release/SKILL.md`.

`CHANGELOG.md` must follow Keep a Changelog `1.1.0`. The pinned specification URL is `https://keepachangelog.com/en/1.1.0/`. Before editing release notes, open and scan that specification, then write human-readable entries in reverse chronological order with an `[Unreleased]` section, ISO dates, comparison links, and standard sections such as `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`.

## Commit And PR Hygiene

- One logical change per commit.
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
