---
description: CloakBrowser MCPは、CloakBrowser、Docker、Streamable HTTP、GeoIP対応のプロキシセッション、および人間らしい入力動作を備えた、ブラウザ自動化のためのPlaywright MCPブリッジです。
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">はじめに</a>
  <a class="md-button" href="tools/">ツール</a>
  <a class="md-button" href="docker/">Docker</a>
</p>

# CloakBrowser MCP サーバー

`cloakbrowser-mcp` は、CloakBrowser Chromium バイナリを使用して `@playwright/mcp` をアップストリームで実行する、Model Context Protocol 対応のブラウザ自動化サーバーです。 Playwright MCP 互換のブラウザツール、CloakBrowser の実行、npm インストール、Docker イメージ、ストリーム可能な HTTP セッション、地域別の QA 向けの GeoIP 対応プロキシマッチング、またはインタラクションに敏感なフロー向けのヒューマナイズされた入力動作が必要な場合に利用してください。

現在のバージョン：{{ project.version_tag }}。

## バージョンの互換性

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.5.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.3`     | stdio, Streamable HTTP | CI で比較済み |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | CI で比較済み |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | CI で比較済み |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI で比較済み |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | CI で比較済み |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | CI で比較済み |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | CI で比較済み |

<!-- compatibility-table:end -->

このプロジェクトのSemVerリリースとアップストリームのPlaywright MCPバージョンとの間のマッピングについては、[バージョン互換性](version-compatibility.md)を参照してください。

## 概要

<div class="grid cards" markdown>

- :material-connection: **ブリッジランタイム**

  upstream Playwright MCP を子プロセスとして起動し、ブラウザーツール呼び出しを変更せずに転送します。

- :material-incognito: **CloakBrowser の実行**

  `launchOptions.executablePath` を CloakBrowser に設定した Playwright MCP 設定を生成します。

- :fontawesome-brands-node-js: **npm CLI**

  stdio と Streamable HTTP MCP クライアント向けの薄い Node.js CLI パッケージとして公開されています。

- :fontawesome-brands-docker: **Docker イメージ**

  公式 Playwright MCP イメージをベースにし、CloakBrowser バイナリキャッシュを事前に読み込みます。

- :material-map-marker-radius: **GeoIP プロキシ照合**

  CloakBrowser のタイムゾーン、言語、ロケールのフィンガープリントフラグを、設定されたプロキシの場所に合わせます。

- :material-gesture-tap: **人間らしい入力動作**

  CloakBrowser の人間らしいマウス、キーボード、スクロールレイヤーを通じてページ操作を処理します。

</div>

## 工具の表面

上流の Playwright MCP ツール契約が優先されます。このプロジェクトでは、ローカルのイントロスペクションツールを 2 つ追加するのみです：

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## 今後の手順

- npm、Docker、および MCP クライアントの設定については、[はじめに](getting-started.md)をご覧ください。
- [設定](configuration.md)：サポートされている環境変数について。
- [GeoIP プロキシマッチング](geoip-proxy-matching.md)：地域別の品質保証（QA）、実行時プロキシメタデータ、および複数ロケーションにわたるストリーム可能な HTTP セッションについて。
- [人間らしい入力動作](humanized-input-behavior.md)：インタラクションのリアリティ、セットアップ、およびユースケースに対応。
- [ツール](tools.md)：ツールインターフェースへの期待値および上流との互換性を確保するため。
- [FAQ](faq.md)：一般的なインストール、Docker、互換性、およびセキュリティに関する質問への回答。
- [コントリビューターガイド](contributor-guide.md)：開発、テスト、アーキテクチャ、およびリリースに関する詳細。
