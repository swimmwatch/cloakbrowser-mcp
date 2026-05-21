## Summary

<!-- What changed and why? -->

## Checklist

- [ ] I ran `npm run check` locally and it passed.
- [ ] If I changed public behavior, I updated `README.md` and relevant docs in `docs/`.
- [ ] If I added or changed a tool, I updated `docs/tools.md`.
- [ ] If I added or changed config/capabilities, I updated `docs/configuration.md`.
- [ ] If I introduced a capability flag, it defaults to **off** (unless explicitly approved otherwise).
- [ ] Browser integration changes use `BrowserAdapter` abstractions, not direct `cloakbrowser` imports outside `src/browser/cloakAdapter.ts`.
- [ ] I added/updated tests (unit + integration/contract as appropriate).
- [ ] I added an entry to `CHANGELOG.md` under `## [Unreleased]`.
- [ ] I reviewed security implications and documented them below.

## Security review

<!-- Describe risk, capability impacts, origin-policy implications, filesystem implications, and logging implications. -->

## Test evidence

<!-- Paste command summary and results, e.g. npm run check, npm run test:coverage, docker smoke, docs build -->
