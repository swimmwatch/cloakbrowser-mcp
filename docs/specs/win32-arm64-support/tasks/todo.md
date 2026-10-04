# Native Windows ARM64 Task Checklist

Status: Blocked — packet 01 has no qualifying stable upstream release.

- [ ] [01 — Qualify the stable upstream release](01_qualify_upstream_release.md)
- [ ] [02 — Consume the upstream dependency](02_consume_upstream_dependency.md)
- [ ] [03 — Add the native Windows ARM64 smoke harness](03_add_native_windows_smoke_harness.md)
- [ ] [04 — Wire public Windows ARM64 CI](04_wire_public_windows_arm_ci.md)
- [ ] [05 — Wire protected Pro CI](05_wire_protected_pro_ci.md)
- [ ] [06 — Validate native CI](06_validate_native_ci.md)
- [ ] [07 — Publish the compatibility contract](07_publish_compatibility_contract.md)

Complete exactly one explicitly authorized packet per implementation
invocation. A checked packet must have its acceptance evidence and verification
results recorded in [handoff.md](handoff.md). Do not begin the next packet,
commit, push, open a pull request, dispatch a workflow, publish, or release
without the corresponding separate authorization.
