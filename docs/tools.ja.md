---
description: CloakBrowser MCP が公開するツール表面。
icon: material/tools
tags:
  - ツール
  - ユーザーガイド
---

# ツール

`cloakbrowser-mcp` は upstream Playwright MCP ツールを変更せずに公開します。ツール名、説明、schema、注釈、応答は `@playwright/mcp` から来ます。

## Upstream ツール

既定の upstream ブラウザーツール表面は、固定された Playwright MCP 依存関係と一致することが期待されます。これには、ナビゲーション、snapshot、クリック、入力、スクリーンショット、タブ、コンソールメッセージ、ネットワーク検査、ファイルアップロード、ダイアログ、安全でない評価ツールなどの主要ブラウザーツールが含まれます。

安定した upstream 参照として、正確なパッケージ commit に固定された Playwright MCP `{{ project.playwright_mcp_package_tag }}` の capability test を参照してください：[default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/36ec986b8b1fc6b4d11f2b6971147755e1b0bc84/tests/capabilities.spec.ts#L19-L77)。

このプロジェクトは upstream Playwright MCP を権威ある情報源として扱い、schema 参照のコピーは保守しません。

## ローカルツール

### `cloakbrowser_binary_info`

CloakBrowser パッケージ、現在のプラットフォーム、キャッシュディレクトリ、期待されるバイナリパス、インストール状態、ブリッジが使用する resolved executable path に関する構造化情報を返します。

### `cloakbrowser_bridge_info`

構造化されたブリッジメタデータを返します：

- MCP server 名とバージョン；
- runtime モード；
- upstream Playwright MCP パッケージとバージョン；
- upstream ツール数；
- ローカル Cloak-specific ツール名。

## 互換性

CI は Docker イメージをビルドし、`npm run bridge:compare` を実行します。このスクリプトは公式 Playwright MCP イメージと CloakBrowser ブリッジイメージを並行して起動し、upstream ツール一覧を比較し、同じ fixture ページで既定の upstream ブラウザーツールを実行します。

機械可読な JSON レポートを書き込むには `--report` を使用します：

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI はこのレポートを Docker ビルドとリリースビルドの artifact としてアップロードします。
