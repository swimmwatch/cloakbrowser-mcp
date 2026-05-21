# Library API

This page is for embedding `cloakbrowser-mcp` from another Node.js process. Most users should run the CLI through [Getting started](getting-started.md).

## Exports

The package root exports:

- `createServer`
- `configSchema`, `DEFAULT_CONFIG`, `loadConfig`
- `createLogger`
- `ToolRegistry`
- `ArtifactManager`
- `CloakBrowserAdapter`, `MockBrowserAdapter`
- `CloakMcpError`, `isCloakMcpError`
- Types: `CreateServerOptions`, `CreatedServer`, `ResolvedConfig`, `CapabilityFlags`, `CapabilityKey`, `BrowserAdapter`, `PageAdapter`, `Logger`, `LogLevel`, `ToolContext`, `ToolDefinition`, `ToolResult`

## Create a server

```ts
import { configSchema, createLogger, createServer } from 'cloakbrowser-mcp';

const config = configSchema.parse({
  logLevel: 'info',
  outputDir: '/tmp/cloakbrowser-artifacts',
  capabilities: {
    allowScreenshots: true,
  },
});

const created = createServer({
  config,
  logger: createLogger(config.logLevel),
});

await created.start();
```

`start()` uses MCP stdio transport by default. Use the CLI unless your host process needs to inject a custom adapter, logger, or server metadata.

## Inject a test adapter

```ts
import { configSchema, createServer, MockBrowserAdapter } from 'cloakbrowser-mcp';

const config = configSchema.parse({
  logLevel: 'silent',
  outputDir: '/tmp/cloakbrowser-test-artifacts',
});

const adapter = new MockBrowserAdapter({
  'https://example.test/': {
    title: 'Example',
    text: 'Hello from a fixture',
    elements: {
      '#login': { role: 'button', name: 'Log in' },
    },
  },
});

const created = createServer({ config, adapter });
const result = await created.registry.call('browser_navigate', {
  url: 'https://example.test/',
});

await created.dispose();
```

Integration tests use the same injection path, which keeps browser-independent behavior testable without a real CloakBrowser runtime.
