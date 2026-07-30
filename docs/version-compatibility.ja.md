---
description: cloakbrowser-mcp リリースと upstream Playwright MCP バージョンの互換性対応表。
icon: material/source-branch-sync
tags:
  - ユーザーガイド
---

# バージョン互換性

`cloakbrowser-mcp` は自身のリリースに Semantic Versioning を使用します。ブラウザーツール契約は `@playwright/mcp` から来るため、各リリースはビルドとテストに使用した Playwright MCP バージョンを記録します。

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp 依存関係 | Playwright MCP Docker ベース               | CloakBrowser 依存関係 | Node.js   | トランスポート         | テスト済みプラットフォーム                                                                      | ツール互換性                          |
| ---------------- | ------------------------ | ------------------------------------------ | --------------------- | --------- | ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| `1.10.0`          | `^0.0.78`                | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`            | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 と 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.9.0`          | `^0.0.78`                | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`            | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 と 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.8.0`          | `^0.0.78`                | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`            | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 と 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.7.0`          | `^0.0.77`                | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`             | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.6.1`          | `^0.0.77`                | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`             | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.6.0`          | `^0.0.77`                | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`             | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.5.0`          | `^0.0.76`                | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`             | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.4.0`          | `^0.0.76`                | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`             | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream ツールを CI で比較。 |
| `1.3.0`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`             | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.2.7`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.2.6`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.2.5`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.2.3`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.2.2`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.2.1`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.2.0`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.1.0`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.0.2`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.0.1`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |
| `1.0.0`          | `^0.0.75`                | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`             | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream ツールを CI で比較。 |

<!-- compatibility-table:end -->

## この表の読み方

- `cloakbrowser-mcp` はこのプロジェクトの npm と Docker のリリースバージョンです。
- `@playwright/mcp` は CLI パッケージが使用する npm 依存範囲です。
- Playwright MCP Docker ベースは、このプロジェクトの Docker イメージが使用する upstream イメージです。
- CloakBrowser 依存関係は、CloakBrowser Chromium バイナリの解決とインストールに使用する npm 範囲です。
- `Node.js` は npm パッケージがサポートする runtime 範囲です。
- トランスポートは、このブリッジが公開する MCP トランスポートです。
- テスト済みプラットフォームは、CI と release smoke テストでカバーされるプラットフォームです。
- ツール互換性は、既定の upstream Playwright MCP ツール表面が公式 runtime と比較されるかを示します。

再現性が重要な場合は、`latest` ではなく正確なバージョンで `cloakbrowser-mcp` を固定してください。

Docker リリースは現在 `linux/amd64` と `linux/arm64` を公開しています。Browser parity は `linux/amd64` で比較され、両方の Docker プラットフォームは multi-platform manifest 公開前に release smoke テストを受けます。
