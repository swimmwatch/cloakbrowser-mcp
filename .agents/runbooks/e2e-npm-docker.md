# Manual npm and Docker E2E Runbook

Use this runbook when an LLM agent or maintainer needs to validate the current branch as both an npm package and a Docker image.

## What This Covers

- Current branch npm tarball installed into a temporary project.
- Current branch Docker image tagged `cloakbrowser-mcp:dev`.
- MCP stdio startup for both distributions.
- Full deterministic fake-upstream tool forwarding.
- Local diagnostic tools: `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.
- Full real upstream browser tool parity through the existing Docker parity script.

The deterministic distribution tests use `tests/fixtures/fake-upstream-mcp.mjs`. They validate packaging, process startup, MCP wiring, tool listing, local tools, and forwarding. They do not validate real browser behavior.

The parity command uses real upstream Playwright MCP and validates the pinned 23 browser tools against a local HTTPS fixture.

## Prerequisites

- Node.js 22 or newer.
- npm.
- Docker with Buildx support.
- Network access for Docker base image pulls and CloakBrowser binary download during image build.
- A clean worktree is recommended so generated reports and temporary files are easy to identify.

## Commands

Run from the repository root.

```bash
npm run build
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
npm run check
```

To run both distribution tests together:

```bash
npm run test:e2e:distributions
```

## Expected Results

- `npm run test:e2e:npm-package` packs the current project, installs the tarball in a temporary project, starts the installed `cloakbrowser-mcp` binary over stdio, lists every fake upstream tool plus both local tools, calls each fake upstream tool, and calls both local tools.
- `npm run test:e2e:docker` builds `cloakbrowser-mcp:dev`, starts it over stdio with the fake upstream fixture mounted into the container, lists every fake upstream tool plus both local tools, calls each fake upstream tool, and calls both local tools.
- `npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json` compares the Docker image with the pinned upstream Playwright MCP image and covers all 23 pinned browser tools.
- `npm run check` remains the normal required local validation command and does not include these manual distribution E2E tests.

## Failure Triage

- If npm package E2E fails before MCP startup, inspect `npm pack` output and package file inclusion.
- If npm package E2E starts but tools are missing, inspect bridge startup, local tool registration, and fake upstream path handling.
- If Docker E2E fails before MCP startup, run `npm run docker:build` directly and inspect image build output.
- If Docker E2E cannot find the fake upstream fixture, check the bind mount target `/opt/cloakbrowser-mcp/tests/fixtures`.
- If parity fails, inspect `bridge-parity-report.json` and compare the failing tool response with the pinned upstream image response.

## Cleanup

- The Vitest distribution tests create temporary directories under the OS temp directory and remove them after each test.
- Remove `bridge-parity-report.json` after reviewing it:

```bash
rm -f bridge-parity-report.json
```

- Remove the local Docker image if needed:

```bash
docker image rm cloakbrowser-mcp:dev
```

Do not commit generated tarballs, parity reports, `dist/`, `coverage/`, `site/`, or temporary directories.

