# CloakBrowser 0.6.0 release validation

Target: stable `v1.15.0`. Project version remains `1.14.1`.

## Validation results

- `npm run check`: passed; 540 unit/integration tests passed, four skipped,
  and six ordinary E2E tests passed. Two existing lint warnings remain, with no
  lint errors.
- `npm run package:verify`: passed; 177 files, 150 KiB packed, 715 KiB unpacked.
- `npm run docs:build`: passed in strict mode using the existing documentation
  environment through a temporary symlink; the symlink was removed afterward.
- `npm run docs:seo:validate`: passed.
- Final full `npm run test:e2e:npm-package` rerun without a license: **6 passed**
  in 92.54 seconds after moving fixture CSS and event handlers into tags. The
  Free binary was selected explicitly, the license
  environment key was empty, and a separate temporary cache prevented saved-key
  fallback. The cache was removed after the run. Both humanize presets passed.
  Passing cases cover fake-upstream forwarding, all 25 upstream and two local
  tools with direct schema comparison, immediate and delayed navigation checks,
  `browser_find.filename`, a persistent-profile process restart, and concurrent
  downloads into an empty temporary cache with JSON-only stdout.
- A separate first-launch control installed the npm tarball into a temporary
  directory with an empty cache. Initialization and `tools/list` succeeded;
  both stdout lines parsed as MCP JSON, and the cache was populated. The process
  and temporary directory were cleaned up.
- Both humanize presets now pass, including strict-mode and unsupported-input
  failures, iframe actions, keyboard modifiers, special fields, new tabs,
  hidden-iframe refusal and detached-DOM collection checks.
- Final targeted npm humanize rerun: **2 passed, 4 unrelated cases skipped**.
  Both presets reject hidden iframe clicks without changing the click counter,
  preserve a live DOM element across forced garbage collection, and collect
  detached nodes after each of two batches of 1000 resolved elements. The
  earlier `display:none` failure was an incorrect expected error string; the
  final test explicitly expects the locator timeout and verifies no click.
- A control through the installed npm package on Node `22.13.0` passed a
  humanized click with Google Chrome. The installation path contained spaces.
  Native Windows, macOS and ARM64 runs remain unverified.

Temporary profiles, downloads, installed packages and fixture servers are owned
and cleaned up by the test harness. Existing unrelated CDP, HTTP and Docker
changes were preserved. No commit, push, PR, version bump or publication occurred.

## Call argument refactor validation

The call argument rule is recorded in `AGENTS.md`. Runtime, tests, scripts,
root configurations, video code, Python documentation helpers and HTML fixture
scripts now assign computed call arguments to local bindings. Conditional calls
retain conditional argument evaluation. Unnecessary immediate function wrappers
were removed, and Vitest assertion chains remain recognizable to its lint rules.

- AST audit: zero computed call arguments in project TypeScript/JavaScript files.
- HTML fixture scripts and literal browser scripts: zero computed call arguments.
- Python documentation helpers: both parsed successfully; zero computed call arguments.
- `npm run check`: 540 tests passed, four skipped; six ordinary E2E tests passed.
- `npm run package:verify`: 177 files, 150 KiB packed, 715 KiB unpacked.
- `npm run test:e2e:npm-package`: six passed in 91.98 seconds with the explicitly
  selected Free binary and an isolated temporary cache; no license used.
- Video workspace typecheck, strict documentation build and SEO validation passed.
- Three lint warnings remain; no lint rules or type checks were disabled.

## Resolved dependency compatibility defects

Installed dependencies:

- `cloakbrowser`: `0.6.0`
- `@playwright/mcp`: `0.0.83`
- MCP's `playwright-core`: `1.64.0-alpha-1790635538000`

Before the fix, both humanize presets failed at the first visible button click.

`cloakbrowser/dist/human/worldHelpers.js` calls
`I.checkElementStates(e, states)` and `I.elementState(e, state)` without a third
argument. This version of Playwright's injected script requires `frameVisible`;
its visibility expression is `!!frameVisible && isElementVisible(element)`.

A direct Playwright control using `/usr/bin/google-chrome`, a visible button and
the same injected script confirmed the cause without changing installed files:

```json
{
  "ordinaryVisible": true,
  "diagnostic": {
    "omitted": { "matches": false, "received": "hidden" },
    "supplied": { "matches": true, "received": "visible" },
    "omittedCheck": { "missingState": "visible" },
    "suppliedCheck": null
  }
}
```

Passing `true` here was only a diagnostic control. The bridge now registers a
native Node.js loader before importing the humanize layer. It transforms only
the two verified CloakBrowser 0.6.0 modules in memory and rejects a different
version or source hash. It checks every ancestor iframe's visibility, releases
temporary ElementHandles in `finally`, and supplies the actual visibility flag.
Hidden frames are rejected before waiting for animation frames.

The original helper registry also retained every resolved DOM node in a strong
Map. Two series of 2000 removed nodes produced **5 -> 2005 -> 4005** DOM nodes
after forced GC; the control without humanize stayed at five. The fix uses weak
references, reuses IDs for live elements, and removes collected IDs through a
FinalizationRegistry. Installed npm E2E repeats collection after two series of
1000 nodes on both presets.

The loader is registered once per upstream process. Dependency files are never
modified. Upstream tool contracts and `humanizeBrowser`/`patchContext` remain
unchanged. The `ENOTSUP` seed publication fallback is covered by simulated
filesystem failures, concurrent writers and cleanup assertions.

## Chromium Pro exit 76

`cloakbrowser/dist/license.js` identifies exit 76 as the plan's session limit.
Sequential direct Playwright API and upstream MCP controls with Pro Chromium
`154.0.8037.57.1` produced exit 76 and a license-status denial file containing
`76`. Free Chromium `146.0.7680.177.5` retained the page in both controls.
Switching binaries is not evidence that the Pro licensing problem is fixed.
No unrelated browser sessions were terminated.

The user selected license-free validation. A Pro recheck is no longer required
for this task; the historical license denial remains a separate unverified
Pro limitation. Ordinary checks use the Free binary, an empty license
environment key, and an isolated temporary cache without saved credentials.

## Release gates

The official MCP Docker base remains a separate gate. Docker checks using the
old base cannot validate MCP 0.0.83. Keep the existing image monitor active.
Before `version:apply`, resolve the unavailable Prompt MCP decision-recording
requirement from `project-release`. Do not commit, push, open a PR, tag or publish
without the corresponding separate authorization.
