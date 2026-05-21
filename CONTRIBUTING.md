# Contributing

Thanks for considering a contribution! The complete contributor guide lives in [docs/contributing.md](docs/contributing.md). The short version is below.

## Local setup

```bash
git clone https://github.com/swimmwatch/cloakbrowser-mcp.git
cd cloakbrowser-mcp
npm install
npm run check     # typecheck + lint + format:check + test
```

Node ≥ 20 is required. The default test suite does not need a browser binary.

## Pull request checklist

- [ ] `npm run check` passes.
- [ ] Any new capability flag defaults to **off** and is documented in `docs/configuration.md`.
- [ ] All browser access goes through `BrowserAdapter`, never `cloakbrowser` directly.
- [ ] Untrusted input is validated with `zod` at the boundary.
- [ ] Module-boundary errors are `CloakMcpError` with a documented code.
- [ ] At least one unit test and one integration test (using `MockBrowserAdapter`) cover the change.
- [ ] `docs/tools.md` and/or `docs/configuration.md` updated when the public surface changes.
- [ ] Entry added under `## [Unreleased]` in `CHANGELOG.md`.
- [ ] Security-sensitive changes are called out in the PR description.

## Code of conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting a security issue

Use **GitHub Security Advisories** on the repository — not public issues. See [SECURITY.md](SECURITY.md).
