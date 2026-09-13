# Packet 03 — Docker Documentation And Localizations

Status: Blocked on Packet 01

## Outcome

Document built-in headed-browser support and make every tracked Docker example
consistent with S6 as the image init process. Preserve the distinction between a
virtual display and a visible or remotely streamed desktop.

Requirements: DHM-002, DHM-005, DHM-009, DHM-010.

## Pinned Inputs

- Source version:
  `aaaeebcaeeebeee6c002e06b1288b222ad86806b2727cde376f6f790f4f87993`
- Specification version:
  `fad6bcccd0eac43e8a19841c851a8425a69f51cd2bcd14a21f9c83d2c07fe5a6`
- Review reference: `3c616247-2370-4c25-9165-043ac7bfdb39`
- Dependency: packet 01 completed with real headed Docker evidence.

## Prerequisites And Evidence

- `docs/docker.md:15-27` is the primary Docker run guidance and currently
  recommends external `--init`.
- `docs/docker.md:94-123` owns Streamable HTTP Docker examples.
- `docs/docker.md:149-172` owns Docker environment defaults.
- `docs/configuration.md:174-203` owns per-session `headless` guidance and
  currently treats Docker as requiring an externally supplied display.
- `docs/getting-started.md:40-96`, `README.md:76-93`, and
  `docs/dockerhub-readme.md:15-70` contain primary Docker examples.
- `docs/hooks/generate_cli_docs.py:12-17` regenerates `docs/llms.txt` from
  `docs/hooks/templates/llms.txt.jinja` during the documentation build.
- Repository documentation rules require surgical updates to every locale
  counterpart and exact translation-manifest hashes.
- Several affected documentation and manifest files already contain unrelated
  user edits. Re-read and preserve their current diffs before every patch.

## Allowed Paths

- `README.md`
- `docs/dockerhub-readme.md`
- English Markdown under `docs/` that contains a CloakBrowser image invocation
  with external `--init` or describes headed display requirements
- Each touched English page's existing `.ru.md`, `.be.md`, `.uk.md`, `.es.md`,
  `.pt-BR.md`, `.zh.md`, `.ja.md`, `.de.md`, `.fr.md`, and `.hi.md` counterpart
- `docs/hooks/templates/llms.txt.jinja`
- `docs/llms.txt` only as output of the documented generator
- `docs/data/translation-manifest.json`
- `docs/specs/docker-headed-mode/tasks/todo.md`
- `docs/specs/docker-headed-mode/tasks/handoff.md`
- this packet's status and evidence sections

Do not rewrite unrelated prose, regenerate entire translations, change CLI or
MCP reference content, or edit generated compatibility tables.

## Documentation Changes

1. In `docs/docker.md`, add a working
   `PLAYWRIGHT_MCP_HEADLESS=false` stdio example and explain:
   - the image starts a container-local Xvfb display automatically;
   - headed means Chromium uses that display, not that the user gets a visible
     window;
   - VNC, noVNC, RDP, host X11, and GUI streaming are not provided;
   - S6 already supplies PID 1 supervision and callers should not add Docker's
     `--init`.
2. Update `docs/configuration.md` so generic Linux hosts still need a usable
   display while the project Docker image supplies one internally.
3. Remove external `--init` from every tracked CloakBrowser image command in
   `README.md`, `docs/dockerhub-readme.md`, the English docs, locale docs, and
   the `llms.txt` template. Preserve `-i`, ports, mounts, secrets, and every
   other argument exactly.
4. Translate only the changed headings/prose fragments. Keep commands,
   identifiers, environment variables, paths, URLs, and code blocks unchanged.
5. Build documentation so `docs/llms.txt` is regenerated from the template, then
   update only the touched entries in `docs/data/translation-manifest.json`.

## Test-First Execution

### RED

Before documentation edits, record these discriminating failures:

```bash
rg -n --glob '!docs/specs/**' -- '--init' README.md docs
rg -n 'PLAYWRIGHT_MCP_HEADLESS=false|Xvfb|VNC|noVNC' docs/docker.md
npm run docs:translations:check
```

The first command must identify stale external-init examples. The second must
show that the primary Docker page lacks the complete headed-mode explanation.
The translation check establishes the current baseline but does not replace the
content checks.

### GREEN

Apply the narrow English and locale edits, regenerate `docs/llms.txt`, refresh
only relevant translation-manifest hashes, and rerun the checks.

### PROVE

Because the contract contains absence claims, temporarily reintroduce one
`--init` token in a copied documentation file and confirm the public-document
search detects it. Restore the copy and ensure the final tracked search has no
CloakBrowser runtime invocation using `--init`.

## Verification

```bash
npm run docs:build
npm run docs:seo:validate
npm run docs:translations:check
npm run docs:compatibility:check
npm run check
git diff --check
```

Also inspect the rendered Docker page and verify:

- the headed command is copyable;
- the Xvfb limitation is visible next to the example;
- no locale changed identifiers or Markdown structure;
- the generated `docs/llms.txt` matches its template;
- unrelated pre-existing documentation changes remain intact.

## Completion

Mark packet 03 complete only after every documentation and final repository
check passes. Update `todo.md`, replace `handoff.md`, recheck the pinned
specification source version, and stop. Do not commit or publish without
separate user authorization.
