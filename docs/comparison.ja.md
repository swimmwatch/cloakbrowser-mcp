---
title: "@playwright/mcp と cloakbrowser-mcp"
description: Playwright MCP upstream と CloakBrowser MCP を、ツール同等性、CloakBrowser 実行、パッケージング、Streamable HTTP、プロファイル、拡張機能、リージョン QA、人間らしい入力で比較します。
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp と cloakbrowser-mcp

上流の `@playwright/mcp` は Playwright MCP ブラウザツールの基準となるサーバーです。`cloakbrowser-mcp` は同じツール群を CloakBrowser Chromium とパッケージ化したデプロイ手順で利用したいチーム向けです。

## 機能の比較

| 機能 | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| 上流ツールを変更しない | 基準となるブラウザツールのスキーマ、説明、応答を定義します。 | 上流のブラウザツールをそのまま転送し、CI で一致を検証します。 |
| CloakBrowser バイナリ | 上流 Playwright MCP が選択したブラウザランタイムを使用します。 | CloakBrowser Chromium を実行ファイルとする上流設定を生成します。 |
| npm 配布 | 上流 Playwright MCP パッケージとして公開されます。 | `npx` と MCP クライアントの stdio 設定向けに `cloakbrowser-mcp` として公開されます。 |
| Docker イメージ | 公式 Playwright MCP イメージを提供します。 | 公式 Playwright MCP イメージを基に、CloakBrowser ランタイムの既定値を準備します。 |
| Streamable HTTP | 上流のトランスポート動作に従います。 | stdio と Streamable HTTP に、ヘルス、準備状態、認証、HTTPS、セッションメタデータの設定を提供します。 |
| 永続プロファイル | 上流が対応するブラウザ状態オプションを使用します。 | `PLAYWRIGHT_MCP_USER_DATA_DIR` を検証し、設定生成時にプロファイルをロックします。 |
| 拡張機能のパス | ブラウザが対応している場合、ランタイムを通じて設定します。 | 検証済みの Chrome 拡張ディレクトリを読み込み、永続プロファイルを必須とします。 |
| コンテキスト検証 | 上流の設定構造に依存します。 | Playwright MCP の設定を書き込む前に、対応するコンテキストオプションを検証します。 |
| GeoIP による地域 QA | プロキシのルーティングは引き続き上流が担当します。 | CloakBrowser のタイムゾーン、言語、ロケールの指紋フラグを設定されたプロキシの地域に合わせられます。 |
| 人間らしい操作 | 標準の Playwright MCP 操作動作を使用します。 | 対応するページ操作に CloakBrowser の人間らしい入力動作を適用できます。 |

## 上流 Playwright MCP を選ぶ場合

- 最小の Playwright MCP セットアップが必要；
- CloakBrowser Chromium が不要；
- Playwright MCP upstream のパッケージングを直接使いたい。

## CloakBrowser MCP を選ぶ場合

- Playwright MCP ツールを CloakBrowser Chromium で実行したい；
- npm、Docker、Streamable HTTP のデプロイ手順が必要；
- 永続プロファイル、拡張機能、コンテキスト検証、リージョン QA、人間らしい入力が必要。

## 次のステップ

- [はじめに](getting-started.md)
- [レシピ](recipes/index.md)
- [ツール](tools.md)
