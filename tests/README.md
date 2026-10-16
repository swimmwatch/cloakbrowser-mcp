# Test execution and CI reports

Run fast checks with `npm run check`; its packaged CLI checks use fake upstream
MCP and do not launch Chromium. Real browser suites use controlled Chromium
executables and local fixture pages:

- `npm run test:e2e:cdp`: managed CDP with Free CloakBrowser and Playwright.
- `npm run test:e2e:playwright-console`: console methods across clean sessions.
- `npm run test:e2e:npm-package`: standard tools, persistent state and humanization.

Required PR quality checks run unit, integration and packaged CLI tests on Linux
x64/arm64, macOS Intel/ARM and Windows x64 with the Node.js majors declared in
`.github/workflows/ci.yml`. Ubuntu x64
collects coverage in the same run instead of repeating unit/integration tests.
The real-browser matrix runs console and managed CDP on all five platforms with
Node 26. A Linux Node 22 matrix cell preserves managed CDP coverage on the minimum
supported Node major. A separate parallel functional matrix runs npm tool/state/
humanization, proxy/GeoIP, extensions and lifecycle suites on all five platforms
with Node 24. CDP still runs if another
browser suite fails, provided Chromium installation succeeded. Required CI checks
the complete matrix; no browser failure is allowed to pass silently.

Free browser fixtures reuse a verified cached binary or download an authenticated
Free binary into an owned temporary cache. Downloads do not inherit license,
preview, custom mirror or browser override settings. Test cleanup removes owned
downloads, profiles and processes. An explicit unverified override fails clearly.
Console tests pass the installed Playwright executable explicitly, avoiding a
revision mismatch with upstream MCP's bundled Playwright.

CI uploads sanitized results from each matrix cell. The aggregation job validates the producer inventory generated from the workflow matrix
and generates a combined HTML
report. Missing producers and failed tests make aggregation fail. Reports are
available as Actions artifacts. Public PR links require enabled publication,
a configured reports repository and GitHub App credentials, an eligible current
open PR, validated producer evidence, and successful Pages verification.
Same-repository CI calls the reusable publisher; fork PR reports use
default-branch publication code after CI completes. Publication failures fall
back to the Actions run.

The same CI workflow runs on PRs, manual dispatch and the weekly schedule.
`required-ci` requires quality, browser E2E, functional, Docker, documentation,
dependency audit/signatures and report aggregation to succeed. Release jobs assemble
and publish artifacts; application test suites run before merge.
`npm run package:verify` validates installation and CLI behavior before merge;
`npm run package:pack` only builds and validates the release tarball inventory.

## Worker processes

All three Vitest configurations run test files in separate Node.js processes
(`pool: 'forks'`, `fileParallelism: true`). With `CI=true` or `CI=1`, the worker
limit is `os.availableParallelism()`, computed independently on each runner.
Locally, the limit is the smaller of four and the available CPU parallelism.
This is a maximum: a run with fewer files uses fewer workers. Tests inside each
file remain sequential unless explicitly marked concurrent.

Override the limit with Vitest's standard CLI option:

```bash
npm run test:unit -- --maxWorkers=8
npm run test:integration -- --maxWorkers=2
npm run test:coverage -- --maxWorkers=4
npm run test:e2e:run -- --maxWorkers=1
npm run test:e2e:npm-package -- --maxWorkers=2
```

Pass the flag to a direct Vitest npm script; `npm run check` is a chain of
commands and does not forward it to every test stage.

Distribution suites need npm's execution context to pack and install the CLI.
For direct selection, use `npm exec` instead of invoking the Vitest Node entry point:

```bash
npm exec -- vitest run --config vitest.distribution-e2e.config.mjs --maxWorkers=4 tests/e2e/npm-package.manual.ts tests/e2e/proxy-geoip.manual.ts tests/e2e/extensions.manual.ts tests/e2e/browser-lifecycle.manual.ts
```

Artifact names include the CI attempt number to avoid upload conflicts on reruns.
The extensions suite downloads the official Playwright source archive for a pinned
commit, verifies its SHA-256 before extraction, and builds against its original
lockfile, installing only the dependencies imported by its Vite configuration
and UI from the official manifest. Unrelated Playwright build dependencies are
excluded from the temporary build manifest; the official lockfile is unchanged.
It needs network access to GitHub Codeload and npm, and `tar` on `PATH`
(available on the supported CI runners). Git credentials are not used for this
download.

Fingerprint mismatches retain the failing assertion and attach a comparison with
direct Playwright using the same Free executable and explicit locale/timezone
flags. This evidence helps distinguish browser behavior from bridge behavior.
The current license-free macOS binary, Chromium 145.0.7632.109.2, has an
[upstream locale defect](https://github.com/CloakHQ/CloakBrowser/issues/82).
The comparison also records the documented `--accept-lang` workaround. The three
full-locale scenarios are temporarily skipped only on macOS; Linux and Windows
continue to run them. Other macOS proxy/GeoIP scenarios and the deliberate
fingerprint-mismatch diagnostic test remain enabled. Remove the skips after a
keyless Free build passes the locale scenarios on both Intel and Apple Silicon.

Partial reruns reuse unchanged jobs and select the latest evidence of each rerun
job within the same CI run. Missing, failed or corrupt latest evidence never
falls back to an earlier passing result.
`test:report:merge` preserves each producer's manifest, so combined runs may contain
more than 10000 results while the per-producer limit remains unchanged.

## Local reporting commands

```bash
npm run test:report -- --suite unit --run-id local
npm run test:report:generate -- --input artifacts/test-results --output artifacts/test-report/local
npm run test:report:open -- --report artifacts/test-report/local
```

Use the actual output directory reported by the collector as generation input.
Never add real secrets or external page screenshots to diagnostic fixtures.

Docker parity tests compare the tools and complete schemas of the pinned image.
They test `browser_find.filename` when the pinned upstream schema provides it and
record its availability in the parity report. Docker and npm both use MCP 0.0.83;
the npm suite also checks filename persistence independently. The Dockerfile pins
the official multi-architecture base by digest. Native Docker distribution and CDP
checks run on both architectures; complete tool parity runs on `linux/amd64`.
