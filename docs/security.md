---
description: Security model for CloakBrowser MCP.
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# Security

This project is a browser automation bridge. Treat it as trusted-code execution infrastructure.

## Trust Boundary

The outer server uses stdio. It starts upstream Playwright MCP as a child process and forwards tool calls. Browser automation, file output, network access, and unsafe evaluation behavior are governed by upstream Playwright MCP.

## Unsafe Tools

Upstream Playwright MCP includes tools such as `browser_evaluate` and `browser_run_code_unsafe`. These can execute JavaScript in the browser or Playwright server context. Only connect this server to MCP clients you trust.

## Configuration

Use upstream options for access controls and guardrails:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

These are convenience guardrails, not a substitute for process, container, network, and filesystem isolation.

## Docker

Docker is recommended when you want isolation and reproducible browser dependencies. Mount only the artifact directory you need.

## Reporting

Report vulnerabilities using [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
