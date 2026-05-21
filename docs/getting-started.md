# Getting started

This page is for users who want to run `cloakbrowser-mcp` from published artifacts. You do not need to clone the repository or build from source. For source-based development, use [Development](development.md).

## Choose an install method

Use one of these supported runtime paths:

- **npm package**: best when your MCP client can run Node.js tools directly.
- **Docker image**: best when you want an isolated runtime with the CloakBrowser browser cache already prepared.

The server uses MCP **stdio** transport. It reserves `stdout` for JSON-RPC messages and writes logs to `stderr`.

## Prerequisites

For npm:

- Node.js **>= 20**.
- `npm` / `npx` available in the same environment where your MCP client starts tools.

For Docker:

- Docker available in the same environment where your MCP client starts tools.
- A writable host directory for artifacts such as screenshots, PDFs, HAR files, traces, and videos.

## Verify the server

Run one of these commands before adding the server to a client.

### npm via npx

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest --log-level=info
```

To pin a release, use the exact npm version:

```bash
npx -y cloakbrowser-mcp@7.0.0 --log-level=info
```

### global npm install

```bash
npm install -g cloakbrowser-mcp
cloakbrowser-mcp --help
cloakbrowser-mcp --log-level=info
```

### Docker

```bash
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:latest
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -e CLOAKBROWSER_MCP_LOG_LEVEL=info \
  ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

To pin a release, use the exact Docker tag:

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  ghcr.io/swimmwatch/cloakbrowser-mcp:7.0.0
```

The Docker image writes artifacts to `/data` and includes a pre-populated CloakBrowser Chromium cache. For Docker runtime details, see [Docker](docker.md).

## Common configuration snippets

Most MCP clients use one of two local configuration shapes.

### Claude-style JSON

Use this for Claude Desktop, Claude Code project files, Cursor, Windsurf, Cline, and many other MCP-compatible clients:

```jsonc
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest", "--log-level", "info"],
      "env": {
        "CLOAKBROWSER_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
      }
    }
  }
}
```

For a globally installed npm package:

```jsonc
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "cloakbrowser-mcp",
      "args": ["--log-level", "info"],
      "env": {
        "CLOAKBROWSER_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
      }
    }
  }
}
```

For Docker:

```jsonc
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "-e",
        "CLOAKBROWSER_MCP_LOG_LEVEL=info",
        "ghcr.io/swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

Use absolute host paths in Docker volume arguments. Relative paths often resolve from the MCP client's working directory, not from your project.

### VS Code-style JSON

VS Code and GitHub Copilot use `servers`, not `mcpServers`:

```jsonc
{
  "servers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest", "--log-level", "info"],
      "env": {
        "CLOAKBROWSER_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
      }
    }
  }
}
```

## Configuration locations

| Client | Scope | Location | Root key |
| --- | --- | --- | --- |
| Claude Desktop | User | `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows | `mcpServers` |
| Claude Code | Project | `.mcp.json` | `mcpServers` |
| Claude Code | User | `~/.claude.json` | `mcpServers` |
| VS Code / GitHub Copilot | Workspace | `.vscode/mcp.json` | `servers` |
| VS Code / GitHub Copilot | User profile | `MCP: Open User Configuration` | `servers` |
| VS Code Dev Container | Container | `devcontainer.json` -> `customizations.vscode.mcp` | `servers` |
| Cursor | Project | `.cursor/mcp.json` | `mcpServers` |
| Cursor | Global | `~/.cursor/mcp.json` | `mcpServers` |
| Windsurf / Cascade | Global | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| Cline IDE extension | Extension settings | Open from Cline MCP Servers -> Configure | `mcpServers` |
| Cline CLI | User | `~/.cline/mcp.json` | `mcpServers` |
| Continue | Workspace block | `.continue/mcpServers/*.yaml` | `mcpServers` array |
| Continue | Imported JSON | `.continue/mcpServers/*.json` | `mcpServers` |
| Zed | User settings | Open Zed settings UI; commonly `~/.config/zed/settings.json` on Linux | `context_servers` |
| JetBrains Junie | Project | `.junie/mcp/mcp.json` | `mcpServers` |
| JetBrains Junie | User | `~/.junie/mcp/mcp.json` | `mcpServers` |
| Gemini CLI | Project | `.gemini/settings.json` | `mcpServers` |
| Gemini CLI | User | `~/.gemini/settings.json` | `mcpServers` |
| Codex CLI | User | `~/.codex/config.toml` | managed by `codex mcp` |
| Generic Claude-compatible client | Varies | Client-specific MCP JSON file | `mcpServers` |

## Client setup

### Claude Desktop

Claude Desktop reads MCP server configuration from:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the Claude-style JSON block under `mcpServers`, then fully quit and restart Claude Desktop. On Windows, restart from the system tray as well.

If the tool does not appear, inspect Claude Desktop MCP logs:

- macOS: `~/Library/Logs/Claude`
- Windows: `%APPDATA%\Claude\logs`

### Claude Code

For a user-wide install:

```bash
claude mcp add --transport stdio cloakbrowser --scope user -- \
  npx -y cloakbrowser-mcp@latest --log-level info
```

For a project-shared install:

```bash
claude mcp add --transport stdio cloakbrowser --scope project -- \
  npx -y cloakbrowser-mcp@latest --log-level info
```

Claude Code stores project-scoped servers in `.mcp.json` and user-scoped servers in `~/.claude.json`. Project-scoped servers are suitable for teams, but do not commit secrets or machine-specific paths.

### VS Code / GitHub Copilot

VS Code supports MCP in user, workspace, remote, and dev-container contexts.

Use one of these options:

- Command Palette: `MCP: Add Server`, then choose workspace or global.
- Workspace file: `.vscode/mcp.json`, using the VS Code-style JSON `servers` shape.
- User profile file: run `MCP: Open User Configuration`.
- CLI:

```bash
code --add-mcp '{"name":"cloakbrowser","command":"npx","args":["-y","cloakbrowser-mcp@latest","--log-level","info"]}'
```

In Dev Containers, add the same `servers` block under `customizations.vscode.mcp` in `devcontainer.json`.

### Cursor

Cursor uses Claude-style JSON and supports both project and global configuration:

- Project: `.cursor/mcp.json`
- Global: `~/.cursor/mcp.json`

Create one of those files and paste the Claude-style npm or Docker block. Cursor also supports MCP from its settings UI and Cursor CLI uses the same MCP configuration as the editor.

### Windsurf / Cascade

Windsurf Cascade uses Claude-style JSON in:

```text
~/.codeium/windsurf/mcp_config.json
```

You can also open it through `Windsurf Settings` -> `Cascade` -> `MCP Servers` or the `MCPs` icon in the Cascade panel. Paste the Claude-style npm or Docker block under `mcpServers`, then refresh or restart Cascade.

### Cline

Cline uses Claude-style JSON under `mcpServers`.

For the IDE extension:

1. Open the Cline panel.
2. Click the MCP Servers icon.
3. Open the Configure tab.
4. Click `Configure MCP Servers`.
5. Paste the Claude-style npm or Docker block.

For Cline CLI, use the MCP wizard:

```bash
cline mcp
```

The CLI also supports a user-level MCP config at `~/.cline/mcp.json`.

### Continue

Continue can use its YAML MCP block format or import Claude-style JSON.

Recommended workspace file:

```text
.continue/mcpServers/cloakbrowser-mcp.yaml
```

```yaml
name: CloakBrowser MCP
version: 1.0.0
schema: v1
mcpServers:
  - name: cloakbrowser
    type: stdio
    command: npx
    args:
      - -y
      - cloakbrowser-mcp@latest
      - --log-level
      - info
    env:
      CLOAKBROWSER_MCP_OUTPUT_DIR: /tmp/cloakbrowser-artifacts
```

If you already use Claude Desktop, Cursor, or Cline JSON configs, Continue can also read a copied JSON file placed in `.continue/mcpServers/mcp.json`.

### Zed

Zed calls MCP servers `context_servers` and configures them in `settings.json`, not `mcpServers`.

Open the Agent Panel settings or edit your Zed settings file and add:

```jsonc
{
  "context_servers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest", "--log-level", "info"],
      "env": {
        "CLOAKBROWSER_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
      }
    }
  }
}
```

On Linux the settings file is commonly `~/.config/zed/settings.json`; on macOS and Windows, use Zed's settings UI to open the exact file location.

### JetBrains Junie

Junie uses `mcp.json` files with the Claude-style `mcpServers` key.

Configuration locations:

- Project: `.junie/mcp/mcp.json`
- User: `~/.junie/mcp/mcp.json`

You can also use Junie's MCP settings UI or `/mcp` in Junie CLI. For shared project config, commit `.junie/mcp/mcp.json` only if it contains no secrets and no machine-specific absolute paths.

### Gemini CLI

Gemini CLI can add stdio MCP servers from the command line:

```bash
gemini mcp add --scope user cloakbrowser npx -y cloakbrowser-mcp@latest --log-level info
```

To keep the config project-local, use `--scope project`.

Manual configuration uses `mcpServers` in `settings.json`:

- User: `~/.gemini/settings.json`
- Project: `.gemini/settings.json`

```jsonc
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest", "--log-level", "info"],
      "env": {
        "CLOAKBROWSER_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
      },
      "trust": false
    }
  }
}
```

Use `/mcp` inside Gemini CLI to inspect connection status and discovered tools.

### Codex CLI

Codex CLI can add this stdio server with:

```bash
codex mcp add cloakbrowser \
  --env CLOAKBROWSER_MCP_OUTPUT_DIR=/tmp/cloakbrowser-artifacts \
  -- npx -y cloakbrowser-mcp@latest --log-level info
```

Codex stores configuration in `~/.codex/config.toml`. Use:

```bash
codex mcp list
codex mcp get cloakbrowser
```

to verify the saved server definition.

### Other MCP-compatible clients

If your client supports local stdio MCP servers, configure it with:

- Command: `npx`
- Args: `-y cloakbrowser-mcp@latest --log-level info`
- Transport: `stdio`
- Environment:
  - `CLOAKBROWSER_MCP_OUTPUT_DIR=/absolute/path/to/artifacts`
  - Optional: `CLOAKBROWSER_MCP_ALLOWED_ORIGINS=example.com,localhost`
  - Optional: `CLOAKBROWSER_MCP_BLOCKED_ORIGINS=internal.example.com`

If the client asks for one JSON object per server rather than a top-level map, use only this inner object:

```jsonc
{
  "command": "npx",
  "args": ["-y", "cloakbrowser-mcp@latest", "--log-level", "info"],
  "env": {
    "CLOAKBROWSER_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
  }
}
```

## Shared vs personal configuration

Use **personal/user scope** when:

- You want the server in every project.
- The artifact directory is machine-specific.
- You use private environment variables.

Use **project/workspace scope** when:

- The project explicitly depends on browser MCP tools.
- The config is safe to commit.
- Paths are portable or use client-supported variables.

Never commit API keys, session data, browser profile directories, or private absolute paths.

## Useful runtime options

Most clients can pass these through `args` or `env`:

```bash
--log-level info
--output-dir /tmp/cloakbrowser-artifacts
--allowed-origins example.com,localhost
--blocked-origins internal.example.com
--default-timeout-ms 5000
--navigation-timeout-ms 60000
```

Capability flags can be enabled from CLI args or environment variables. For example:

```bash
--cap-allow-pdf
--cap-allow-devtools-experimental
--cap-allow-coordinate-input
```

See [Configuration](configuration.md) for every option and capability flag.

## First call

Once your client is connected, it should see 28 default tools: the full 23-tool Playwright MCP-compatible browser surface plus `browser_get_config`, `cloakbrowser_binary_info`, and the three read-only verify helpers.

A useful first call is:

```text
Use the cloakbrowser MCP server to call browser_get_config.
```

That returns the effective server configuration with secrets redacted and does not launch a browser.

Then try a browser action:

```text
Use the cloakbrowser MCP server to open https://example.com, take an accessibility snapshot, and summarize the visible page.
```

During MCP initialization the server advertises `io.github.swimmwatch/cloakbrowser-mcp` as its implementation name, `CloakBrowser MCP` as its title, the package version, documentation URL, icon metadata, and concise usage instructions.

## Troubleshooting

If the server does not appear in your client:

1. Run `npx -y cloakbrowser-mcp@latest --help` manually in the same shell environment.
2. Check that your client uses the correct root key: `mcpServers`, `servers`, or `context_servers`.
3. Restart or refresh the MCP client after editing config.
4. Use absolute paths for artifact directories and Docker volume mounts.
5. Check the client logs. For stdio MCP, any accidental output on `stdout` breaks the JSON-RPC stream; this server logs to `stderr` by design.
6. On Windows, use JSON-safe paths such as `C:\\Users\\you\\artifacts` or forward slashes.

If Docker starts but artifacts are missing, verify that the host path before `:/data` exists and is writable.
