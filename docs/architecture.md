# Architecture

This page is for contributors who need to understand internals. Users should start with [Getting started](getting-started.md), [Docker](docker.md), and [Configuration](configuration.md).

```
src/
  cli.ts                  bin entry (commander-based)
  server.ts               MCP server wiring
  index.ts                public library exports
  config/                 zod schema + env/CLI loader
  errors/                 CloakMcpError + error codes
  logging/                pino-backed stderr logger
  security/               capability gates + origin policies
  artifacts/              screenshot/file output manager
  browser/                BrowserAdapter contract + Cloak/Mock impls + SessionManager
  tools/                  ToolRegistry, ToolContext, tool implementations
tests/
  unit/
  integration/
  contract/
  real/
  fixtures/               static mock page data + ephemeral HTTP server
```

## MCP server wiring

`src/server.ts` constructs an `McpServer` from `@modelcontextprotocol/sdk`, registers every tool via the `ToolRegistry`, and exposes it over `StdioServerTransport`. The CLI in `src/cli.ts` parses arguments with `commander`, resolves config, instantiates the chosen `BrowserAdapter` (real `CloakBrowserAdapter` by default), and starts the server.

The programmatic library surface (`src/index.ts`) exports `createServer({ config, adapter? })` for embedding the server in another process. The same path is used by the integration tests.

## Configuration

Three layers, merged in order: built-in defaults → environment (`CLOAKBROWSER_MCP_*`) → CLI flags. The merged object is validated with `zod`. See [Configuration](configuration.md).

## `BrowserAdapter`

The browser is an injectable dependency. The `BrowserAdapter` interface in `src/browser/adapter.ts` is the only contract tools depend on. Two implementations ship today:

- `CloakBrowserAdapter` — wraps the real `cloakbrowser` package.
- `MockBrowserAdapter` — in-memory implementation used by integration and contract tests.

Tools must never import `cloakbrowser` directly. New backends (e.g. a future Playwright fallback) are added by implementing `BrowserAdapter`.

## `SessionManager`

`SessionManager` (in `src/browser/sessionManager.ts`) owns the lifecycle of pages and contexts:

- Lazily starts the browser on first use.
- Tracks pages by stable `pageId`.
- Enforces `maxPages` and `maxContexts`.
- Surfaces `getPage()`, `currentOrNewPage()`, `newPage()`, `selectPage()`, `closePage()`, `shutdown()`.

Every tool handler receives a `ToolContext` containing `{ session, config, artifacts, logger }`.

## `ToolRegistry`

`ToolRegistry` (in `src/tools/registry.ts`) provides:

- **Capability gating at registration**: a tool whose declared capabilities are not all enabled is skipped — clients never see it.
- **Capability gating at dispatch**: even if capabilities change at runtime, the registry re-checks before invoking the handler.
- **Rejected aliases**: non-public alias names are rejected at registration regardless of configuration. See [Tools](tools.md#rejected-aliases).
- **Input validation**: every call goes through the tool's `zod` schema before reaching the handler.
- **Error normalisation**: handler exceptions are wrapped into MCP error responses with stable codes from `src/errors/index.ts`.

A `ToolDefinition` carries `name`, `description`, `inputSchema` (zod), optional `capabilities: string[]`, optional MCP `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`), and a `handler(input, ctx)`.

## `ArtifactManager`

`ArtifactManager` (in `src/artifacts/manager.ts`) is the single writer for output files:

- Rooted at `outputDir`.
- Sanitises filenames (basename only; absolute paths and `..` rejected).
- Returns a stable `ArtifactRef` `{ path, relativePath, bytes, contentType, createdAt }` that the tool surface returns to the client.

No tool writes to disk except via `ArtifactManager`.

## Error model

`CloakMcpError` (in `src/errors/index.ts`) carries one of a stable set of codes: `INVALID_INPUT`, `CAPABILITY_DENIED`, `ORIGIN_DENIED`, `PATH_DENIED`, `TIMEOUT`, `ASSERTION_FAILED`, `NOT_FOUND`, `BROWSER_UNAVAILABLE`, `BROWSER_CRASHED`, `LIMIT_EXCEEDED`, `UNSUPPORTED`, `INTERNAL`. Every error crossing a module boundary is normalised to a `CloakMcpError`.

## Testing strategy

See [Testing](testing.md). The pattern is: unit tests for pure logic, integration tests against `MockBrowserAdapter`, contract tests for the MCP boundary, and a gated real-browser tier for the CloakBrowser adapter.

## How to add a tool safely

See [Development](development.md#adding-a-new-mcp-tool).
