# Packet 01 — S6 Runtime And Lifecycle

Status: Ready

## Outcome

Build one local amd64 image that uses S6 Overlay and an always-on,
readiness-notifying Xvfb service while preserving the existing CLI, MCP, exit,
signal, privilege, and protocol contracts.

Requirements: DHM-001, DHM-002, DHM-003, DHM-004, DHM-005, DHM-006, DHM-007
(local amd64 evidence), DHM-008, DHM-010.

## Pinned Inputs

- Source version:
  `aaaeebcaeeebeee6c002e06b1288b222ad86806b2727cde376f6f790f4f87993`
- Specification version:
  `fad6bcccd0eac43e8a19841c851a8425a69f51cd2bcd14a21f9c83d2c07fe5a6`
- Review reference: `3c616247-2370-4c25-9165-043ac7bfdb39`
- S6 Overlay: `v3.2.3.2`
- Noarch SHA-256:
  `5379750ed30a84bbd2e2dd74847ba6b5bd29cd0b2e3ea2ec58049b57eb2eda12`
- x86_64 SHA-256:
  `e6befcc96a437a3831386ecfc51808c5d3e939dc5fe3c02ae9284599e8aa2408`
- aarch64 SHA-256:
  `b17f17a82e7a515c682a91edaf2ffdabb73f891981b6c1fd712115693a2f8b4c`

Before editing, call `specification_check_state` with the pinned source version.
Stop if it is stale or not reviewed.

## Prerequisites And Evidence

- `Dockerfile:25-85` is the only current runtime image assembly path.
- `.dockerignore:1-28` must explicitly admit any new Docker root filesystem
  source directory.
- `Dockerfile:60-76` establishes the `node` runtime user and public environment
  defaults that must remain unchanged.
- `tests/e2e/docker-image.manual.ts:12-15` and
  `tests/e2e/distributionHarness.ts:87-178` own current Docker distribution
  coverage.
- `scripts/compare-playwright-mcp-bridge.mjs:86-140` owns the real-browser
  headless parity container invocation.
- `package.json:46-83` owns the executable local commands.
- The current local image contains `/usr/bin/Xvfb` and runs as uid/gid 1000.
- The official S6 v3 documentation states that `/init` creates the S6 runtime
  tree, user `s6-rc` services start before `CMD`, `CMD` exit controls container
  exit, `S6_CMD_ARG0` restores the previous entrypoint prefix, and
  `S6_CMD_RECEIVE_SIGNALS=1` forwards supported PID 1 signals to `CMD`.

## Allowed Paths

- `Dockerfile`
- `.dockerignore`
- `docker/s6-overlay/**` (new S6 service definitions only)
- `tests/e2e/docker-image.manual.ts`
- `tests/e2e/distributionHarness.ts`
- `tests/e2e/dockerHarness.ts` (new, only if shared lifecycle helpers keep the
  test file within repository complexity limits)
- `scripts/compare-playwright-mcp-bridge.mjs`
- `package.json`
- `docs/specs/docker-headed-mode/tasks/todo.md`
- `docs/specs/docker-headed-mode/tasks/handoff.md`
- this packet's status and evidence sections

Do not change `src/**`, public tool schemas, headless parsing, HTTP session
semantics, documentation, CI, dependency manifests, or image versions unrelated
to S6 Overlay.

## Ownership Boundaries

### Dockerfile S6 asset stage

- Input: BuildKit `TARGETARCH` and the pinned S6 version/digests.
- Output: extracted noarch and mapped architecture files copied into the runtime
  stage.
- Mapping: `amd64 -> x86_64`, `arm64 -> aarch64`; reject every other value.
- Error behavior: checksum mismatch, missing asset, extraction failure, or
  unsupported architecture fails the image build.
- Invariant: download/extraction tools and archives do not remain in the runtime
  image.

### Dockerfile runtime contract

- Copy `docker/s6-overlay/` service definitions into the image.
- Preserve `USER node`, the existing `PLAYWRIGHT_MCP_*` and
  `CLOAK_PLAYWRIGHT_MCP_*` defaults, `/data`, and browser cache ownership.
- Prepare `/run/cloakbrowser-mcp` for uid/gid 1000 with owner-only writes and no
  world-writable S6 directory.
- Set `DISPLAY=:99`, `S6_CMD_ARG0=node`, `S6_CMD_RECEIVE_SIGNALS=1`,
  `S6_BEHAVIOUR_IF_STAGE2_FAILS=2`, and the minimum S6 verbosity that keeps MCP
  stdout clean while retaining failures on stderr.
- Replace the image entrypoint with `ENTRYPOINT ["/init"]`; retain
  `/opt/cloakbrowser-mcp/dist/cli.js` as `CMD`, so Docker arguments append to the
  CLI exactly as they do today.

### `xvfb` longrun

- Files under `docker/s6-overlay/etc/s6-overlay/s6-rc.d/xvfb/` define a modern
  longrun with a `base` dependency, bounded `timeout-up`, `notification-fd` 3,
  `run`, and `finish`.
- `run` execs Xvfb as the service process on `:99`, screen `1280x720x24`, with
  `-nolisten tcp` and `-displayfd 3`. Xserver writes the display number only once
  it is ready, which is the S6 readiness notification.
- Do not use legacy `/etc/services.d` and do not add a custom Node or shell
  process supervisor.

### `xvfb-ready` oneshot and finish policy

- A oneshot depending on `xvfb` creates
  `/run/cloakbrowser-mcp/xvfb-ready` with mode 0600 only after Xvfb readiness.
  Its down transition removes the marker before planned Xvfb teardown.
- The `xvfb` finish script reads `s6-svstat -o wantedup` and the marker:
  - wanted + no marker: startup failure; emit a concise display-startup error;
  - wanted + marker: unexpected display loss; emit a concise lost-display error;
  - not wanted: intentional shutdown; emit no failure.
- Failure diagnostics go only to stderr, write a non-zero S6 container result,
  and invoke S6 halt. Cleanup removes the marker and X11 resources owned by the
  container lifecycle.

### Docker test harness

Use functional helpers rather than a class hierarchy. The helper boundary owns:

- selecting `CLOAKBROWSER_MCP_DOCKER_IMAGE` with
  `cloakbrowser-mcp:dev` as the local default;
- one-shot Docker commands with exact stdout, stderr, and exit status;
- uniquely named attached/detached containers, mapped-port discovery, bounded
  waits, `docker exec`, inspection, and cleanup;
- stdio and Streamable HTTP MCP clients without changing application code;
- cleanup of only the container and temporary directories created by the test.

The existing fake-upstream test remains intact. Remove external `--init` from
the test harness, local smoke command, and parity script so S6 is the image
entrypoint under test.

## Test-First Execution

### RED

Before changing the Dockerfile or adding S6 service files:

1. Add a new `test:e2e:docker:run` package script that runs the existing Docker
   manual test without rebuilding, and make `test:e2e:docker` build the local
   image before delegating to that script. Preserve every unrelated current
   script.
2. Extend the Docker manual suite with assertions for:
   - image entrypoint `/init`, CLI `CMD`, runtime S6 PID 1 tree, non-root CLI and
     Xvfb, and restricted `/run/cloakbrowser-mcp` permissions;
   - unchanged `--help`, invalid-option exit status, and argument propagation;
   - immediate real `browser_snapshot` success over stdio with
     `PLAYWRIGHT_MCP_HEADLESS=false`;
   - default-headless real-browser success;
   - one Streamable HTTP process with headed and headless sessions initialized
     independently, both completing a real browser action;
   - startup failure before readiness, forced Xvfb exit after readiness, clean
     SIGTERM and SIGINT shutdown, no surviving owned process, and correct
     stderr/stdout classification;
   - no X11 TCP listener and no added Linux capability or host display mount.
3. Run:

   ```bash
   npm run docker:build
   npm run test:e2e:docker:run
   ```

4. Record failures caused by the missing `/init`, missing `DISPLAY`, and missing
   lifecycle behavior. Harness/import failures are not valid RED evidence.

### GREEN

Implement the asset stage, root filesystem service definitions, runtime image
contract, and removal of external `--init` from the scoped local invocations.
Correct the implementation until the unchanged tests pass.

### PROVE

These absence and wiring claims require targeted mutation evidence after GREEN:

- Prepend one synthetic stdout line before `/init`; confirm the stdio protocol
  test fails, then remove the mutation.
- Make `/run/cloakbrowser-mcp` world-writable in the running test container;
  confirm the permission assertion fails, then restore the image.
- Temporarily remove the `notification-fd` or `xvfb-ready` dependency from a
  copied Docker build context; confirm the readiness assertion fails, then
  discard the copied context.
- Temporarily bypass the Xvfb finish halt action in a copied build context;
  confirm the post-readiness termination assertion fails, then discard the
  copied context.

Do not leave mutation images, copied contexts, or weakened assertions behind.
Record which exact test each mutation broke.

## Focused Verification

Run from the repository root:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run docker:lint
npm run docker:build
npm run docker:smoke
npm run test:e2e:docker:run
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
npm run check
git diff --check
```

Expected results:

- all commands exit 0;
- the Docker manual suite records real headed stdio and HTTP browser results;
- the parity report retains every upstream tool and both local tools;
- no S6/Xvfb line appears on MCP stdout;
- local evidence is explicitly amd64 and does not claim arm64 completion.

## Completion

Mark packet 01 complete only after RED, GREEN, required PROVE, and every focused
check passes. Update `todo.md` and replace `handoff.md` with current evidence.
Stop; do not start packet 02 without a separate invocation.
