---
render_macros: false
---

# Packet 04 — Docker Documentation and Localizations

Status: Complete locally; the workstream's remote CI gate remains pending.

## Outcome

Document the verified Tini/launcher, demand-started retained display, active health,
shutdown, writable-path, recovery, and shared-X11 limits. Remove obsolete external
`--init` guidance from every affected English and localized Docker example.

Requirements: DHM-002, DHM-005, DHM-009, DHM-010, DHM-011.

## Pinned Inputs

- Source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`.
- Specification version: `9624ca40590114349de4999ccf1a35af771e602b7726e277a068e60d8b918931`.
- Review reference: `5444e611-25dd-48d2-bf22-4523cda23641`.
- Dependencies: packets 01 and 02 completed with final implementation values for
  display/health/shutdown deadlines and required writable paths.

Reopen and recheck the pinned specification and dependency evidence before editing.

## Prerequisite Evidence

- `docs/docker.md` is the primary Docker contract and currently recommends external
  `--init` in its examples and prose.
- `docs/configuration.md` owns the generic Linux display guidance and public HTTP probe
  descriptions.
- `docs/security.md`, `docs/getting-started.md`, `README.md`,
  `docs/dockerhub-readme.md`, recipes, generated `docs/llms.txt`, and their localized
  counterparts contain affected Docker commands or lifecycle claims.
- `docs/hooks/templates/llms.txt.jinja` is the source for generated `docs/llms.txt`.
- `docs/data/translation-manifest.json` owns translation hashes.

## Allowed Paths

- `README.md`
- `docs/dockerhub-readme.md`
- affected English pages under `docs/**`
- their `*.ru.md`, `*.be.md`, `*.uk.md`, `*.es.md`, `*.pt-BR.md`, `*.zh.md`,
  `*.ja.md`, `*.de.md`, `*.fr.md`, and `*.hi.md` counterparts
- `docs/hooks/templates/llms.txt.jinja`
- generated `docs/llms.txt`
- `docs/data/translation-manifest.json`, only affected entries
- `docs/specs/docker-headed-mode/tasks/todo.md` and `handoff.md`

Use the project documentation-maintainer workflow for this packet. Do not bulk
regenerate translations, change CLI/MCP reference content, compatibility tables, or
unrelated prose.

## Documentation Contract

- Provide copyable stdio and HTTP examples with
  `PLAYWRIGHT_MCP_HEADLESS=false` and no normal `docker --init` requirement.
- Explain that Xvfb starts on first effective headed admission, stays until container
  exit, and never starts in a headless-only invocation.
- Explain that Tini is bundled, the launcher owns only CLI/Xvfb lifecycle, and supplying
  external `--init` is unnecessary though explicitly tested for compatibility.
- State actual finite display-start, probe, health transition, and shutdown timings
  implemented in packets 01/02. Do not invent values during planning.
- Document active health precisely: fresh CLI event-loop response and conditional fresh
  X11 response; no browser/session/remote-site guarantee; orchestrator recovery is
  external.
- Preserve the existing `/healthz` and `/readyz` public schema/auth/capacity semantics.
- Describe required writable paths for the documented read-only-root configuration.
- State that headed mode uses an internal virtual display and does not provide a visible
  desktop, VNC, noVNC, RDP, host X11, or GUI streaming.
- State the shared X server limitation: Playwright contexts/pages remain isolated, but
  native X11 focus, clipboard, and display capture are not tenant-isolated guarantees.
- Keep generic non-Docker Linux guidance accurate: a headed browser still requires a
  usable display outside the project image.

## Test-First Execution

### RED

Record current stale `--init` commands and absence of the complete headed/health
contract with repository searches. Run translation checks to establish a baseline, but
do not treat them as proof of content completeness.

### GREEN

Apply narrow English changes, translate only changed fragments, regenerate
`docs/llms.txt` from its template, and refresh only touched translation-manifest
entries. Preserve Markdown structure, code, identifiers, commands, URLs, environment
variables, paths, package names, image names, and Material tokens.

### PROVE

- Reintroduce one `--init` token in a copied public Docker example; confirm the stale
  guidance search detects it, then discard the copy.
- Remove one health limitation from a copied English page; confirm the documentation
  contract review flags the missing guarantee boundary, then discard the copy.
- Change one identifier in a copied localized code block; confirm translation
  validation detects it, then discard the copy.

## Verification

```bash
npm run docs:build
npm run docs:seo:validate
npm run docs:translations:check
npm run docs:compatibility:check
npm run check
git diff --check
```

Inspect the rendered Docker/configuration/security pages and confirm commands are
copyable, generated `docs/llms.txt` matches its template, every changed locale preserves
identifiers and structure, and no unrelated documentation edit was overwritten.

## Completion Boundary

Complete packet 04 only after all content, localization, generation, and repository
checks pass. Update `todo.md`, replace `handoff.md`, and rerun
`specification_check_state` with the pinned source version. The complete workstream still
requires packet 03's successful amd64 and arm64 CI evidence. Stop; do not commit, push,
open a pull request, publish, or release without separate authorization.
