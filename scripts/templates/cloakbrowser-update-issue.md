## Summary

A newer upstream CloakBrowser release is available.

| Component | Current | Latest |
| --- | --- | --- |
| npm `{{npmPackageName}}` | `{{currentNpmVersion}}` | `{{latestNpmVersion}}` |

## Suggested Work

- Update `{{npmPackageName}}` in `package.json` and `package-lock.json`.
- Update compatibility docs/data if the supported CloakBrowser version range or behavior changes.
- Run `npm run check`.
- Run `npm run docker:build` and `npm run docker:smoke` when browser/runtime behavior is affected.

## Release Notes Summary

{{releaseNotesSummary}}

## Links

- Full upstream changelog: https://github.com/{{upstreamRepository}}/releases
- Latest upstream release: https://github.com/{{upstreamRepository}}/releases/tag/{{latestVersionTag}}
- npm package: https://www.npmjs.com/package/{{encodedNpmPackageName}}

_This issue was created automatically by the CloakBrowser upstream monitor workflow._
