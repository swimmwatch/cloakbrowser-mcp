---
description: Contributor entry point for CloakBrowser MCP.
icon: material/source-branch
tags:
  - Project Internals
---

# Contributor Guide

User documentation intentionally focuses on installing and using the MCP server. Development material is grouped here.

## Sections

- [Development](development.md) for local setup and package structure.
- [Testing](testing.md) for unit, integration, Docker, npm package, and parity checks.
- [Architecture](architecture.md) for the bridge runtime design.
- [Contributing](contributing.md) for project workflow.
- [Roadmap](roadmap.md) for remaining work and release goals.

## Required Local Check

```bash
npm run check
```

Run the full check before committing. Docker parity is heavier and can be run with:

```bash
npm run docker:build
npm run bridge:compare
```
