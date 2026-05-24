---
description: Security model and browser automation risk guidance for CloakBrowser MCP, Docker isolation, artifacts, secrets, and network exposure.
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# Security

This project is a browser automation bridge. Treat it as trusted-code execution infrastructure.

## Trust Boundary

The outer server supports stdio and Streamable HTTP. It starts upstream Playwright MCP as a child process and forwards tool calls. Browser automation, file output, network access, and unsafe evaluation behavior are governed by upstream Playwright MCP.

Do not expose the stdio server through an unauthenticated network wrapper. Any client that can call tools can drive the browser, read browser-observable page data, and request artifacts.

Streamable HTTP binds to `127.0.0.1` by default. If you bind it to `0.0.0.0` or publish it outside loopback, require `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` or equivalent reverse proxy authentication, use TLS at the network edge, and restrict access to trusted clients.

## Unsafe Tools

Upstream Playwright MCP includes tools such as `browser_evaluate` and `browser_run_code_unsafe`. These can execute JavaScript in the browser or Playwright server context. Only connect this server to MCP clients you trust.

## Configuration

Use upstream options for access controls and guardrails:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

These are convenience guardrails, not a substitute for process, container, network, and filesystem isolation.

Use allowlists for trusted targets whenever possible. Treat unrestricted file access and secrets files as sensitive capabilities and keep them out of shared MCP client profiles.

## Sandbox Mode

The Docker image defaults to `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true` because browser sandboxing is frequently unavailable in containerized CI and MCP runtimes. This is a compatibility tradeoff. If your host and container runtime support Chromium sandboxing, set:

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

When running without the Chromium sandbox, use Docker or another process isolation boundary and avoid mounting broad host directories.

## Artifacts And Secrets

Screenshots, snapshots, downloads, network logs, console logs, and traces can contain credentials or private page content. Mount only the artifact directory you need, clean it after use, and avoid sharing artifact bundles publicly.

If your MCP client injects credentials into browser sessions, prefer short-lived credentials scoped to the target site. Do not put long-lived tokens in screenshots, network responses, or persistent browser profiles.

## Docker

Docker is recommended when you want isolation and reproducible browser dependencies. Mount only the artifact directory you need and use `--init` so browser child processes are cleaned up correctly.

When publishing Streamable HTTP from Docker, prefer `-p 127.0.0.1:3000:3000`. Publishing directly to a public interface gives any reachable client browser automation capability unless you add authentication and network controls.

The Docker image is scanned with Trivy in CI and before release publishing. The scanner checks high and critical OS/library vulnerabilities and uploads SARIF results to GitHub code scanning when enabled.

## Supply Chain Checks

The repository uses free GitHub-native and open source checks:

- CodeQL for JavaScript and TypeScript static analysis.
- Dependency Review for pull request dependency changes.
- `npm audit --omit=dev --audit-level=high` for runtime npm dependencies.
- OpenSSF Scorecard for repository supply-chain signals.
- zizmor for GitHub Actions security linting.
- Trivy for Docker image vulnerability scanning.

These checks do not replace manual review of browser automation behavior or release changes.

## Reporting

Report vulnerabilities using [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
