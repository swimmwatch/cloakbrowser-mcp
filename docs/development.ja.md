---
description: Playwright MCPブリッジの開発ワークフロー。
icon: material/code-braces
tags:
  - Project Internals
---

# 開発

## セットアップ

```bash
npm install
npm run build
node dist/cli.js --help
```

## 日常のコマンド

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

## ソースのレイアウト

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

削除されたネイティブアダプター／ツールレジストリの実装は、再導入すべきではありません。ブラウザツールの動作については、アップストリームのPlaywright MCPが担当しています。

## ローカルDocker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## ドキュメント

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
