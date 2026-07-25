---
name: idea-refine
description: Refine a cloakbrowser-mcp product, architecture, tooling, documentation, security, packaging, or workflow idea only when the user explicitly asks to ideate, compare directions, explore alternatives, or stress-test an early proposal. Use repository evidence and Prompt MCP for material user selections; do not silently choose an option, write a specification, implement code, plan delivery, or publish changes.
---

# Idea Refine

1. Read `AGENTS.md` and define the user or operator, problem evidence, desired
   outcome, non-goals, constraints, compatibility needs, and success signal.
2. Inspect only relevant code, tests, docs, package metadata, and settled
   decisions. Use CodeGraph before broad source search when indexed. Identify
   assumptions that still need validation.
3. Offer two to four materially different directions. Include a smallest
   experiment and a credible defer, remove, or upstream-first option when
   applicable.
4. Compare only material criteria: user value, unchanged Playwright MCP
   compatibility, CLI/transport behavior, process and session safety,
   cross-platform support, security, maintenance, testing, packaging,
   documentation/localization, delivery, and reversibility.
5. Give an evidence-backed recommendation when one exists, but do not treat it
   as the user's decision.
6. Ask every material selection through the global Prompt MCP using stable IDs
   and a persistent workspace interview when recovery matters. Preserve
   unresolved options instead of inferring a choice.
7. Finish with the selected or still-open direction, smallest validation step,
   rejected alternatives, and decisions that must enter `/spec`.

Do not claim feasibility without evidence or continue into specification,
planning, implementation, commit, PR, or release work.
