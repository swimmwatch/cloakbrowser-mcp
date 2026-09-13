# Docker Headed Mode Todo

Pinned source version:
`aaaeebcaeeebeee6c002e06b1288b222ad86806b2727cde376f6f790f4f87993`

- [ ] Packet 01 — implement and locally verify the S6/Xvfb runtime lifecycle.
- [ ] Packet 01 — record RED, GREEN, and required PROVE evidence in the packet
      and current handoff.
- [ ] Packet 02 — run the Docker E2E suite in both CI architecture jobs without
      weakening existing parity or security checks.
- [ ] Packet 02 — obtain successful `linux/amd64` and `linux/arm64` CI evidence.
- [ ] Packet 03 — update Docker documentation, affected locale pages, and the
      translation manifest.
- [ ] Final — rerun `specification_check_state` with the pinned source version.
- [ ] Final — run all required repository, Docker, documentation, actionlint,
      and zizmor checks listed in the packets.
- [ ] Final — review the complete diff and confirm unrelated user changes were
      preserved.

Do not check an item when its required command is unavailable or failing.
Record the concrete blocker and owner in `handoff.md` instead.
