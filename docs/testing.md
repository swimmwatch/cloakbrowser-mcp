---
description: Testing strategy for CloakBrowser MCP.
icon: material/test-tube
tags:
  - Testing
  - Project Internals
---

# Testing

## Unit Tests

```bash
npm run test:unit
```

Unit tests cover environment parsing, bridge config generation, launch argument handling, and local Cloak introspection tools.

## Integration Tests

```bash
npm run test:integration
```

Integration tests use a fake upstream MCP child process and verify that the bridge merges local tools and forwards upstream calls unchanged.

## Package Verification

```bash
npm run package:verify
```

This builds the package, runs `npm pack`, checks the tarball file list, installs the tarball into a temporary project, and verifies CLI `--version` and `--help`.

Package verification also validates `server.json` against the published MCP server schema.

## Docker Smoke

```bash
npm run docker:build
npm run docker:smoke
```

The smoke test verifies that the built image starts and prints CLI help.

## Upstream Parity

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

The parity script starts the official Playwright MCP Docker image and the CloakBrowser bridge image, compares upstream tool names, exercises the default browser tool surface on one fixture page, and verifies local Cloak introspection tools.

CI uploads the JSON parity report as an artifact for Docker build jobs and release jobs.

## Security Checks

```bash
npm run audit:prod
npm run server:validate
```

CI also runs CodeQL, Dependency Review, OpenSSF Scorecard, zizmor, and Trivy. These tools are free for public repositories and do not require external accounts.
