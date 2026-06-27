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
  cli.ts                  CLI entry point
  server.ts               outer MCP proxy server
  bridge/
    config.ts             Playwright MCP config generation
    env.ts                env parsing helpers
    paths.ts              upstream package path resolution
    tools.ts              local Cloak introspection tools
  runtime/
    consoleFallback.ts    compatibility patch source strings
  project/
    metadata.ts           package and MCP metadata
```

削除されたネイティブアダプター／ツールレジストリの実装は、再導入すべきではありません。ブラウザツールの動作については、アップストリームのPlaywright MCPが担当しています。

## ローカルDocker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## ドキュメント

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
