---
description: Playwright MCP ब्रिज के लिए विकास कार्यप्रवाह।
icon: material/code-braces
tags:
  - Project Internals
---

# विकास

## सेटअप

```bash
npm install
npm run build
node dist/cli.js --help
```

## दैनिक आदेश

```bash
npm run typecheck
npm run lint
npm run format:check
npm run server:validate
npm run audit:prod
npm test
npm run build
npm run check
```

## स्रोत लेआउट

```text
src/
  cli.ts, cli/    CLI options and process lifecycle
  server.ts       upstream MCP proxy
  bridge/         browser configuration and local introspection
  cdp/            managed CDP leases, readiness and capability proxy
  http/           Streamable HTTP sessions and transport
  docker/         container launcher, display and health checks
  runtime/        console and humanize compatibility
  logging/        runtime diagnostics
  protocol/       shared MCP protocol support
  project/        package and server metadata
```

हटाए गए नेटिव एडाप्टर/टूल-रजिस्ट्री कार्यान्वयन को पुनः शामिल नहीं किया जाना चाहिए। अपस्ट्रीम Playwright MCP ब्राउज़र टूल व्यवहार का मालिक है।

## स्थानीय डॉकर

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## दस्तावेज़

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
