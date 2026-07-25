---
name: project-docs-maintainer
description: Maintain, organize, consolidate, or audit the cloakbrowser-mcp documentation set only when the user explicitly requests project documentation maintenance or an authorized public change requires it. Use for README, localized MkDocs pages, generated CLI and compatibility content, configuration, tools, Docker, security, contributor, and release documentation; do not invent behavior, translations, compatibility rows, changelog entries, or release notes outside the requested scope.
---

# Project Docs Maintainer

1. Read `AGENTS.md` and identify one canonical owner for each fact:
   `README.md` for concise entry points; the nearest English `docs/*.md` page
   for detail; `SECURITY.md` for vulnerability policy;
   `docs/data/version-compatibility.json` for generated compatibility tables;
   generated CLI sources for CLI reference; `CHANGELOG.md` for released and
   unreleased changes.
2. Verify claims against source, tests, `package.json`, `server.json`,
   `Dockerfile`, scripts, and workflows. Use CodeGraph before broad source
   search when indexed. Distinguish current behavior from proposals.
3. Reconcile duplicated, stale, and contradictory guidance by updating the
   smallest authoritative section and linking to it.
4. Preserve bridge ownership: upstream Playwright MCP tools remain unchanged,
   local tools remain explicit, and stdio/HTTP, child-process, profile,
   filesystem/network, Docker, Node/platform, and package constraints remain
   accurate.
5. Follow the surgical locale update and translation-manifest procedure in
   `AGENTS.md`. Do not bulk-regenerate translations or defer a touched locale
   silently. Use Prompt MCP for a material scope decision that evidence cannot
   resolve.
6. Do not hand-edit generated compatibility tables or generated CLI content.
   Use their owning scripts only when that generated scope is requested.
7. Run applicable `npm run docs:build`, `npm run docs:seo:validate`,
   `npm run docs:translations:check`,
   `npm run docs:compatibility:check`, and `npm run check`.

Report canonical owners changed, generated outputs refreshed, locale handling,
and exact check results. Stop before changelog, release, publishing, or PR work
unless separately authorized.
