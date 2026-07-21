---
name: documentation-and-adrs
description: Write or revise cloakbrowser-mcp technical documentation or an architecture decision record when the user explicitly requests it. Use for CLI, configuration, MCP bridge behavior, Docker, CI, package compatibility, security boundaries, and settled tradeoffs; do not create routine implementation notes.
---

# Documentation And ADRs

Document verified behavior and settled decisions precisely.

1. Read `AGENTS.md`, the target document, related public docs, and the code or configuration that proves current mechanics.
2. Separate current fact, proposed work, experiment, open question, and decision. Do not present planned behavior as released behavior.
3. Update the closest existing document and avoid duplicating facts maintained elsewhere.
4. For an interface or boundary, document inputs, defaults, validation, outputs, failures, observability, security constraints, and verification.
5. For public documentation changes, update every required localized counterpart and only the corresponding translation-manifest entries according to `AGENTS.md`.

For ADRs, state context, decision, alternatives, consequences, and reversal conditions. Run the documentation checks required by the changed surface.
