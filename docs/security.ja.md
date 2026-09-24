---
description: CloakBrowser MCP、Docker 分離、artifact、secret、ネットワーク公開に関するセキュリティモデルとブラウザー自動化リスクのガイド。
icon: material/shield-lock
tags:
  - セキュリティ
  - ユーザーガイド
---

# セキュリティ

このプロジェクトはブラウザー自動化ブリッジです。信頼済みコードを実行するインフラとして扱ってください。

## 管理された CDP セキュリティ { #managed-cdp-security }

管理された CDP はデフォルトで無効になっています。これは任意の Chromium DevTools 制御を提供します、
簡略化されたブラウザーツールAPIではありません。信頼できるクライアントのみに有効にしてください。その機能は
`cloakbrowser_bridge_info.cdp.discoveryUrl` はベアラー認証情報です：記録しないでください、
それをチケットに保存するか、セッション間で共有します。ブラウザを交換すると回転します
そして古いURLは決して置き換え世代に移動しません。

ループバックでない CDP バインドには、`--cdp-allow-remote` と具体的に広告されたものの両方が必要です
ホスト。公開されたポートの周りにネットワークアクセス制御を追加します。選択中
`--cdp-advertised-scheme https` は TLS を提供しません。管理されたリスナーと
Chromium ホップは平文のままにする; オペレーター所有の同一ポート TLS ターミネーターは保持する必要がある
宣伝されている `Host` および `Origin` の権限と、それへの一対一のルーティングを維持する
セッションを所有すること。

実行時のログには、能力パス、ターゲットID、CDPペイロード、ブラウザデータは一切含まれません、
クッキー、生の `Host` または `Origin` の値、またはプロファイルパス。拒否されたセキュリティチェックは
60秒でセッションスコープの`cdp_security_rejections`警告としてのみ報告された
`capability`、`host`、`origin`のカウントを飽和させる; クリーンアップは残っているものをフラッシュする
カウントします。成功したチェックは、リクエストごとの監査記録を作成しません。

### 固定された制限

制限は、CDP対応の各MCPセッションに個別に適用されます:

| 境界 | 制限 |
| --- | --- |
| 進行中のハンドシェイクを含む、アクティブなプロキシ経由のWebSocket接続 | 8 |
| 同時事前アップグレード HTTP リクエスト | 16 |
| リクエストヘッダー | 16キロバイト |
| サポートされているルート上のリクエストボディ | 許可されていません |
| バッファリングされた Chromium HTTP 応答 | 4 MiB |
| 受信または送信のWebSocketメッセージ | 16 MiB |
| 方向ごとに送信されていないWebSocketデータをキューに登録しました | 16 MiB |
| リクエストヘッダー、アップストリーム HTTP レスポンス、または WebSocket ハンドシェイク | 10秒 |
| 強制終了前の優雅なプロキシシャットダウン | 5秒 |
| ローカルエラー応答本文 | 8キロバイト |

### HTTP エラー

ローカルの障害は JSON `{"error":{"code":"...","message":"..."}}` を使用します
`Cache-Control: no-store`、`Content-Type: application/json; charset=utf-8`、そして1つの
正確な `Content-Length`。方法の失敗には `Allow` も含まれます。安定したマッピングは次の通りです:

| ステータス | コード |
| --- | --- |
| `400` | `bad_request` |
| `403` | `forbidden` |
| `404` | `not_found` |
| `405` | `method_not_allowed` |
| `408` | `request_timeout` |
| `413` | `payload_too_large` |
| `431` | `headers_too_large` |
| `500` | `internal_error` |
| `502` | `bad_gateway` |
| `503` | `unavailable` |
| `504` | `gateway_timeout` |
| Chromium `400..499` | `upstream_error`、現状を維持すること |

Chromium はリダイレクト、サーバーエラー、不正な応答、および通信障害です
Chromium の応答本文を公開する代わりに正規化されます。ブリッジ生成の拒否
アップストリームディスパッチの前にはChromiumの副作用はありません。読み取り専用のディスカバリ要求は可能です
条件を修正した後で再試行してください。不明確な状態変更の失敗の場合、
`/json/list`を再読してアプリケーションの状態を調整すること；`Retry-After`を前提としないこと
自動冪等性

### WebSocket が閉じます

ローカルで生成されたクローズは固定された編集済みペアを使用します。有効なピアクローズは中継されます。

| コード | 理由 | 使う |
| --- | --- | --- |
| `1001` | `going_away` | セッション、世代、またはプロキシのシャットダウン |
| `1002` | `protocol_error` | 不正な WebSocket プロトコル入力 |
| `1009` | `message_too_big` | メッセージが設定された制限を超えています |
| `1011` | `internal_error` | 予期しない上流の切断またはリレーの故障 |
| `1013` | `try_again_later` | 方向ごとの未送信キュー制限を超えました |

## 信頼境界

外側のサーバーは stdio と Streamable HTTP をサポートします。upstream Playwright MCP を子プロセスとして起動し、ツール呼び出しを転送します。ブラウザー自動化、ファイル出力、ネットワークアクセス、安全でない評価の挙動は upstream Playwright MCP によって決まります。

stdio サーバーを認証なしのネットワークラッパー経由で公開しないでください。ツールを呼び出せるクライアントは、ブラウザーを操作し、ブラウザーから見えるページデータを読み取り、artifact を要求できます。

Streamable HTTP は既定でローカルクライアント向けに `127.0.0.1` へ HTTP で bind します。`0.0.0.0` に bind したり loopback の外へ公開したりする場合は、`CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` または同等の reverse proxy 認証を必須にし、`CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` と TLS ファイルで直接 HTTPS を使うか、信頼できるネットワーク境界で TLS を終端し、信頼済みクライアントにアクセスを制限してください。

## 安全でないツール

Upstream Playwright MCP には `browser_evaluate` や `browser_run_code_unsafe` などのツールがあります。これらはブラウザーまたは Playwright server context で JavaScript を実行できます。このサーバーは信頼できる MCP クライアントにのみ接続してください。

`webmcp_*` ツールは現在のページが定義します。名前、説明、schema、annotations、output は信頼できないデータとして扱ってください。ブリッジはそのまま転送します。不要な場合は `PLAYWRIGHT_MCP_WEBMCP=false` を設定してください。

## Playwright Extension token

`PLAYWRIGHT_MCP_EXTENSION_TOKEN` はプロセス環境またはシークレットマネージャーからだけ渡してください。ブリッジは HTTP metadata の token を受け付けず、config、bridge metadata、ログ、エラー、diagnostic snapshots に書き込みません。persistent profile を保護し、複数セッションで同じアクティブな `userDataDir` を再利用しないでください。

## 設定

アクセス制御とガードレールには upstream オプションを使用します：

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

これらは便利なガードレールですが、プロセス、コンテナ、ネットワーク、ファイルシステムの分離の代わりにはなりません。

可能な場合は信頼済みターゲットに allowlist を使用してください。無制限のファイルアクセスと secrets ファイルは機密能力として扱い、共有 MCP クライアントプロファイルには含めないでください。

## Sandbox モード

Docker イメージは既定で `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true` を使用します。コンテナ化された CI と MCP runtime ではブラウザー sandboxing が利用できないことが多いためです。これは互換性上の妥協です。ホストとコンテナ runtime が Chromium sandboxing をサポートする場合は、次を設定してください：

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

Chromium sandbox なしで実行する場合は、Docker または別のプロセス分離境界を使い、広いホストディレクトリの mount を避けてください。

## Artifact と secret

スクリーンショット、snapshot、download、ネットワークログ、コンソールログ、trace には認証情報や非公開ページ内容が含まれる可能性があります。必要な artifact ディレクトリだけを mount し、使用後に削除し、artifact bundle を公開しないでください。

MCP クライアントがブラウザーセッションへ認証情報を注入する場合は、対象サイトに限定された短命の認証情報を優先してください。長期 token をスクリーンショット、ネットワーク応答、永続ブラウザープロファイルに残さないでください。

## Docker

Docker は分離と再現可能なブラウザー依存関係のために推奨されます。必要な成果物ディレクトリだけをマウントしてください。イメージにはすでに Tini が含まれており、ブラウザーの子プロセスを適切に回収します。強化された読み取り専用コンテナーでは `/data` をマウントしたままにし、headed セッションがあり得る場合は `/tmp` と `/tmp/.X11-unix` に書き込み可能な一時マウントを用意してください。


Docker から Streamable HTTP を公開する場合は、`-p 127.0.0.1:3000:3000` を推奨します。公開インターフェースへ直接公開すると、認証とネットワーク制御を追加しない限り、到達可能な任意のクライアントがブラウザー自動化能力を得ます。

Docker イメージは CI と release 公開前に Trivy で scan されます。scanner は high と critical の OS/ライブラリ脆弱性を確認し、有効な場合は SARIF 結果を GitHub code scanning へ upload します。

## Supply chain チェック

このリポジトリは無料の GitHub-native および open source チェックを使用します：

- JavaScript と TypeScript の静的解析に CodeQL。
- Pull request の依存関係変更に Dependency Review。
- runtime npm 依存関係に `npm audit --omit=dev --audit-level=high`。
- リポジトリ supply-chain signal に OpenSSF Scorecard。
- GitHub Actions の security linting に zizmor。
- Docker イメージの脆弱性 scan に Trivy。

これらのチェックは、ブラウザー自動化挙動や release 変更の手動レビューを置き換えるものではありません。

## 報告

脆弱性は [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md) で報告してください。
