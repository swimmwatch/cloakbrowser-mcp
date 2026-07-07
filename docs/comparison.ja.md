---
title: "@playwright/mcp と cloakbrowser-mcp"
description: Playwright MCP upstream と CloakBrowser MCP を、ツール同等性、CloakBrowser 実行、パッケージング、Streamable HTTP、プロファイル、拡張機能、リージョン QA、人間らしい入力で比較します。
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp と cloakbrowser-mcp

Upstream @playwright/mcp は Playwright MCP ブラウザーツールの正規サーバーです。cloakbrowser-mcp はそのツール表面を変更せず、CloakBrowser Chromium とパッケージ化されたデプロイ手順で実行します。

## 機能

| 機能 | @playwright/mcp | cloakbrowser-mcp |
| --- | --- | --- |
| Upstream tools | Canonical browser tool surface. | Forwarded unchanged with parity checks. |
| CloakBrowser Chromium | Uses upstream selected browser runtime. | Runs upstream tools with CloakBrowser Chromium. |
| npm / Docker | Use upstream package and image. | Adds package and image paths for CloakBrowser deployment. |
| Streamable HTTP | Follows upstream transport behavior. | Adds packaged health, readiness, auth, HTTPS, and session metadata options. |
| Profiles / extensions | Use upstream browser state options. | Adds validated persistent profiles and extension paths. |
| Regional QA / humanized input | Standard Playwright MCP behavior. | Adds GeoIP helpers and optional humanized interactions. |

## upstream を選ぶ場合

- 最小の Playwright MCP セットアップが必要；
- CloakBrowser Chromium が不要；
- Playwright MCP upstream のパッケージングを直接使いたい。

## CloakBrowser MCP を選ぶ場合

- Playwright MCP ツールを CloakBrowser Chromium で実行したい；
- npm、Docker、Streamable HTTP のデプロイ手順が必要；
- 永続プロファイル、拡張機能、コンテキスト検証、リージョン QA、人間らしい入力が必要。

## 次のステップ

- [Getting Started](getting-started.md)
- [Recipes](recipes/index.md)
- [Tools](tools.md)
