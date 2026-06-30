# Manual npm and Docker E2E Runbook

Use this runbook when an LLM agent or maintainer needs to validate the current branch as both an npm package and a Docker image.

## What This Covers

- Current branch npm tarball installed into a temporary project.
- Current branch Docker image tagged `cloakbrowser-mcp:dev`.
- MCP stdio startup for both distributions.
- Full deterministic fake-upstream tool forwarding.
- Local diagnostic tools: `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.
- Full real upstream browser tool parity through the existing Docker parity script.
- Code assistant subagent checks against one shared Streamable HTTP MCP server.
- Parallel multisession checks from two subagents using the same MCP server.

The deterministic distribution tests use `tests/fixtures/fake-upstream-mcp.mjs`. They validate packaging, process startup, MCP wiring, tool listing, local tools, and forwarding. They do not validate real browser behavior.

The parity command uses real upstream Playwright MCP and validates the pinned 23 browser tools against a local HTTPS fixture.

## Prerequisites

- Node.js 22 or newer.
- npm.
- Docker with Buildx support.
- Network access for Docker base image pulls and CloakBrowser binary download during image build.
- A clean worktree is recommended so generated reports and temporary files are easy to identify.

## Commands

Run from the repository root.

```bash
npm run build
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
npm run check
```

To run both distribution tests together:

```bash
npm run test:e2e:distributions
```

## Code Assistant Subagent Check

Use this section after `npm run build`. It treats the project MCP server as the service under test and runs it with the deterministic fake upstream fixture so every browser tool call is safe.

Port `3000` must be free. If another process already owns it, stop that process or replace `3000` consistently in the server startup command, probe URLs, and `MCP_ENDPOINT` values.

Start one shared Streamable HTTP server in a dedicated terminal or code-assistant command session and keep it running until the subagent checks finish:

```bash
RUNBOOK_TMP_DIR="$(mktemp -d)"
echo "RUNBOOK_TMP_DIR=$RUNBOOK_TMP_DIR"
env \
  PLAYWRIGHT_MCP_CLI_PATH="$PWD/tests/fixtures/fake-upstream-mcp.mjs" \
  PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright \
  PLAYWRIGHT_MCP_OUTPUT_DIR="$RUNBOOK_TMP_DIR" \
  CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=false \
  node dist/cli.js --transport streamable-http --http-host 127.0.0.1 --http-port 3000 \
  2>"$RUNBOOK_TMP_DIR/server.err"
```

In another terminal, verify the probes:

```bash
for attempt in {1..30}; do
  curl --silent --fail http://127.0.0.1:3000/healthz >/dev/null && break
  sleep 1
done

curl --fail http://127.0.0.1:3000/healthz
curl --fail http://127.0.0.1:3000/readyz
```

Ask the code assistant to spawn one subagent for the full tool sweep. The subagent must run this command from the repository root:

```bash
MCP_ENDPOINT=http://127.0.0.1:3000/mcp node --input-type=module <<'NODE'
import { readFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = new URL(process.env.MCP_ENDPOINT ?? 'http://127.0.0.1:3000/mcp');
const fakeToolNames = JSON.parse(await readFile('tests/fixtures/fake-upstream-tools.json', 'utf8'));
const localToolNames = ['cloakbrowser_binary_info', 'cloakbrowser_bridge_info'];
const expectedToolNames = [...fakeToolNames, ...localToolNames];

const client = new Client({ name: 'runbook-tool-sweep-subagent', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(endpoint);

try {
  await client.connect(transport);
  if (!transport.sessionId) throw new Error('MCP session id was not assigned');

  const listedToolNames = (await client.listTools()).tools.map((tool) => tool.name);
  const missing = expectedToolNames.filter((name) => !listedToolNames.includes(name));
  const extra = listedToolNames.filter((name) => !expectedToolNames.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`Unexpected tool list. missing=${missing.join(',')} extra=${extra.join(',')}`);
  }

  for (const name of fakeToolNames) {
    const args = { runbookToolName: name };
    const result = await client.callTool({ name, arguments: args });
    const body = result.structuredContent;
    if (result.isError === true || body?.forwarded !== true || body?.name !== name) {
      throw new Error(`Tool call failed or was not forwarded: ${name}`);
    }
  }

  for (const name of localToolNames) {
    const result = await client.callTool({ name, arguments: {} });
    if (result.isError === true || result.structuredContent == null) {
      throw new Error(`Local tool call failed: ${name}`);
    }
  }

  console.log(JSON.stringify({ sessionId: transport.sessionId, toolCount: listedToolNames.length }, null, 2));
} finally {
  await client.close().catch(() => undefined);
}
NODE
```

Ask the code assistant to spawn two subagents in parallel for multisession validation. Both subagents must connect to the same `MCP_ENDPOINT`; use different `SUBAGENT_LABEL` values and compare the reported `sessionId` and `upstreamPid` values when both finish.

Subagent A:

```bash
SUBAGENT_LABEL=runbook-subagent-a MCP_ENDPOINT=http://127.0.0.1:3000/mcp node --input-type=module <<'NODE'
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const label = process.env.SUBAGENT_LABEL ?? 'runbook-subagent';
const endpoint = new URL(process.env.MCP_ENDPOINT ?? 'http://127.0.0.1:3000/mcp');
const client = new Client({ name: label, version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(endpoint);

try {
  await client.connect(transport);
  if (!transport.sessionId) throw new Error(`${label}: MCP session id was not assigned`);

  const tools = await client.listTools();
  if (!tools.tools.some((tool) => tool.name === 'browser_navigate')) {
    throw new Error(`${label}: browser_navigate is missing`);
  }

  const forwarded = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `https://${label}.example`, includePid: true },
  });
  const bridgeInfo = await client.callTool({ name: 'cloakbrowser_bridge_info', arguments: {} });
  const body = forwarded.structuredContent;
  if (forwarded.isError === true || body?.forwarded !== true || typeof body?.upstreamPid !== 'number') {
    throw new Error(`${label}: browser_navigate did not return a forwarded fake-upstream result`);
  }
  if (bridgeInfo.isError === true || bridgeInfo.structuredContent == null) {
    throw new Error(`${label}: cloakbrowser_bridge_info failed`);
  }

  console.log(JSON.stringify({ label, sessionId: transport.sessionId, upstreamPid: body.upstreamPid }, null, 2));
} finally {
  await client.close().catch(() => undefined);
}
NODE
```

Subagent B runs the same command with `SUBAGENT_LABEL=runbook-subagent-b`.

The two multisession subagents pass only if both complete successfully, their `sessionId` values are different, their `upstreamPid` values are different, and neither reports missing-session, unknown-session, or capacity errors.

Stop the shared server with Ctrl-C in the server terminal after the subagent checks, then remove the temporary directory printed at startup. If cleanup runs from another terminal, set `RUNBOOK_TMP_DIR` to the printed path first:

```bash
rm -rf "$RUNBOOK_TMP_DIR"
```

## Expected Results

- `npm run test:e2e:npm-package` packs the current project, installs the tarball in a temporary project, starts the installed `cloakbrowser-mcp` binary over stdio, lists every fake upstream tool plus both local tools, calls each fake upstream tool, and calls both local tools.
- `npm run test:e2e:docker` builds `cloakbrowser-mcp:dev`, starts it over stdio with the fake upstream fixture mounted into the container, lists every fake upstream tool plus both local tools, calls each fake upstream tool, and calls both local tools.
- `npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json` compares the Docker image with the pinned upstream Playwright MCP image and covers all 23 pinned browser tools.
- `npm run check` remains the normal required local validation command and does not include these manual distribution E2E tests.
- The single subagent lists exactly the 23 fake upstream browser tools plus both local diagnostic tools, then calls every listed expected tool successfully.
- The two parallel multisession subagents connect to the same Streamable HTTP endpoint, receive different session ids, use different fake-upstream child processes, and complete without session mixups.

## Failure Triage

- If npm package E2E fails before MCP startup, inspect `npm pack` output and package file inclusion.
- If npm package E2E starts but tools are missing, inspect bridge startup, local tool registration, and fake upstream path handling.
- If Docker E2E fails before MCP startup, run `npm run docker:build` directly and inspect image build output.
- If Docker E2E cannot find the fake upstream fixture, check the bind mount target `/opt/cloakbrowser-mcp/tests/fixtures`.
- If parity fails, inspect `bridge-parity-report.json` and compare the failing tool response with the pinned upstream image response.
- If the shared Streamable HTTP server does not start, check whether port `3000` is already in use and inspect `$RUNBOOK_TMP_DIR/server.err`.
- If the subagent tool sweep reports missing tools, compare the output with `tests/fixtures/fake-upstream-tools.json` and the local tool names in `src/bridge/tools.ts`.
- If the parallel subagents reuse a session id, lose a session, or report capacity errors, inspect Streamable HTTP session handling, `mcp-session-id` propagation, and `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX`.
- If the parallel subagents share an `upstreamPid`, inspect per-session bridge creation and fake upstream process ownership.

## Cleanup

- The Vitest distribution tests create temporary directories under the OS temp directory and remove them after each test.
- Remove `bridge-parity-report.json` after reviewing it:

```bash
rm -f bridge-parity-report.json
```

- Remove the local Docker image if needed:

```bash
docker image rm cloakbrowser-mcp:dev
```

Do not commit generated tarballs, parity reports, `dist/`, `coverage/`, `site/`, or temporary directories.
