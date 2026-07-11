# Contributing

Thanks for considering a contribution. The complete contributor guide lives in [docs/contributing.md](docs/contributing.md).

## Local Setup

```bash
git clone https://github.com/swimmwatch/cloakbrowser-mcp.git
cd cloakbrowser-mcp
npm install
npm run check
```

Node.js 22.13.0 or newer in the 22.x line, or Node.js 24.0.0 or newer, is required.

## Pull Request Checklist

- [ ] `npm run check` passes.
- [ ] Bridge behavior is covered by unit or integration tests.
- [ ] Upstream Playwright MCP tool contracts are not copied or modified.
- [ ] Documentation is updated for user-visible CLI, Docker, env, or metadata changes.
- [ ] `CHANGELOG.md` is updated when the change is user-visible.
- [ ] Security-sensitive changes are called out in the PR description.

## Code Of Conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Use GitHub Security Advisories on the repository for private vulnerability reporting. See [SECURITY.md](SECURITY.md).
