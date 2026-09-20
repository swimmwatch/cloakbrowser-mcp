# cloakbrowser-mcp

CloakBrowser-backed Playwright MCP browser automation for AI agents.

`cloakbrowser-mcp` runs upstream Playwright MCP browser tools with the
CloakBrowser Chromium binary. The bridge keeps upstream Playwright MCP tools
unchanged and adds only local CloakBrowser introspection tools.

## Pull

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
```

## Run

```bash
docker run --rm swimmwatch/cloakbrowser-mcp:latest --help
```

For stdio MCP usage with persisted artifacts:

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

For a persistent browser profile, keep using `/data` as the container
persistence root:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

For Chrome extensions, mount the extension directory separately and pass the
container path:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Managed CDP

Managed Chrome DevTools Protocol access is opt-in and session-scoped. Publish the
configured port range one-to-one, enable remote binding inside the container, and use
a concrete advertised host:

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

Retrieve the capability URL with `cloakbrowser_bridge_info` and connect through a CDP
API such as Playwright `chromium.connectOverCDP()`. Treat the URL as a credential.
`--cdp-advertised-scheme https` advertises operator-terminated TLS; the bridge does not
provide TLS for managed CDP. See the full
[Docker guide](https://swimmwatch.github.io/cloakbrowser-mcp/docker/#managed-cdp).

## MCP client config

```json
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
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Alternative registry

The same release tags are also published to GHCR:

```bash
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

## Links

- GitHub: https://github.com/swimmwatch/cloakbrowser-mcp
- Documentation: https://swimmwatch.github.io/cloakbrowser-mcp/
- npm: https://www.npmjs.com/package/cloakbrowser-mcp
- MCP Registry: https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch%2Fcloakbrowser-mcp
