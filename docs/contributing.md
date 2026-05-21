# Contributing

Thank you for considering a contribution. Before opening a PR, please read this page and [Development](development.md) — they describe the repository conventions and the security-sensitive nature of the change you may be proposing.

If you only want to install and use the server, start with [Getting started](getting-started.md) instead.

## Local setup

```bash
git clone https://github.com/swimmwatch/cloakbrowser-mcp.git
cd cloakbrowser-mcp
npm install
npm run check     # typecheck + lint + format:check + test
```

The default test suite (`unit + integration + contract`) does not launch a real browser. The real-browser tier (`npm run test:real`) is gated by `CLOAKBROWSER_MCP_REAL_BROWSER=1` and requires the local environment to support launching CloakBrowser.

## Pull request checklist

Every PR must:

- [ ] Pass `npm run check`.
- [ ] Declare any new capability flag and default it to **off**.
- [ ] Use the `BrowserAdapter` interface — never the raw `cloakbrowser` import — for any code path outside `src/browser/cloakAdapter.ts`.
- [ ] Validate untrusted input with `zod` at the boundary.
- [ ] Throw `CloakMcpError` (with a documented code from `src/errors/`) across module boundaries.
- [ ] Ship with at least one unit test and one integration test using `MockBrowserAdapter`.
- [ ] Update `docs/tools.md` and/or `docs/configuration.md` when public surface changes.
- [ ] Add an entry under `## [Unreleased]` in `CHANGELOG.md`.
- [ ] Call out any security-sensitive change in the PR description.

## Things not to do

- Do not weaken TypeScript, ESLint, or Prettier configuration to make a change pass. Fix the change.
- Do not add a `package.json` dependency you do not actually import.
- Do not write to `stdout` from anywhere — it would corrupt the MCP transport.
- Changes to unsafe execution tools (`browser_evaluate`, `browser_run_code_unsafe`) must be tested through the MCP registry and documented clearly, because those tools intentionally execute caller-supplied code for Playwright MCP parity.
- Do not propose CAPTCHA-solving, anti-bot evasion, or access-control bypass features. See [Security → Responsible use](security.md#responsible-use).
- Do not commit anything under `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/`, or `node_modules/`.

## Code of conduct

By participating in this project you agree to abide by the [Code of Conduct](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/CODE_OF_CONDUCT.md).

## Reporting a security issue

Use **GitHub Security Advisories** (private vulnerability reporting) on the repository — not public issues. See [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
