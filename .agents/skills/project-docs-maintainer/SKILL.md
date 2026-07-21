---
name: project-docs-maintainer
description: Maintain the cloakbrowser-mcp documentation set when the user explicitly asks to organize, update, consolidate, or audit project knowledge. Use for README, docs pages, compatibility tables, generated CLI docs, localized pages, and translation manifest integrity.
---

# Project Docs Maintainer

Keep documentation authoritative, findable, and consistent with the shipped bridge.

1. Identify the canonical document for the fact before editing. Prefer existing README and `docs/` pages over new files.
2. Verify behavior against source, tests, package metadata, Dockerfile, and workflows; distinguish current behavior from plans.
3. Update the smallest authoritative section and link to related details instead of duplicating them.
4. For public documentation changes, follow the localization and translation-manifest rules in `AGENTS.md` exactly. Do not bulk-regenerate translations without authorization.
5. Run relevant documentation, compatibility, SEO, and translation checks before finishing.

Report the canonical source updated, localized scope, and checks run.
