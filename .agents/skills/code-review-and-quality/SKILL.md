---
name: code-review-and-quality
description: Review a proposed or completed cloakbrowser-mcp change only when the user explicitly requests code review, quality review, or a pre-merge assessment. Evaluate strict TypeScript, CLI and transport contracts, upstream-tool parity, child-process and session boundaries, tests, docs, packaging, workflows, security, and compatibility; remain read-only unless fixes are separately authorized, and do not run automatically after implementation.
---

# Code Review And Quality

Report evidence-backed defects before summaries.

1. Read `AGENTS.md`, the requested diff, affected tests and public docs, and a
   nearby precedent. Use CodeGraph before broad source search when indexed.
2. Trace affected behavior across CLI options and environment parsing,
   generated Playwright MCP configuration, the upstream stdio child, outer
   stdio or Streamable HTTP transport, local tools, cleanup, and results.
3. Check strict TypeScript and Node ESM rules, actionable errors, cancellation,
   process/session cleanup, temporary-file handling, log destination and
   redaction, and cross-platform behavior.
4. Confirm upstream Playwright MCP tools remain unchanged and local tools
   remain limited to `cloakbrowser_binary_info` and
   `cloakbrowser_bridge_info` unless an explicit contract change says
   otherwise.
5. Review unit, integration, E2E, parity, package, Docker, documentation,
   localization, compatibility, and release evidence only where the diff
   touches those boundaries.
6. Review dependencies, lockfile changes, workflow permissions, pinned actions
   and images, secrets/OIDC, registry publishing, and artifact provenance when
   applicable.
7. Distinguish introduced defects from unrelated findings. Do not edit files,
   commit, push, resolve threads, or open/update a PR without separate
   authorization.

Report blocking findings first with file and line, impact, evidence, and the
smallest correction. Then report important findings, optional suggestions, and
verification evidence or gaps. If no findings remain, say so and identify
residual testing risk.
