# AGENTS.md

Operating manual for AI coding agents working in this repository.

## About the project

`cloakbrowser-mcp` is a Model Context Protocol (MCP) server that exposes
[CloakBrowser](https://github.com/swimmwatch/cloakbrowser) — a stealth
Chromium automation library — as tools for AI agents. It is published to npm as
a library and as a CLI (`bin: cloakbrowser-mcp`).

- Runtime: Node.js `>=20`, ES modules, TypeScript `strict` with `NodeNext`.
- Transport: stdio (`@modelcontextprotocol/sdk`).
- Public surface: programmatic API in `src/index.ts` and the CLI in `src/cli.ts`.

## Golden rules

1. **Write the simplest possible code.** Nothing extra. Easy to read at first
   glance. Code should be self-explanatory and contain no comments. Do only
   what was requested — no speculative features, no "while I'm here"
   refactors, no extra abstractions for one-time operations.
2. **Use the `context7` MCP tool whenever you need up-to-date documentation,
   API references, setup steps, or code samples for a library.** Do this
   proactively, without waiting to be asked. Never guess an API surface from
   memory when `context7` can confirm it.
3. **Everything in this repository is written in English** — code, comments
   (when they are unavoidable), commit messages, docs, error messages, log
   lines, identifiers, and PR descriptions. No exceptions.

## Project layout

```
src/
  cli.ts                  bin entry (commander-based)
  server.ts               MCP server wiring
  index.ts                public library exports
  config/                 zod schema + env/CLI loader
  errors/                 CloakMcpError + error codes
  logging/                pino-backed stderr logger
  security/               capability gates + origin policies
  artifacts/              screenshot/file output manager
  browser/                BrowserAdapter contract + Cloak/Mock impls + SessionManager
  tools/                  ToolRegistry, ToolContext, MVP tool implementations
tests/
  unit/                   per-module unit tests
  integration/            end-to-end server tests with MockBrowserAdapter
  fixtures/               static mock page data
```

## Daily commands

```bash
npm run dev          # tsx src/cli.ts — run the CLI from sources
npm test             # vitest run
npm run test:watch   # vitest in watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run lint:fix     # eslint . --fix
npm run format       # prettier --write .
npm run format:check # prettier --check .
npm run build        # tsc + tsc-alias → dist/
npm run check        # typecheck + lint + format:check + test (run before every commit)
```

`npm run check` must pass before any change is considered done.

## Coding conventions

### TypeScript

- `strict` mode is on. Never weaken it (no `// @ts-ignore`, no `any`, no
  non-null assertions to silence the checker). If something does not
  type-check, fix the types.
- ESM only. Every internal import ends with `.js` (NodeNext requirement),
  including `.ts` source files.
- Use the `@/*` path alias for any import that would otherwise need `../`.
  Same-folder imports stay relative (`./foo.js`). Alias maps to `src/*` and is
  rewritten at build time by `tsc-alias`.
- Validate untrusted input (CLI args, env vars, tool arguments) with `zod`
  schemas. Never trust raw input downstream of a boundary.
- Errors thrown across module boundaries must be `CloakMcpError` with a
  documented code from `src/errors`.
- Logging goes through the `Logger` interface from `src/logging/logger.ts`.
  **Never use `console.*`** — stdio is reserved for the MCP transport, all
  log output must hit stderr via pino.
- Prefer pure functions and explicit dependency injection over module-level
  state.

### Style

- Prettier is the source of truth for formatting (run `npm run format`).
- Lint with the flat ESLint config; do not disable rules inline unless
  unavoidable, and if you must, add a one-line justification.
- No comments unless the code genuinely cannot be made self-explanatory. If
  you feel the need to comment, first try renaming, splitting, or simplifying.
- Names are descriptive and in English. No abbreviations beyond well-known
  ones (`url`, `id`, `ctx`).

### Tests

- Vitest. Place unit tests under `tests/unit/`, integration tests under
  `tests/integration/`. Use `MockBrowserAdapter` for anything that would
  otherwise launch a real browser.
- Every new tool, capability gate, or security policy needs a test.
- Tests must not write outside a `tmpdir()` directory they create themselves
  and clean up in `afterEach`.

## Security & capability model

This project automates a browser on behalf of an AI agent. Treat every change
as security-sensitive.

- All risky behavior is gated by **capability flags** declared in
  `src/config/schema.ts` (`allowPdf`, `allowFileAccess`, `allowUploads`, …).
  Default off; only `allowScreenshots` defaults on.
- Tools declare required capabilities in their `ToolDefinition.capabilities`
  array. The `ToolRegistry` refuses to register tools whose capability is off
  and refuses to dispatch if a capability is revoked at runtime.
- Origin allow/deny lists in `src/security/policies.ts` are enforced for every
  navigation. Do not bypass `assertOriginAllowed`.
- A small set of tool names is permanently disabled (e.g. `browser_evaluate`).
  Do not re-enable them and do not add new arbitrary-code-execution surfaces.
- Never log secrets, cookies, full request bodies, or full page DOMs.

If a change touches the security or capability layer, call it out explicitly
in the PR description.

## Adding a new MCP tool

1. Create the implementation file under `src/tools/impl/<area>.ts` exporting
   a `ToolDefinition` (or factory returning one).
2. Define the input schema with `zod`. Keep it minimal.
3. Set `capabilities: [...]` to the smallest set required.
4. Register the tool from `src/tools/index.ts`.
5. Add unit tests for the tool logic and at least one integration test that
   exercises it through the MCP server with `MockBrowserAdapter`.
6. Run `npm run check`.

## Library & API documentation

When you need details about an external library or API — `commander`, `pino`,
`zod`, `@modelcontextprotocol/sdk`, `cloakbrowser`, `playwright-core`,
`vitest`, ESLint, TypeScript, Node.js APIs, etc. — **use the `context7` MCP
tool** to fetch authoritative, up-to-date docs before writing code. Do not
rely on memory and do not guess option names, type signatures, or defaults.

## Commit & PR hygiene

- One logical change per commit. Imperative present-tense subject in English
  (`add pdf tool`, not `Added pdf tool` / `Adding…`).
- Run `npm run check` locally; CI runs the same.
- Update `README.md` when public behavior, CLI flags, env vars, or
  capabilities change.
- Bump `version` in `package.json` only when explicitly asked.

## Things not to do

- Do not add a `package.json` dependency you do not actually import.
- Do not introduce a new build step, bundler, or runtime without explicit
  approval.
- Do not write to `stdout` from anywhere except the MCP transport.
- Do not commit anything under `dist/`, `coverage/`, `artifacts/`, or
  `node_modules/`.
- Do not weaken TypeScript, ESLint, or Prettier configuration to make a
  change pass. Fix the change instead.
- Do not add features, helpers, comments, or docstrings beyond what the task
  requires.
