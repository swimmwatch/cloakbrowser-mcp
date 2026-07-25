---
name: documentation-and-adrs
description: Write or revise cloakbrowser-mcp technical documentation or record a settled architecture decision only when the user explicitly requests documentation, an ADR, or documentation required by an authorized public-contract change. Use for bridge architecture, CLI and environment configuration, stdio or Streamable HTTP, local tools, child processes, Docker, security, compatibility, and delivery tradeoffs; do not create routine implementation notes, speculative behavior, unrequested translations, or release notes.
---

# Documentation And ADRs

1. Read `AGENTS.md`, the target document, related canonical pages, and the
   code, tests, configuration, or workflow proving current behavior.
2. Use `README.md` for the concise public entry point and the closest English
   page under `docs/` for detail, especially `docs/architecture.md`,
   `docs/getting-started.md`, `docs/configuration.md`, `docs/docker.md`, or
   `docs/tools.md`.
3. Separate verified current behavior, proposed work, experiments, open
   questions, and settled decisions. Never document a proposal as released
   behavior.
4. Update one authoritative owner and link to it instead of duplicating facts.
   Preserve generated CLI and compatibility content ownership.
5. Treat a durable architecture record as warranted only for a consequential,
   cross-cutting choice with real alternatives and long-lived reversal costs.
   Prefer updating `docs/architecture.md` when it already owns the decision;
   establish a new ADR location only with explicit scope and a repository
   convention.
6. For a decision record, state context, decision, alternatives, consequences,
   compatibility and security effects, and reversal conditions.
7. Follow the localization and translation-manifest rules in `AGENTS.md`.
   Use Prompt MCP for unresolved material documentation choices, not routine
   wording.
8. Run the applicable documentation checks and `npm run check`.

Stop when the requested documentation artifact is complete. Do not expand into
implementation, translation generation, changelog work, release preparation,
or publishing without separate authorization.
