# Packet 01 — Qualify The Stable Upstream Release

## Outcome

Identify one exact stable `cloakbrowser` version that satisfies the complete
consumer prerequisite, and record enough evidence for another maintainer to
reproduce the decision. If no release qualifies, record the check and stop
without changing package metadata or implementation files.

## Prerequisites And Dependencies

- The specification is `Status: Approved`.
- No earlier packet is required.
- Public npm and upstream release metadata must be reachable.
- Pro artifact evidence may require the protected credential gate below.

## Owned Requirements

- R2 Stable Upstream Dependency Gate
- R4 Pro First-Run And Cached Flow, for upstream artifact availability
- R5 Transparent Cache Transition, for upstream cache semantics
- R7 Failure, Integrity, And Cleanup, for upstream integrity semantics
- R13 Rollback, for withdrawal criteria

## Scope

For a candidate stable version `V`:

1. Confirm `V` is published under a stable npm dist-tag, not a prerelease, and
   record its version, tarball URL, npm integrity, and source revision.
2. Inspect the published tarball/source and authoritative release metadata to
   confirm that `win32` plus `arm64` maps to `windows-arm64` and
   `cloakbrowser-windows-arm64.zip`.
3. Confirm `binaryInfo()` reports coherent Windows ARM64 platform, tier,
   version, cache directory, binary path, installation state, and download URL
   through the existing API.
4. Confirm the Free Windows ARM64 archive exists and is covered by the normal
   detached-signature and checksum verification chain.
5. Confirm the authenticated Pro path exposes a native Windows ARM64 archive
   covered by its normal signed manifest, with no Free or x64 fallback.
6. Confirm the cache layout isolates platforms or validates PE architecture so
   a same-version x64 cache entry is transparently replaced without deleting
   unrelated valid caches.
7. Record upstream evidence for missing/invalid signed manifests, checksum
   mismatch, corrupt archives, interrupted/concurrent acquisition, and
   wrong-architecture cache rejection. Absence of objective upstream evidence
   blocks qualification; do not add bridge-local verification logic.

Write the exact evidence and accepted version into this packet's
`Qualification Record` and into `handoff.md`. Normalize the accepted version in
`decisions.yaml` as a new observed implementation decision.

## Non-Goals

- Do not fork, patch, build, sign, upload, or publish CloakBrowser.
- Do not accept prerelease, Git URL, vendored tarball, or local path
  dependencies.
- Do not download or store a credential in the repository.
- Do not edit `package.json`, the lockfile, source, tests, workflows, or public
  compatibility documentation.

## Relevant Contracts

- Native acceptance is PE machine type `0xAA64`; an x64 archive or emulated
  launch is rejection.
- Free and Pro are both mandatory.
- The signed manifest/checksum path must be the existing upstream trust path.
- No bridge-local platform map, downloader, key, extractor, or cache manager is
  permitted.
- Withdrawal, signature failure, or either native gate failing invalidates `V`
  and triggers the coordinated R13 rollback.

## Expected Files

- `docs/specs/win32-arm64-support/decisions.yaml`
- `docs/specs/win32-arm64-support/tasks/01_qualify_upstream_release.md`
- `docs/specs/win32-arm64-support/tasks/todo.md`
- `docs/specs/win32-arm64-support/tasks/handoff.md`

No other file is owned by this packet.

## Objective Acceptance

- One exact stable version `V` satisfies every numbered scope check.
- Every claim names a public URL, immutable package integrity/source revision,
  upstream test reference, or protected check result.
- Evidence distinguishes Free from Pro and native ARM64 from x64.
- No secret value, secret-derived URL, authorization header, or private
  manifest content is recorded.
- If no release qualifies, this packet remains unchecked and its latest
  observation is recorded as the blocker.

## Verification

Focused read-only commands:

```bash
npm view cloakbrowser dist-tags versions --json
npm view cloakbrowser@<V> version dist.integrity dist.tarball gitHead --json
npm pack cloakbrowser@<V> --json --pack-destination <temporary-directory>
npm run upstream:check:cloakbrowser
```

Use a directory created by `mktemp -d` for the tarball and remove only that
explicit directory after recording non-sensitive evidence. Inspect the
published package and upstream signed release metadata; do not mutate the
installed project dependency during qualification.

Repository-level checks for the Markdown/YAML evidence:

```bash
npx prettier --check docs/specs/win32-arm64-support
npm run docs:build
npm run docs:translations:check
```

If the translation command fails only for the recorded DeepL deferral, record
the exact failure and do not claim it passed.

## Failure, Rollback, And Recovery

- Reject a candidate on any missing Free, Pro, signature, checksum,
  diagnostics, cache, or native-architecture property.
- A read-only rejected candidate requires no code rollback. Record the version
  and reason so it is not re-evaluated without new upstream evidence.
- Never delete the user's normal CloakBrowser cache. Qualification uses only
  explicit temporary paths.

## Manual Gates

- **MANUAL GATE — protected Pro qualification:** if public metadata is
  insufficient, a maintainer must authorize and supply an existing credential
  only to the protected process. Never ask for or persist its value.
- **MANUAL GATE — external mutation:** opening upstream issues, publishing
  artifacts, or changing upstream state is outside this packet and needs
  separate authorization.

## Completion Checklist

- [ ] Stable `V` and immutable npm metadata recorded.
- [ ] Windows ARM64 mapping and archive name confirmed.
- [ ] Free signed archive and integrity path confirmed.
- [ ] Pro native archive and non-fallback integrity path confirmed.
- [ ] `binaryInfo()` Windows ARM64 output confirmed.
- [ ] Cache transition and negative integrity evidence confirmed.
- [x] Decision ledger reviewed and handoff updated without sensitive data.
- [x] Focused checks recorded.
- [ ] `todo.md` packet link checked only if every acceptance item passes.

## Qualification Record

Observed on 2026-07-25:

- Candidate version: `cloakbrowser@0.5.2` (rejected; it is not an accepted
  `V`).
- Stable dist-tag: npm `latest` points to `0.5.2`, and no newer published
  version exists.
- npm integrity:
  `sha512-vXMWM1HzI87CGUrOobMpTu/GqPn2eZbNcImhMMjF/48/M12iZEWVolrquY3ot0YI++ddYjoVb71hkodpRsRlIg==`;
  tarball
  `https://registry.npmjs.org/cloakbrowser/-/cloakbrowser-0.5.2.tgz`;
  SHA-1 `39c870727a9187ca506e053c020cff78340f2701`.
- Source revision: `a5f2c33ff9aa27cabd93871d714ee1469fb8fcc5`.
- Free archive and signed-manifest evidence: the published tarball's
  `dist/config.js` maps only `win32-x64` to `windows-x64`; it has no
  `win32-arm64` or `windows-arm64` mapping. GitHub release
  `chromium-v146.0.7680.177.5` publishes
  `cloakbrowser-linux-x64.tar.gz`, `cloakbrowser-windows-x64.zip`,
  `SHA256SUMS`, and `SHA256SUMS.sig`, but no
  `cloakbrowser-windows-arm64.zip`.
- Pro archive and signed-manifest evidence: not evaluated and no credential was
  requested. The candidate already fails the mandatory public package mapping
  and Free archive gates.
- `binaryInfo()` evidence: not runnable for the required platform because the
  published platform resolver rejects `win32-arm64` before it can return
  coherent `windows-arm64` information.
- Cache transition evidence: not evaluated because the candidate has no native
  Windows ARM64 platform mapping or archive.
- Negative integrity/concurrency evidence: not evaluated because the candidate
  already fails mandatory R2 prerequisites.
- Qualification result: rejected. Packet 01 remains incomplete, and packet 02
  is ineligible until a newer stable upstream release is requalified.

## Handoff

Record the accepted `V`, evidence locations, checks, and remaining manual gates
in `handoff.md`. The only next eligible packet after successful qualification
is packet 02.
