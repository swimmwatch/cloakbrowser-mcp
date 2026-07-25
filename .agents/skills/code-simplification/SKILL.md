---
name: code-simplification
description: Simplify existing cloakbrowser-mcp code only when the user explicitly requests a behavior-preserving clarity refactor. Apply to strict TypeScript bridge, CLI, Streamable HTTP, tests, scripts, workflows, or documentation while preserving public CLI, environment, MCP, transport, package, and test behavior; do not use for features, contract changes, speculative rewrites, or ordinary bug fixes.
---

# Code Simplification

1. Read `AGENTS.md`, the target, focused tests, and the public contract that
   must remain stable. Use CodeGraph before broad source search when indexed.
2. State the preserved CLI flags, environment variables, defaults, upstream
   tool forwarding, two local tools, stdio behavior, HTTP session lifecycle,
   errors, cleanup, logging, package output, and documented compatibility that
   apply.
3. Prefer deleting proven dead code, clarifying names, flattening control flow,
   extracting small pure transformations, and assigning validation or cleanup
   one owner.
4. Do not add dependencies, options, aliases, interfaces, abstraction layers,
   or configuration without a present need. Keep strict TypeScript, Node ESM,
   and stdout protocol safety intact.
5. Run the narrow tests before and after the refactor. Run
   `npm run format`, the affected type/lint/test checks, and
   `npm run check` before declaring the change complete.

Stop and report if the simplification requires observable behavior or contract
changes. Do not silently broaden the request into redesign, documentation
reorganization, dependency upgrades, or release work.
