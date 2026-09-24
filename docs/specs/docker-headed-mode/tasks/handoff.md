---
render_macros: false
---

# Docker Headed Mode Handoff

## Current State

Packets 01, 02, and 04 are complete locally. Packet 03 local acceptance is complete; its remote `linux/amd64` and `linux/arm64` CI evidence remains pending. The workstream final checklist remains open. No commit, push, pull request, release, or publication was performed.

## Packet 03 Local Acceptance

- Added real default and explicitly configured headless browser coverage for stdio and Streamable HTTP, asserting that no Xvfb socket is created.
- Extended real HTTP concurrency coverage to two headed and one headless session, with isolated profiles and screenshots.
- Added an aborted headed-initialize waiter case: another waiting client completes shared display startup and exactly one Xvfb exists.
- Added a concurrent MCP traffic plus private active-health probe case.
- `npm run test:e2e:docker:run` completed and left no `cloakbrowser-mcp-*` test container running.

## Packet 04 Documentation

- Removed obsolete external Docker init guidance from public Docker commands, MCP configuration examples, Docker Hub text, development notes, security guidance, and recipes.
- Documented bundled Tini, demand-started and retained Xvfb, the private active Docker health check, shutdown behavior, read-only writable paths, and X11 isolation limits in the canonical Docker documentation.
- Clarified that Docker starts a private virtual display for `headless: false`, while headed sessions outside the image still require a usable display environment.
- Updated the affected localized examples and Docker page fragments manually, regenerated `docs/llms.txt`, and refreshed `docs/data/translation-manifest.json`.

## Translation Note

The local translation updater could not use DeepL because `DEEPL_API_KEY` is absent. The connected DeepL service also returned `Quota exceeded`; changed fragments were translated manually. The repository translation validator passed after the manifest refresh.

## Verification

- `npm run docs:build` passed.
- `npm run docs:seo:validate`, `npm run docs:translations:check`, and `npm run docs:compatibility:check` passed.
- `npm run check` initially failed in the sandbox because Unix sockets and loopback listeners returned `EPERM`; the required elevated rerun passed.
- `git diff --check` passed, and the stale public Docker init search found no matches outside specification history.

## Specification Checkpoint

- Source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`.
- Specification version: `9624ca40590114349de4999ccf1a35af771e602b7726e277a068e60d8b918931`.
- Review reference: `5444e611-25dd-48d2-bf22-4523cda23641`.

## Next Action

Run the final checklist only on a new explicit `incremental-implementation` invocation. Review and commit authority remain separate.
