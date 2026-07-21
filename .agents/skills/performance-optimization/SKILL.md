---
name: performance-optimization
description: Diagnose or improve a measured cloakbrowser-mcp performance, startup, throughput, memory, image-size, package-size, or CI-time problem when the user explicitly requests optimization or provides regression evidence. Cover TypeScript runtime, child processes, HTTP transport, Docker, npm package, and Remotion demo rendering; do not optimize from guesswork.
---

# Performance Optimization

Measure a representative workload, isolate one bottleneck, and preserve behavior.

1. Define the metric, representative input, environment, acceptable tradeoff, and success threshold.
2. Capture a reproducible baseline: command, revision, runtime versions, input shape, cache state, timings, resource use, and correctness evidence.
3. Trace the likely bottleneck through configuration, upstream launch, protocol forwarding, serialization, filesystem, Docker layers, or render pipeline as appropriate.
4. Change one justified factor at a time and rerun the same measurement plus focused correctness checks.
5. Report baseline, result, uncertainty, output-quality safeguards, and rollback conditions.

Do not present source inspection as a measured regression or trade correctness, compatibility, or security for speed without approval.
