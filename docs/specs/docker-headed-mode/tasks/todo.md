---
render_macros: false
---

# Docker Headed Mode Todo

Pinned source version: `c1ab3860964447a4de50068144ce5de0905c12f2282e58e4f5ee6fe21fd33ddb`

- [x] Packet 01 — replace partial S6 work with pinned Tini and narrow launcher.
- [x] Packet 01 — prove demand-started, single-flight, retained Xvfb and bounded CLI/display lifecycle through RED, GREEN, PROVE evidence.
- [x] Packet 02 — implement private active Docker health without using MCP stdio or changing public HTTP probe schemas.
- [x] Packet 02 — observe Docker healthy/unhealthy/recovered transitions for CLI and X11 failures; record RED, GREEN, PROVE evidence.
- [ ] Packet 03 — complete real-browser stdio/HTTP concurrency, cancellation, isolation, lifecycle, restricted-runtime acceptance coverage.
- [ ] Packet 03 — run the same Docker suite in both CI architecture jobs without weakening parity, Trivy, SARIF, or permissions.
- [ ] Packet 03 — obtain successful `linux/amd64` and `linux/arm64` CI evidence.
- [ ] Packet 04 — update authoritative Docker/configuration/security documentation, all affected locales, generated output, and translation manifest entries.
- [ ] Final — reopen the specification and rerun `specification_check_state` against the pinned source version.
- [ ] Final — run every repository, Docker, documentation, actionlint, and zizmor check listed in the packets.
- [ ] Final — review the complete diff and confirm unrelated user changes are preserved.
