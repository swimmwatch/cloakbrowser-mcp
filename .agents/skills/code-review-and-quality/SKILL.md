---
name: code-review-and-quality
description: Review a proposed or completed cloakbrowser-mcp change only when the user explicitly requests code review or a pre-merge assessment. Evaluate TypeScript, MCP proxy contracts, child-process boundaries, CLI and HTTP transports, Docker, workflows, documentation, security, and verification; do not edit unless fixes are separately requested.
---

# Code Review And Quality

Review the requested scope and report evidence-backed defects before summaries.

1. Read `AGENTS.md`, the relevant diff, affected tests, and one nearby precedent. Use CodeGraph before broad code search when indexed.
2. Trace public inputs through configuration parsing, proxy startup, upstream forwarding, local tools, and output or logging boundaries as applicable.
3. Verify upstream Playwright MCP tools remain forwarded unchanged. Treat changes to their contracts as blocking unless explicitly approved.
4. Check TypeScript strictness, ESM imports, error handling, process cleanup, stdout/stderr protocol safety, path handling, environment parsing, Docker pins, and workflow permissions.
5. Check documentation and all required locale/manifest updates when a public behavior, CLI flag, Docker input, or compatibility baseline changes.
6. Distinguish introduced defects from unrelated findings. Do not invent concerns without code or test evidence.

Report blocking findings first with file and line, impact, and minimal correction. Then report important findings, optional suggestions, and exact verification evidence or gaps.
