# AGENTS.md

Repository-specific instructions for AI coding agents working on `cloakbrowser-mcp`.
Global agent instructions remain authoritative for general communication, research,
tool use, editing, and completion behavior.

## Project

`cloakbrowser-mcp` is a stdio MCP bridge for upstream `@playwright/mcp`. It starts
Playwright MCP as a child process, injects the CloakBrowser Chromium executable through
a generated config, forwards upstream tools unchanged, and adds two local introspection
tools.

- Runtime: Node.js `^22.13.0 || >=24.0.0`, ES modules, strict TypeScript with `NodeNext`.
- Public surface: CLI package only, `bin: cloakbrowser-mcp`.
- Docker base: pinned official Playwright MCP image from `Dockerfile`.
- Repository artifacts are written in English unless a localization file requires
  another language.

## Invariants

- Do not copy, rewrite, or mutate upstream Playwright MCP browser tool contracts.
- Local tools are limited to `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.
- `PLAYWRIGHT_MCP_*` is the primary configuration namespace.
- `CLOAK_PLAYWRIGHT_MCP_*` is only for bridge-specific Cloak toggles.
- Do not add `CLOAKBROWSER_MCP_*` aliases.
- Runtime logs never go to `stdout`; preserve stdio protocol safety.
- Preserve Streamable HTTP session isolation and child-process cleanup.

## Layout

- `src/cli.ts`: CLI entry point; `src/server.ts`: outer MCP proxy.
- `src/bridge/`: config, environment, paths, and local tools.
- `src/cli/`: options and lifecycle; `src/http/`: HTTP sessions and transport.
- `src/logging/`, `src/protocol/`, `src/runtime/`, `src/project/`: shared runtime support.
- `tests/unit/`, `tests/integration/`, `tests/fixtures/`: Vitest suites and fake upstream.

## Development

Run the smallest relevant checks while developing. Before completion, run:

```bash
npm run check
```

Task-specific commands include `npm run test:unit`, `npm run test:integration`,
`npm run build`, `npm run package:verify`, `npm run docker:build`,
`npm run docker:smoke`, and `npm run bridge:compare`.

## TypeScript And Runtime

- Keep TypeScript `strict` mode and ESM; internal imports end with `.js`.
- Use `#src/...` for runtime source, `@/...` in tests, `@tests/...` for test helpers,
  and `#scripts/...` for scripts instead of relative internal imports.
- Prefer explicit types and small pure functions.
- Do not use `console.*` in runtime code. CLI help/version may use `process.stdout`;
  errors may use `process.stderr`.
- Do not add `any`, `// @ts-ignore`, or non-null assertions to silence the checker.

## Bridge And Tests

- Keep generated browser configuration in the bridge boundary and upstream process
  transport in the server boundary.
- Treat generated configs, profiles, extensions, proxy credentials, and browser child
  processes as lifecycle-owned resources.
- Keep errors actionable without exposing secrets or protocol-breaking output.
- Use the fake upstream server for proxy behavior.
- Tests write only to `tmpdir()` paths they create and clean up.
- Prefer property-based tests for parsers, options, environment handling, and similar
  boundary-heavy pure logic.
- Use distribution or Docker end-to-end tests for packaged CLI, container entrypoint,
  or real-browser behavior.

## Workflow Routing

Generic engineering workflows are installed globally through Engineer Agent Workflows.
Use the active skill catalog and matching skill by name. Do not vendor global workflow
copies into this repository or hardcode plugin-cache paths.

- `/spec` routes to `spec-driven-development`.
- `/plan` routes to `planning-and-task-breakdown`.
- One authorized task packet routes to `incremental-implementation`.
- Manifest-scoped UI design after planning routes to `design-planning`.
- Review, simplification, context engineering, technical documentation or ADRs,
  decision challenges, idea refinement, interviews, performance, and security route to
  their matching global skills.
- Global workflow skills are explicit-only. One stage does not authorize another,
  commits, publication, or external mutations.

Project-owned skills remain under `.agents/skills/`:

- `project-docs-maintainer`: documentation-set maintenance, localization, and generated
  documentation consistency.
- `project-pull-request`: GitHub pull request preparation and mutation.
- `project-release`: release preparation, publication, verification, and recovery.

Use `documentation-and-adrs` for a focused technical document or ADR. Use
`project-docs-maintainer` when generated or localized documentation must remain
consistent. Durable workflow artifacts belong under `docs/specs/<slug>/`; the selected
skill owns its questions, manifests, reviews, checklists, and handoffs.

## Supply Chain

- Use top-level `contents: read` in GitHub workflows; add write permissions only to the
  job that needs them.
- Pin external Actions by full commit SHA with the intended version in a trailing
  comment, for example `# v6`.
- Pin Docker images as `tag@sha256:<digest>` while retaining the readable tag. Use image
  reference variables such as `NODE_IMAGE_REF`, not tag-only build inputs.
- Keep `scripts/lib/playwright-mcp-upstream.mjs` able to read a tag from a pinned
  upstream Playwright MCP image reference.
- Do not broadly disable zizmor or OpenSSF Scorecard findings.
- Keep `SECURITY.md` actionable with a private vulnerability-reporting path.
- Branch protection, rulesets, required reviewers, and required checks are
  maintainer-controlled and require explicit confirmation of the exact policy.

After workflow, Docker, token-permission, or registry-publishing changes, run:

```bash
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
```

## Documentation

Update relevant public documentation when CLI, Docker, environment, or tool behavior
changes. English documentation is the source for localized MkDocs pages.

- Update each affected `*.ru.md`, `*.be.md`, `*.uk.md`, `*.es.md`, `*.pt-BR.md`,
  `*.zh.md`, `*.ja.md`, `*.de.md`, `*.fr.md`, and `*.hi.md`, or document why deferred.
- Translate only changed prose, using DeepL when available and manual translation when
  unavailable. Preserve Markdown structure, code, identifiers, URLs, flags, variables,
  package names, image paths, and Material icon tokens.
- Do not bulk-regenerate translations unless explicitly requested. Refresh only actual
  affected entries in `docs/data/translation-manifest.json`.
- Run `npm run docs:build`, `npm run docs:seo:validate`,
  `npm run docs:translations:check`, and `npm run check`.
- Compatibility data is owned by `docs/data/version-compatibility.json`. Generate and
  verify tables with `npm run docs:compatibility` and
  `npm run docs:compatibility:check`.
- `CHANGELOG.md` follows Keep a Changelog 1.1.0. Before release-note edits, open
  `https://keepachangelog.com/en/1.1.0/` and preserve `[Unreleased]`, ISO dates,
  comparison links, and standard sections.

## Commit And Release Hygiene

- Keep one logical change per commit and obtain explicit confirmation before committing.
- Follow Conventional Commits 1.0.0. Before committing, open
  `https://www.conventionalcommits.org/en/v1.0.0/`.
- Keep subjects concise, imperative, and present tense after the conventional prefix.
- Bump `version` only when explicitly requested.
- Call out security-sensitive changes in pull request descriptions.
- Follow `project-pull-request` and `project-release` for external delivery. Local
  validation or artifact preparation does not authorize later actions.

## Prohibited Changes

- Do not restore the old native adapter, custom capability model, origin policy,
  artifact manager, verify helpers, or custom browser tools.
- Do not add unused dependencies or introduce a bundler or runtime without approval.
- Do not commit `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/`, or
  `node_modules/`.
- Do not weaken TypeScript, ESLint, Prettier, test, security, or compatibility checks.
