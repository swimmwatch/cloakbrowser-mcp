---
name: performance-optimization
description: Diagnose or improve cloakbrowser-mcp performance only when the user explicitly requests optimization or provides a measured regression in startup, MCP call latency, Streamable HTTP sessions, memory, package or image size, build, tests, or CI. Establish a reproducible Node.js baseline before editing and preserve correctness, security, compatibility, and upstream-tool parity; do not optimize from source inspection, intuition, or an unmeasured complaint.
---

# Performance Optimization

1. Read `AGENTS.md` and define the metric, representative input, environment,
   acceptable tradeoffs, success threshold, and correctness oracle. Use Prompt
   MCP for any material tradeoff or threshold the user has not supplied.
2. Record revision, operating system, architecture, Node and dependency
   versions, transport, browser/profile state, command, warm-up, repetitions,
   timings, resources, and variance.
3. The repository has no dedicated benchmark script. Build a task-local,
   reproducible measurement around real commands such as `npm run build`,
   `npm run dev -- <args>`, `node dist/cli.js <args>`, the affected Vitest
   command, `npm run package:verify`, or Docker build/smoke. Use Node
   `--cpu-prof` or `--heap-prof` only when it measures the identified path, and
   remove generated profiles unless the user requested artifacts.
4. Use CodeGraph before broad source search when indexed. Trace the measured
   bottleneck across CLI parsing, CloakBrowser resolution, temporary config,
   upstream child startup, MCP forwarding, HTTP session creation, filesystem,
   logging, packaging, or workflow layers.
5. Change one justified factor at a time. Rerun the identical measurement and
   focused correctness tests; use enough repetitions to distinguish signal
   from noise.
6. Run the affected type, lint, test, package, Docker, parity, and
   `npm run check` commands before declaring success.

Report baseline, result, uncertainty, correctness evidence, security and
compatibility safeguards, and rollback conditions. Never trade public
contracts, cleanup, isolation, redaction, or safety for speed without explicit
authorization.
