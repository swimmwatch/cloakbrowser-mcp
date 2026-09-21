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

安定した upstream 参照として、正確なパッケージ commit に固定された Playwright MCP `{{ project.playwright_mcp_package_tag }}` の capability test を参照してください：[default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/tests/capabilities.spec.ts#L19-L77)。

このプロジェクトは upstream Playwright MCP を権威ある情報源として扱い、schema 参照のコピーは保守しません。

既定のセットには `browser_emulate_media` を含む 25 個の upstream ツールがあります。
`PLAYWRIGHT_MCP_CAPS=devtools` はブリッジの `--caps` オプションなしで
`devtools` 機能を子プロセスへ渡します。結果の upstream ツールとスキーマは
変更せずに転送され、`browser_start_recording` と
`browser_stop_recording` も含まれます。

!!! warning "公開 CloakBrowser v146 バイナリでの記録制限"
    記録ツールは利用できますが、CloakBrowser 0.5.10 が使用するキー不要の公開
    Chromium 146 バイナリは、ステルス性を保つため Playwright のページからホストへの
    バインディングを意図的に無効化します。そのため `browser_stop_recording` が返す
    コードは不完全になる場合があります。ナビゲーションは記録されますが、正常に実行された
    テキスト入力やクリックは省略されます。生成された記録は再利用前に確認してください。

    明示的に有効化する互換性対応は [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532) で追跡されています。
    基盤となるバインディングの判断については
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) と
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176) で議論されています。

### 動的 WebMCP ツール

Chromium はバージョン 154 以降で WebMCP を実装しています。それ以前の CloakBrowser ビルドは feature flag を無視するため、WebMCP が必要な場合は互換性のあるブラウザビルドまたは `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright` を使用してください。

Chromium を `--enable-features=WebMCP` で起動すると、ページは `webmcp_*` ツールを宣言できます。ブリッジは `notifications/tools/list_changed` を転送して `tools/list` キャッシュ全体を消去し、クライアントは一覧を再取得する必要があります。Streamable HTTP では、該当セッションで開いている通知ストリームだけがイベントを受信します。ストリームがなくても次の `tools/list` は最新です。名前、説明、schema、annotations、output はすべて信頼できないページデータとして扱ってください。ブリッジは WebMCP を自動的に有効化しません。`PLAYWRIGHT_MCP_WEBMCP=false` で収集を無効化できます。

## ローカルツール

### `cloakbrowser_binary_info`

CloakBrowser パッケージ、現在のプラットフォーム、キャッシュディレクトリ、期待されるバイナリパス、インストール状態、ブリッジが使用する resolved executable path に関する構造化情報を返します。

### `cloakbrowser_bridge_info`

構造化されたブリッジメタデータを返します：

アドイン `structuredContent.cdp` オブジェクトは、呼び出し元セッションの管理された CDP を報告します
州:

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

ブラウザを交換した後、`generation`は増加し、`discoveryUrl`は回転します。
`activeConnections`は、公開せずに承認されたプロキシ接続WebSocketの数をカウントします
クライアントの識別情報、ターゲットID、またはプロトコルの内容。すべての非ヌルの検出URLを扱う
資格として

CDP対応クライアントでURLの発見を使用する:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

管理された CDP は Playwright サーバープロトコルではありません。Playwright
`chromium.connect()`と現在のOpen WebUI `PLAYWRIGHT_WS_URL`統合の予想
Playwrightサーバーのエンドポイントであり、これはURLとは互換性がありません。

- MCP server 名とバージョン；
- runtime モード；
- upstream Playwright MCP パッケージとバージョン；
- upstream ツール数；
- ローカル Cloak-specific ツール名。

ローカルのツール表面は引き続きこの 2 つの診断ツールに限定されます。
`SessionSeats` と `getSessionSeats` は、CloakBrowser 0.5.10 がその API を
公開エントリポイントからエクスポートしていないため、MCP ツールとして公開
されません。

## 互換性

CI は Docker イメージをビルドし、`npm run bridge:compare` を実行します。このスクリプトは公式 Playwright MCP イメージと CloakBrowser ブリッジイメージを並行して起動し、upstream ツール一覧を比較し、同じ fixture ページで既定の upstream ブラウザーツールを実行します。

機械可読な JSON レポートを書き込むには `--report` を使用します：

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI はこのレポートを Docker ビルドとリリースビルドの artifact としてアップロードします。
