## Summary

A newer upstream Playwright MCP release is available.

| Component | Current | Latest | Update needed |
| --- | --- | --- | --- |
| npm `{{npmPackageName}}` | `{{currentNpmVersion}}` | `{{latestNpmVersion}}` | {{npmUpdateNeeded}} |
| Docker `{{dockerRepository}}` | `v{{currentDockerVersion}}` | `v{{latestDockerVersion}}` | {{dockerUpdateNeeded}} |

## Suggested Work

- Update `{{npmPackageName}}` in `package.json` and `package-lock.json`.
- Update `{{dockerRepository}}` references in `Dockerfile`, workflows, docs, and parity scripts.
- Run `npm run check`, `npm run docker:build`, `npm run docker:smoke`, and `npm run bridge:compare`.
- Update the version compatibility table in README and documentation.

## Release Notes Summary

{{releaseNotesSummary}}

## Links

- Full upstream changelog: https://github.com/{{upstreamRepository}}/releases
- Latest upstream release: https://github.com/{{upstreamRepository}}/releases/tag/{{latestVersionTag}}
- npm package: https://www.npmjs.com/package/{{encodedNpmPackageName}}
- Docker tags: https://mcr.microsoft.com/artifact/mar/playwright/mcp/tags

_This issue was created automatically by the Playwright MCP upstream monitor workflow._
