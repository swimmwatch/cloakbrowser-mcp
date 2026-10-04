# Native Windows ARM64 Implementation Plan

Status: Approved

Specification: [../spec.md](../spec.md)

Checklist: [todo.md](todo.md)

Current handoff: [handoff.md](handoff.md)

## Outcome

Consume the first qualifying stable `cloakbrowser` release, prove that the
packaged bridge resolves and launches native Windows ARM64 Free and Pro
binaries, add native public and protected CI gates, and advertise the platform
only after both gates pass.

This plan does not authorize implementation, repository settings changes,
credentials, commits, pushes, pull requests, workflow dispatches, publication,
or release work.

## Packet Index

| Packet | Outcome | Depends on | Current gate |
| --- | --- | --- | --- |
| [01](01_qualify_upstream_release.md) | Qualify one stable upstream release and record reproducible evidence. | Approved specification | No qualifying stable release is currently known. |
| [02](02_consume_upstream_dependency.md) | Raise the `cloakbrowser` dependency floor without adding bridge-local platform logic. | 01 | Packet 01 must identify the exact stable version. |
| [03](03_add_native_windows_smoke_harness.md) | Add packaged-candidate Free and Pro native smoke coverage. | 02 | Requires native `windows-11-arm` execution for acceptance. |
| [04](04_wire_public_windows_arm_ci.md) | Add the full Windows ARM64 quality matrix and public Free smoke. | 03 | GitHub-hosted runner execution is external. |
| [05](05_wire_protected_pro_ci.md) | Add the protected, non-fork Pro smoke workflow. | 03 | Secret identifier is intentionally unresolved; environment setup is manual. |
| [06](06_validate_native_ci.md) | Record successful native quality, Free, and Pro run evidence. | 04 and 05 | Push/PR/dispatch and protected-environment approval require separate authorization. |
| [07](07_publish_compatibility_contract.md) | Publish and localize the Windows ARM64 compatibility claim. | 06 | Both native gates and DeepL translation availability must be confirmed. |

## Dependency Graph

```text
01 qualify upstream
  -> 02 dependency floor
    -> 03 native smoke harness
      -> 04 public quality + Free CI ─┐
      -> 05 protected Pro CI ─────────┴─> 06 native CI evidence
                                             -> 07 compatibility contract
```

Packets 04 and 05 may be implemented independently after packet 03. Packet 06
requires both. Packet 07 must remain blocked until packet 06 records passing
Free and Pro evidence.

## Requirement Coverage

| Requirement | Packets |
| --- | --- |
| R1 Supported Platform | 03, 04, 05, 06, 07 |
| R2 Stable Upstream Dependency Gate | 01, 02 |
| R3 Free First-Run And Cached Flow | 03, 04, 06 |
| R4 Pro First-Run And Cached Flow | 01, 03, 05, 06 |
| R5 Transparent Cache Transition | 01, 03, 04, 06 |
| R6 Diagnostics | 03, 04, 05, 06 |
| R7 Failure, Integrity, And Cleanup | 01, 03, 05, 06 |
| R8 Public Interface Stability | 02, 03, 07 |
| R9 Existing Compatibility | 02, 04, 06, 07 |
| R10 Native Free CI Gate | 03, 04, 06 |
| R11 Protected Pro CI Gate | 03, 05, 06 |
| R12 Compatibility Documentation | 07 |
| R13 Rollback | 01, 02, 04, 05, 06, 07 |

## Contracts And Non-Goals

- Native means `process.platform === "win32"`,
  `process.arch === "arm64"`, and PE machine type `0xAA64`; x64 emulation is
  not acceptance.
- Both Free and Pro paths must pass before the public platform claim changes.
- `cloakbrowser` continues to own platform mapping, downloads, signatures,
  checksums, extraction, cache layout, and binary resolution.
- No CLI, environment, MCP tool, tool schema, transport, server metadata,
  logging, or forwarded Playwright MCP browser contract changes are planned.
- No fork, prerelease dependency, vendored downloader, verification bypass,
  native artifact build, Docker platform, version bump, publication, or
  release is in scope.

## Risks And Rollback

- Upstream availability is the primary blocker. A candidate that lacks any
  Free, Pro, integrity, diagnostics, or cache-transition property is rejected.
- Real binary smokes download and launch third-party executables. They run only
  on native Windows ARM64 with isolated temporary caches and a loopback page.
- Pro validation is credentialed. The credential is step-scoped, never placed
  in arguments or artifacts, and never recorded in this bundle.
- GitHub-hosted ARM64 capacity and upstream downloads may be transient. A
  failed or cancelled run is not acceptance; rerun evidence must be recorded.
- If the accepted upstream release is withdrawn or fails either gate, revert
  the dependency floor, Windows ARM64 workflow coverage, and public support
  claim together. Never delete user caches as rollback.

## Manual Gates

- **MANUAL GATE — upstream Pro evidence:** a maintainer must make an existing
  Pro credential available only to the protected qualification process if
  public metadata cannot prove the Pro archive requirement.
- **MANUAL GATE — secret identifier:** packet 05 cannot bind the workflow until
  a maintainer supplies the non-sensitive GitHub secret identifier. Do not
  request the credential value.
- **MANUAL GATE — repository settings:** create/configure the
  `windows-arm64-pro` GitHub Environment, required reviewers, allowed branches,
  and access to the separately confirmed existing secret outside the worktree.
- **MANUAL GATE — external GitHub mutations:** commit, push, PR creation, and
  workflow dispatch each require separate explicit authorization.
- **MANUAL GATE — protected run:** an authorized reviewer must approve each Pro
  deployment.
- **MANUAL GATE — translation service:** packet 07 cannot finish until DeepL
  can produce the required surgical locale updates.
- Publication, release, merge, and destructive cache cleanup are not authorized
  by this plan.
