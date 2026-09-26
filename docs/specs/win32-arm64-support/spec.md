# Native Windows ARM64 npm Support

Status: Approved

Issue: [#89](https://github.com/swimmwatch/cloakbrowser-mcp/issues/89)

Decision ledger: [decisions.yaml](decisions.yaml)

## Outcome

The documented local npm/npx installation of `cloakbrowser-mcp` must work on
Windows ARM64 when native Node.js reports `process.platform === "win32"` and
`process.arch === "arm64"`. Both CloakBrowser Free and Pro paths must resolve,
verify, and launch native ARM64 Chromium without platform-specific user
configuration.

The support claim is for a native Windows ARM64 executable. Running the existing
Windows x64 executable through emulation does not satisfy this specification.

## Current State And External Prerequisite

`cloakbrowser-mcp` delegates platform detection, downloads, integrity checks,
cache management, and executable resolution to the `cloakbrowser` package. The
bridge consumes `ensureBinary()` and `binaryInfo()` and forwards the resolved
path to upstream Playwright MCP.

As observed on 2026-07-25:

- `cloakbrowser-mcp` declares `cloakbrowser` `^0.5.1`;
- the latest stable package is `cloakbrowser@0.5.2`;
- that package maps `win32-x64` to `windows-x64` and rejects `win32-arm64`;
- its documented platform list includes Windows x64 only; and
- the current signed Free release has no `windows-arm64` archive.

Implementation in this repository is therefore blocked until a stable
`cloakbrowser` release satisfies R2. This specification does not authorize a
fork, prerelease dependency, local downloader, or upstream publication work.

## Requirements

### R1. Supported Platform

The npm distribution must support native Windows ARM64 for every Node.js version
allowed by this repository's `engines.node` contract. The support claim must
cover both Free and Pro CloakBrowser resolution. An x64 Node.js process on
Windows ARM64 continues to use the existing Windows x64 path and is not the
target of this change.

### R2. Stable Upstream Dependency Gate

The consumer change may proceed only after a stable `cloakbrowser` release:

1. recognizes `process.platform === "win32"` with
   `process.arch === "arm64"`;
2. maps that pair to the canonical `windows-arm64` platform tag and
   `cloakbrowser-windows-arm64.zip` archive name;
3. publishes a native Free archive referenced by a valid signed checksum
   manifest;
4. makes a native Pro archive available through the existing authenticated
   download path and its signed checksum manifest;
5. returns coherent `binaryInfo()` data for `windows-arm64`; and
6. satisfies the transparent cache transition in R5.

`package.json` and the lockfile must set the first accepted stable release as
the minimum `cloakbrowser` version. The bridge must continue to delegate binary
ownership to that package and must not duplicate its platform map, download
client, verification keys, archive extraction, or cache manager.

### R3. Free First-Run And Cached Flow

With no license configured and a clean cache, the existing documented command
must download the signed Free Windows ARM64 archive, verify it, extract it,
forward its executable path to Playwright MCP, and complete a browser action.
No new flag or environment variable may be required. Later starts may reuse the
verified native cache.

### R4. Pro First-Run And Cached Flow

With a valid Pro license supplied through the existing CloakBrowser contract,
the same default bridge flow must download, verify, cache, and launch the native
Pro Windows ARM64 executable. A valid Pro request must not silently fall back to
the Free or Windows x64 binary. Later starts may reuse the verified native Pro
cache according to existing update and version-pin behavior.

### R5. Transparent Cache Transition

An existing Windows x64 executable cached for the same Chromium version must
not be mistaken for a native ARM64 executable after the user switches from x64
Node.js to native ARM64 Node.js. The upstream dependency must isolate caches by
platform or validate the executable architecture and replace the incompatible
entry automatically. Users must not be required to delete the cache manually,
and unrelated valid cache entries must not be destructively removed.

### R6. Diagnostics

The existing `doctor` command and `cloakbrowser_binary_info` tool must report
the resolved `windows-arm64` platform, tier, version, cache path, binary path,
and installation state through their existing output shapes. A failed
resolution must produce an actionable error without disclosing a license or
other credential.

### R7. Failure, Integrity, And Cleanup

Free and Pro ARM64 archives must use the existing detached-signature and
checksum verification path. Missing manifests, invalid signatures, checksum
mismatches, corrupt archives, wrong-architecture executables, and
non-executable results must fail closed. The bridge must not launch an
unverified binary, an x64 fallback, or an unrelated browser.

Concurrent or interrupted first starts must not leave a partial, unverified, or
wrong-architecture cache entry marked as installed. Existing bridge cleanup of
temporary runtime state must continue after configuration failure.

### R8. Public Interface Stability

This change must not add or change CLI flags, environment variables, MCP tool
names, tool schemas, server metadata, stdio behavior, Streamable HTTP behavior,
or upstream Playwright MCP browser contracts. The two local introspection tools
remain the only local tools.

### R9. Existing Compatibility

Linux x64/arm64, macOS x64/arm64, Windows x64, Docker
`linux/amd64`/`linux/arm64`, both MCP transports, and all currently supported
Node.js versions must retain their existing behavior. No existing supported
platform may resolve a different platform tag or archive because Windows ARM64
was added.

### R10. Native Free CI Gate

The normal quality and package-verification suites must run on GitHub's native
`windows-11-arm` runner for the full supported Node.js matrix. A separate
default-engine smoke on that runner must use a packaged candidate, a clean
cache, and a local test page to prove all of the following:

- Node.js reports `win32` and `arm64`;
- the Free archive passes signature and checksum verification;
- the resolved PE executable has ARM64 machine type `0xAA64`;
- the default bridge launches that executable and completes a browser action;
- `cloakbrowser_binary_info` reports platform `windows-arm64`, tier `free`, and
  `installed: true`; and
- a second start can reuse the verified native cache.

The cache-transition case in R5 must also be automated by seeding an
incompatible Windows x64 entry and proving that a native start reaches a
verified ARM64 executable without a manual purge.

### R11. Protected Pro CI Gate

Native Pro validation must run on `windows-11-arm` only in a protected,
non-fork workflow context. The existing repository secret used for this check
must be unavailable to untrusted pull-request code, masked from logs, omitted
from command arguments where it could be printed, and excluded from uploaded
artifacts.

With a clean Pro cache, the check must prove the authenticated archive is
signature- and checksum-verified, its PE machine type is `0xAA64`,
`cloakbrowser_binary_info` reports `windows-arm64` and tier `pro`, and the
default bridge completes a browser action without falling back to Free.
Workflow permissions must remain least-privilege.

### R12. Compatibility Documentation

Windows ARM64 may be advertised only after R10 and R11 pass. The compatibility
source data and generated README/documentation tables must add Windows ARM64,
and the testing documentation must describe the native runner and gates.
Changed human-authored public documentation must be updated surgically in all
required locales, with the relevant translation-manifest entries refreshed
from the actual files.

Documentation validation must include:

- `npm run docs:compatibility:check`;
- `npm run docs:build`;
- `npm run docs:seo:validate`;
- `npm run docs:translations:check`; and
- `npm run check`.

### R13. Rollback

If the selected stable upstream release is withdrawn or fails either native
gate, the dependency floor, Windows ARM64 CI inclusion, and public support claim
must be reverted together. Rollback must not delete user caches or alter
existing platform behavior.

## Constraints And Defaults

- Stable upstream support is mandatory; prerelease packages and bridge-local
  binary logic are excluded.
- Native ARM64 is mandatory; Windows x64 emulation is not a fallback.
- Both Free and Pro paths are mandatory before the public platform claim.
- The existing Node.js engine range, binary update controls, version-pin
  behavior, local binary override, logging destinations, and transport
  boundaries remain unchanged.
- No new telemetry, user-data processing, retention policy, credential format,
  or secret is introduced.

## Non-Goals

- Building, signing, or publishing CloakBrowser artifacts from this repository.
- Specifying or implementing changes in the upstream CloakBrowser repository.
- Adding a Windows container image or changing the existing Linux Docker
  platforms.
- Detecting the host CPU behind an x64 Node.js process.
- Adding a platform-specific CLI option, environment alias, MCP tool, or browser
  contract.
- Performing a project version bump, release, publication, commit, push, or pull
  request as part of this specification workflow.

## Acceptance Criteria

1. The selected stable upstream package satisfies every R2 prerequisite, and
   the dependency lower bound and lockfile resolve to that version or newer
   compatible stable versions.
2. The public `windows-11-arm` matrix passes the existing quality and package
   suites on every supported Node.js version.
3. The clean-cache Free smoke, warm-cache Free smoke, PE architecture check,
   local browser action, diagnostics assertions, and x64-to-ARM64 cache
   transition in R10 pass.
4. The protected Pro smoke in R11 passes without exposing its credential in
   logs, process arguments, caches committed to the repository, or artifacts.
5. Negative verification coverage proves a missing or invalid signed manifest,
   checksum mismatch, corrupt archive, and wrong-architecture cached executable
   cannot be launched or reported as installed.
6. Existing platform matrices, unit/integration/E2E suites, package
   verification, upstream tool parity, and both transport contracts remain
   green and unchanged.
7. `doctor` and `cloakbrowser_binary_info` expose the native platform through
   their existing contracts, and the public/localized compatibility
   documentation passes every R12 validation command.

## Evidence

- Repository flow: `src/bridge/config.ts`, `src/bridge/tools.ts`, and
  `src/cli/doctor.ts`.
- Package contract: `package.json` and `package-lock.json`.
- Current platform claims: `README.md`, `docs/testing.md`,
  `docs/version-compatibility.md`, and
  `docs/data/version-compatibility.json`.
- Current CI matrix: `.github/workflows/ci.yml`.
- User report: [issue #89](https://github.com/swimmwatch/cloakbrowser-mcp/issues/89).
- Upstream API and platform documentation:
  `https://github.com/CloakHQ/cloakbrowser/blob/main/_autodocs/api-reference/javascript-launch.md`
  and `https://github.com/CloakHQ/cloakbrowser/blob/main/js/README.md`.
- Native runner availability:
  `https://github.com/github/docs/blob/main/data/reusables/actions/supported-github-runners.md`.
