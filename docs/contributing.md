---
description: Contribution checklist and pull request guidance for CloakBrowser MCP development.
icon: material/source-pull
tags:
  - Project Internals
---

# Contributing

Before opening a pull request, run the local checks and read the bridge architecture page.

```bash
npm install
npm run check
```

## Pull Request Checklist

- [ ] `npm run check` passes.
- [ ] New bridge behavior has tests.
- [ ] Upstream Playwright MCP schemas, descriptions, and responses remain unchanged.
- [ ] User-visible changes are documented.
- [ ] `CHANGELOG.md` is updated for user-visible changes.
- [ ] Security-sensitive changes are noted in the PR description.

## Things Not To Do

- Do not reintroduce the removed native browser adapter, tool registry, or capability model.
- Do not write runtime logs to `stdout`; stdio is reserved for MCP JSON-RPC.
- Do not add a dependency unless it is imported by runtime or tests.
- Do not weaken TypeScript, ESLint, or Prettier settings to make a change pass.
- Do not commit `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/`, or `node_modules/`.

## Security Issues

Report vulnerabilities through GitHub Security Advisories, not public issues. See [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
