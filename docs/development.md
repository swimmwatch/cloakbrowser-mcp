# Development

This page is for contributors working from a source checkout. If you only want to run the MCP server, start with [Getting started](getting-started.md).

## Environment

- Node.js **≥ 20**.
- npm (the repository ships `package-lock.json`).
- For docs work, Python ≥ 3.10. Use `npm run docs:install` to create a local `.venv-docs/` and install `mkdocs-material`.

## Day-to-day commands

```bash
npm run dev              # tsx src/cli.ts — run the CLI from sources
npm test                 # unit + integration + contract
npm run test:watch       # vitest in watch mode
npm run typecheck        # tsc --noEmit
npm run lint             # eslint .
npm run lint:fix         # eslint . --fix
npm run format           # prettier --write .
npm run format:check     # prettier --check .
npm run build            # tsc + tsc-alias → dist/
npm run check            # typecheck + lint + format:check + test
npm run check:ci         # same set as CI's quality job
```

`npm run check` must pass before any change is considered done.

## Conventions

The repository's golden rules (also enforced for AI agents via [AGENTS.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/AGENTS.md)):

1. **Write the simplest possible code.** No speculative features, no "while I'm here" refactors, no extra abstractions for one-time operations.
2. **English only.** Code, identifiers, log lines, commits, docs, error messages. No exceptions.
3. **TypeScript `strict`.** No `any`, no `@ts-ignore`, no non-null assertions to silence the checker. Fix the types instead.
4. **ESM with NodeNext.** Internal imports end with `.js`. Use the `@/*` alias for any import that would otherwise need `../`.
5. **Validate at boundaries.** Untrusted input (CLI args, env, tool arguments) goes through `zod` schemas. No raw input flows downstream of a boundary.
6. **Errors are `CloakMcpError`.** Across module boundaries, throw a `CloakMcpError` with a documented code from `src/errors/`.
7. **Never `console.*`.** `stdout` is reserved for the MCP transport. All logs go through the `Logger` interface in `src/logging/logger.ts`.
8. **No comments unless unavoidable.** First try renaming, splitting, or simplifying.

Prettier and ESLint flat config are the source of truth for style. Do not disable rules inline unless unavoidable.

## Adding a new MCP tool

1. Create the implementation file under `src/tools/impl/<area>.ts`, exporting a `ToolDefinition` (or a factory returning one).
2. Define the input schema with `zod`. Keep it minimal — every optional field is a security and testing burden.
3. Set `capabilities: [...]` to the smallest set required. If no capability fits, the behavior is probably one that needs a new capability flag (rare; coordinate with maintainers).
4. Register the tool from `src/tools/index.ts`.
5. Add unit tests for the tool logic.
6. Add at least one integration test that exercises it through the MCP server with `MockBrowserAdapter`.
7. Update [docs/tools.md](tools.md) and, if a new capability was introduced, [docs/configuration.md](configuration.md).
8. Run `npm run check`.

## Adding a new capability flag

1. Add the flag to `src/config/schema.ts` (`capabilityFlagsSchema`). Default it to **off**.
2. Document it in [docs/configuration.md](configuration.md#capability-flags), including the security implication.
3. Reference the flag from at least one tool's `capabilities` array — adding an unused capability is forbidden.
4. Add a contract test confirming that, with the flag off, the gated tool is absent from the tool list.

## Browser-adapter abstraction

Never import `cloakbrowser` (or any other browser driver) outside of `src/browser/cloakAdapter.ts`. Tools, security policies, the registry, the session manager, and the artifact manager all depend on the `BrowserAdapter` interface only. This is what allows the entire integration + contract suite to run without a browser binary.

## Commit hygiene

- One logical change per commit.
- Imperative present-tense subject in English (`add pdf tool`, not `Added pdf tool`).
- `npm run check` must pass locally; CI runs the same set.
- Update `README.md`, `CHANGELOG.md`, and the relevant `docs/` page when public behavior, CLI flags, env vars, capabilities, or tools change.
- Do not manually prepare release-only version edits. Release workflows run `scripts/apply-release-version.mjs` and inject the GitHub release tag into package metadata, `server.json`, and version-marked docs.
