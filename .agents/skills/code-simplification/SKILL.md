---
name: code-simplification
description: Simplify existing cloakbrowser-mcp code only when the user explicitly requests a behavior-preserving clarity refactor. Apply to TypeScript bridge, CLI, HTTP transport, configuration, scripts, tests, Docker, or workflows while preserving MCP and package contracts.
---

# Code Simplification

Reduce cognitive load without changing observable behavior.

1. Read `AGENTS.md`, the target, focused tests, and the public or internal contract that must remain stable.
2. State preserved behavior: inputs, defaults, environment variables, errors, logs, process lifecycle, tool names/schemas, files, and package contents as relevant.
3. Prefer deleting proven dead code, clarifying names, flattening guarded control flow, isolating pure transformations, and consolidating repeated validation into one owner.
4. Do not add abstractions, dependencies, options, or indirection without a present need. Keep upstream browser tool forwarding unchanged.
5. Run focused checks before and after the refactor; use `npm run check` when the scope warrants it.

Report the preserved contract and verification evidence. Stop if a requested simplification requires a behavior change.
