# Packet 07 — Publish The Compatibility Contract

## Outcome

After both native gates pass, add Windows ARM64 to the compatibility source,
generated tables, testing documentation, and all required locales, then finish
the repository verification without changing the package version.

## Prerequisites And Dependencies

- Packet 06 is complete with passing Free and Pro evidence for one immutable
  SHA.
- The qualified stable upstream version remains available.
- DeepL MCP can translate every changed human-readable fragment. The recorded
  specification/planning localization deferral must be cleared rather than
  hidden.

## Owned Requirements

- R1 Supported Platform, for the public claim
- R8 Public Interface Stability
- R9 Existing Compatibility
- R12 Compatibility Documentation
- R13 Rollback

## Scope

- Update the compatibility row whose version equals `package.json.version`;
  do not add or bump a release version.
- Set that row's `cloakbrowser` range to the packet 02 range.
- Add native Windows ARM64 to `readmePlatforms` and `testedPlatform` while
  preserving Linux x64/arm64, macOS x64/arm64, Windows x64, Docker
  linux/amd64/linux/arm64, Node.js `22` and `24`–`26`, transports, and parity
  text.
- Run `npm run docs:compatibility` to regenerate the compact README/index table
  and full version-compatibility table; do not hand-edit generated table
  regions.
- Update `docs/testing.md` to describe:
  - the `windows-11-arm` full Node quality/package matrix;
  - the public Free clean/warm, PE, cache-transition, diagnostics, and browser
    smoke;
  - the protected non-fork Pro native gate without naming or documenting any
    credential value.
- Surgically translate only changed human-readable fragments in all required
  localized counterparts (`ru`, `be`, `uk`, `es`, `pt-BR`, `zh`, `ja`, `de`,
  `fr`, and `hi`) with DeepL MCP. Preserve Markdown structure, identifiers,
  commands, URLs, environment variables, tool/package names, and generated
  values.
- Resolve the existing localization deferrals for the English specification
  and planning Markdown created by this workstream so
  `docs:translations:check` reflects actual files. Do not create English-copy
  placeholders.
- Refresh only the relevant
  `docs/data/translation-manifest.json` entries after actual translations
  exist and their hashes match.

## Non-Goals

- No package version bump, changelog, release note, commit, push, PR, merge,
  publication, or release.
- No runtime, test, workflow, Docker, CLI, environment, MCP, transport, server,
  or upstream tool-contract change.
- Do not advertise Windows ARM64 for historical rows that did not contain the
  qualified dependency/gates.
- Do not bulk-regenerate translations with
  `npm run docs:translations` or
  `scripts/update-doc-translations.mjs`.
- Do not refresh manifest hashes to conceal missing, stale, or untranslated
  content.

## Relevant Contracts

- `docs/data/version-compatibility.json` is the source of truth for generated
  compatibility tables.
- English documentation is the source for ten required locales.
- The public claim is native npm on Windows ARM64, not Windows Docker or x64
  emulation.
- Both Free and Pro gates are required; testing prose must distinguish public
  and protected validation without exposing secret details.
- Existing installation commands and runtime interfaces stay unchanged.

## Expected Files

- `docs/data/version-compatibility.json`
- `README.md`
- `docs/index.md` and affected `docs/index.<locale>.md` files
- `docs/version-compatibility.md` and all
  `docs/version-compatibility.<locale>.md` files
- `docs/testing.md` and all `docs/testing.<locale>.md` files
- English and localized files under
  `docs/specs/win32-arm64-support/` needed to clear the recorded deferral
- `docs/data/translation-manifest.json`
- Packet/checklist/handoff state under
  `docs/specs/win32-arm64-support/tasks/`

Touch only locale files whose English source or deferred workstream counterpart
requires an update.

## Objective Acceptance

- The current compatibility row and generated tables consistently claim npm on
  Windows ARM64 and name the qualified dependency range.
- Historical rows and every existing platform/transport claim remain intact.
- Testing documentation truthfully describes the native quality, Free, and Pro
  gates recorded in packet 06.
- Every changed/deferred English document has complete surgical translations
  in all ten locales, and manifest hashes match the actual files.
- All documentation commands and `npm run check` pass.
- No version, changelog, runtime interface, or unreleased publication state is
  changed.

## Verification

Generate and inspect:

```bash
npm run docs:compatibility
git diff -- docs/data/version-compatibility.json README.md docs/index.md docs/version-compatibility.md docs/testing.md
```

Documentation checks:

```bash
npm run docs:compatibility:check
npm run docs:build
npm run docs:seo:validate
npm run docs:translations:check
```

Repository checks:

```bash
npm run format:check
npm run package:verify
npm run check
```

No translation or full-check failure may be waived when this final packet is
completed.

## Failure, Rollback, And Recovery

- If either native gate loses its passing status, remove the new claim and keep
  this packet unchecked.
- If DeepL remains unavailable or a locale is incomplete, stop without
  placeholders or manifest manipulation; the support implementation may remain
  unadvertised.
- If the upstream release is withdrawn, coordinate rollback of the dependency
  floor, Windows ARM64 workflow changes, and public claim. Do not delete user
  caches.
- Regenerate tables from restored source data rather than hand-reverting
  generated regions independently.

## Manual Gates

- **MANUAL GATE — translation service:** DeepL must be available for real
  surgical translations; quota failure is not approval to defer final locale
  acceptance.
- Commit, push, PR, merge, publication, and release are separate
  **MANUAL GATE** actions and are not authorized.

## Completion Checklist

- [ ] Packet 06 Free and Pro evidence rechecked.
- [ ] Current compatibility source row updated without version bump.
- [ ] Generated compatibility tables refreshed.
- [ ] English testing contract updated.
- [ ] All ten locales surgically updated, including prior workstream deferrals.
- [ ] Translation manifest refreshed from actual files only.
- [ ] Documentation checks pass.
- [ ] Package verification and full repository check pass.
- [ ] Handoff updated with final verification and rollback boundary.
- [ ] `todo.md` packet link checked.

## Handoff

Record the changed English/localized files, packet 06 evidence referenced,
generator output, every documentation/repository result, and any remaining
delivery gates in `handoff.md`. Stop before commit, push, PR, merge,
publication, or release.

