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

Playwright MCP `@playwright/mcp@0.0.83` の安定した参照先は、そのパッケージのコミットに固定した能力テストです：[既定のツールと能力別のツール](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74)。現在のツール一覧はインストール済みの依存関係が定義します。

このプロジェクトは upstream Playwright MCP を権威ある情報源として扱い、schema 参照のコピーは保守しません。

既定のセットには `browser_emulate_media` を含む 25 個の upstream ツールがあります。
`PLAYWRIGHT_MCP_CAPS=devtools` はブリッジの `--caps` オプションなしで
`devtools` 機能を子プロセスへ渡します。結果の upstream ツールとスキーマは
変更せずに転送され、`browser_start_recording` と
`browser_stop_recording` も含まれます。

!!! warning "公開 CloakBrowser v146 バイナリでの記録制限"
    記録ツールは利用できますが、キー不要の公開 Chromium 146 バイナリは、ステルス性を保つため Playwright のページからホストへのバインディングを意図的に無効化します。そのため `browser_stop_recording` が返すコードは不完全になる場合があります。ナビゲーションは記録されますが、成功した入力やクリックは省略されます。生成された記録は再利用前に確認してください。

    明示的に有効化する互換性対応は [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532) で追跡されています。
    基盤となるバインディングの判断については
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) と
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176) で議論されています。

### 動的 WebMCP ツール

WebMCP のサポートは、選択したブラウザビルドと有効な機能に依存します。インストール済みの Playwright MCP は `getTools()` メソッドを持つ `document.modelContext` または `navigator.modelContext` を必要とします。WebMCP が必要な場合は、互換性のある CloakBrowser ビルドまたは `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright` を使用してください。

[Chrome の WebMCP ドキュメント](https://developer.chrome.com/docs/ai/webmcp)では、Chrome 149 以降の origin trial、ローカルテスト用フラグ、ヘッドレスモードの制限を説明しています。Chromium のバージョン番号だけでは、Playwright MCP が期待する API との互換性は保証されません。

Chromium を `--enable-features=WebMCP` で起動すると、Playwright MCP はページが開いている間、ページが提供する `webmcp_*` ツールを追加できます。これらのツールは動的です。ブリッジは `tools.listChanged` の対応を通知し、上流から `notifications/tools/list_changed` を受け取ると、ページ分割されたツール一覧のキャッシュ全体を無効化して、該当する MCP クライアントへ通知を転送します。クライアントはこの通知を監視し、`tools/list` を再度呼び出してください。Streamable HTTP クライアントが通知を受け取れるのは、そのセッションの通知ストリームが開いている間だけです。ストリームが開いていなかった場合でも、次の `tools/list` は最新の一覧を返します。

動的ツールは、それを検出した MCP セッションと、現在の管理対象 CDP ブラウザ世代にのみ属します。名前、説明、スキーマ、注釈、出力は信頼できないページコンテンツであり、ブリッジは書き換えずに転送します。呼び出す前に内容を確認してください。`PLAYWRIGHT_MCP_WEBMCP=false` を設定すると収集を無効にできます。ブリッジが Chromium WebMCP を自動的に有効にすることはありません。

## ローカルツール

### `cloakbrowser_binary_info`

CloakBrowser パッケージ、現在のプラットフォーム、キャッシュディレクトリ、期待されるバイナリパス、インストール状態、ブリッジが使用する resolved executable path に関する構造化情報を返します。

### `cloakbrowser_bridge_info`

構造化されたブリッジメタデータを返します：

- MCP サーバーの名前とバージョン；
- 実行モード；
- 上流 Playwright MCP のパッケージとバージョン；
- 上流ツールの数；
- ローカルの Cloak 固有ツールの名前。

追加の `structuredContent.cdp` オブジェクトは、呼び出し元セッションの管理対象 CDP の状態を報告します：

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

ブラウザの置き換え後、`generation` が増加し、`discoveryUrl` が更新されます。
`activeConnections` は受け付けたプロキシ WebSocket 接続数を示し、クライアントの識別情報、ターゲット ID、プロトコルの内容は公開しません。null でないすべての検出 URL をアクセス資格情報として扱ってください。

検出 URL を CDP 対応クライアントで使用します：

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

管理対象 CDP は Playwright Server プロトコルではありません。Playwright の `chromium.connect()` と現在の Open WebUI の `PLAYWRIGHT_WS_URL` 連携は Playwright Server エンドポイントを必要とするため、この URL とは互換性がありません。

固定されたバージョンの Playwright クライアントでは、`connectOverCDP()` が返したブラウザに対する `browser.close()` は、そのクライアントを切断するだけで、Chromium と現在のブラウザ世代は準備完了の状態を維持することが確認されています。これは当該クライアントでの観測結果であり、他の CDP ライブラリの動作を保証するものではありません。CDP の `Browser.close` を直接送信する操作は破壊的です。共有する Chromium の現在の世代を終了し、アクセス資格情報を無効化して、MCP の呼び出し元にも影響します。ブリッジは競合するナビゲーション、ページの終了、入力、ストレージの変更を直列化しないため、MCP と CDP の操作を調整してください。

ローカルツールは、この 2 つの診断ツールに限られます。サポート対象の CloakBrowser 公開エントリポイントが該当 API をエクスポートしないため、`SessionSeats` と `getSessionSeats` は MCP ツールとして公開されません。

## 互換性

CI は Docker イメージをビルドし、`npm run bridge:compare` を実行します。このスクリプトは公式 Playwright MCP イメージと CloakBrowser ブリッジイメージを並行して起動し、upstream ツール一覧を比較し、同じ fixture ページで既定の upstream ブラウザーツールを実行します。

機械可読な JSON レポートを書き込むには `--report` を使用します：

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI はこのレポートを Docker ビルドとリリースビルドの artifact としてアップロードします。
