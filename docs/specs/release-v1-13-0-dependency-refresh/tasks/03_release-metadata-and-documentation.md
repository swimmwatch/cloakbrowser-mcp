# 03 — Release metadata and documentation

## Outcome

Apply the confirmed stable `v1.13.0` local version preparation and ship
accurate compatibility, CloakBrowser error-behavior, configuration, tools, and
localized documentation.

## Prerequisites and ownership

Requires packets 01 and 02 plus the recorded local-release-preparation
authorization. Owns CLOAK-04, COMP-02, REL-01, and REL-02.

## Scope and contracts

- Before editing `CHANGELOG.md`, read Keep a Changelog 1.1.0. Run
  `npm run version:apply -- v1.13.0`; it owns version changes in
  `package.json`, `package-lock.json`, and `server.json`.
- Create a generated compatibility row with Playwright MCP `0.0.80`, Docker
  `v0.0.80`, CloakBrowser `0.5.10`, and unchanged Node/platform/transport
  contracts. Run the compatibility generator and verify README, index, and
  version-compatibility output.
- Add an empty `[Unreleased]` then dated `1.13.0` release section and correct
  comparison links. Describe dependencies and compatibility without claiming
  unimplemented Windows ARM64 support.
- Document fail-closed GeoIP behavior, its maximum 20-second timeout, and
  explicit invalid or unavailable CloakBrowser license errors. State that no
  SessionSeats MCP tool exists because the API is not a public 0.5.10 export.
- Update affected English public docs (tools, GeoIP, configuration), every
  corresponding localized `*.ru.md`, `*.be.md`, `*.uk.md`, `*.es.md`,
  `*.pt-BR.md`, `*.zh.md`, `*.ja.md`, `*.de.md`, `*.fr.md`, and `*.hi.md`, and
  then only accurate changed entries in `docs/data/translation-manifest.json`.
  Do not use the bulk translation generator.

## Expected files

`package.json`, `package-lock.json`, `server.json`, `CHANGELOG.md`,
`docs/data/version-compatibility.json`, generated compatibility pages,
affected English and localized public documentation, and the translation
manifest.

## Acceptance and verification

- Version and generated compatibility row reflect actual package and Docker
  baselines.
- English and localization edits preserve Markdown, code, URLs, CLI flags,
  environment names, public identifiers, and translation manifest integrity.
- Run `npm run docs:compatibility:check`, `npm run docs:build`,
  `npm run docs:seo:validate`, and `npm run docs:translations:check`.

## Failure handling and manual gates

If a translation or generated-doc check fails, correct only the affected text
or manifest entry. A local version application does not authorize a commit,
push, PR, issue closure, merge, tag, or publication; each remains a MANUAL
GATE.

## Completion checklist and handoff

- [ ] v1.13.0 version metadata and changelog prepared.
- [ ] Compatibility and all affected localized documentation updated.
- [ ] Documentation checks completed.
- [ ] `todo.md` and `handoff.md` updated; packet 04 is next.
