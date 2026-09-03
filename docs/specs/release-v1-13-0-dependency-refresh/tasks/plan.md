# v1.13.0 implementation packets

Status: Approved

## Outcome and boundaries

These packets implement the approved `v1.13.0` dependency refresh as a local,
reviewable release change set. They preserve the public CLI, MCP, HTTP,
transport, Node, and platform contracts. They do not commit, push, create a
pull request, close GitHub items, merge, tag, or publish.

## Order

1. [01 Dependency and supply-chain refresh](01_dependency-and-supply-chain-refresh.md)
2. [02 Bridge parity and integration coverage](02_bridge-parity-and-integration-coverage.md)
3. [03 Release metadata and documentation](03_release-metadata-and-documentation.md)
4. [04 Full release verification](04_full-release-verification.md)
5. [05 Manual GitHub delivery gates](05_manual-github-delivery-gates.md)

Packet 02 requires the refreshed package and Docker baseline from packet 01.
Packet 03 requires packets 01 and 02 because it records their shipped
versions. Packet 04 requires packets 01–03. Packet 05 is never automatic and
requires a green, separately created release PR plus separate user
authorization.

## Requirement coverage

| Requirements | Packet |
| --- | --- |
| DEP-01, DEP-02, CI-01, DOCKER-01 | 01 |
| CLOAK-01, CLOAK-02, CLOAK-03, PW-01, PW-02, PW-03, COMP-01 | 02 |
| CLOAK-04, COMP-02, REL-01, REL-02 | 03 |
| QA-01 | 04 |
| GH-01, GH-02, GH-03 | 05 |

## Shared risks and rollback

Dependency changes can surface type, lint, formatting, test, generated-doc,
Docker, or upstream-schema incompatibilities. Each packet stops on failure and
leaves local evidence for review; a later targeted packet resolves only the
observed release-relevant cause. No reset, destructive cleanup, or mutation of
the untracked `.trackerignore` is permitted. `bridge-parity-report.json` is a
temporary verification artifact and must be removed after inspection.

## Manual gates

- Local release preparation was approved for v1.13.0 stable only.
- Commit, push, pull-request creation or modification, closing GitHub PRs or
  issues, merge, tag, registry publication, and release publication remain
  separate manual gates.
- GitHub cleanup is eligible only after a green replacement release PR exists.
