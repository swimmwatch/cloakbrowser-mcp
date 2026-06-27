---
description: Playwright MCPブリッジのランタイム設定。これには、ストリーム可能なHTTPセッション、GeoIP対応のプロキシマッチング、および人間らしい入力挙動が含まれます。
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# 設定

Playwright MCP の動作には、アップストリームの `PLAYWRIGHT_MCP_*` 変数を使用してください。 `CLOAK_PLAYWRIGHT_MCP_*` は、Cloak 固有のブリッジ動作にのみ使用してください。

旧式の `CLOAKBROWSER_MCP_*` 変数はサポートされていません。
生成された [CLI リファレンス](generated/cli.md) は、ブリッジ CLI フラグとそれに対応する環境変数の公式リストです。

## ブリッジのオプション

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## GeoIPプロキシのマッチング

`CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` を `PLAYWRIGHT_MCP_PROXY_SERVER` と設定し、
を組み合わせることで、プロキシの場所からCloakBrowserのタイムゾーン、言語、ロケールのフィンガープリントフラグを導出します。
このブリッジは、プロキシルーティングをアップストリームのPlaywright
MCPに委任されたままにし、解決された `--fingerprint-timezone`、`--lang`、および
`--fingerprint-locale` といった解決済みの起動フラグのみを注入します。

設定例、実行時の
ストリーム可能なHTTPプロキシメタデータ、ユースケース、優先順位ルール、および制限事項については、[GeoIPプロキシのマッチング](geoip-proxy-matching.md)を参照してください。

## 人間らしい入力行動

`CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` を設定すると、CloakBrowser の
人間のようなマウス、キーボード、スクロールレイヤーがページ操作に使用できるようになります。 この設定は、
Playwright MCPのページ初期化フックを通じて適用されるため、上流のブラウザツールの
スキーマに変更は生じません。

設定例、
実行時の Streamable HTTP メタデータ、ユースケース、および制限事項については、[Humanized Input Behavior](humanized-input-behavior.md) を参照してください。

## ストリーミング可能なHTTPランタイムメタデータ

ストリーミング対応のHTTPクライアントは、`initialize` リクエストにブリッジ固有のメタデータを追加することで、MCPセッションごとに特定のランタイムオプションを選択できます：

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`proxyServer` は、その HTTP セッションにおいて `PLAYWRIGHT_MCP_PROXY_SERVER` を上書きします。
`proxyBypass` は、`PLAYWRIGHT_MCP_PROXY_BYPASS` を上書きするのは、`proxyServer` が
存在する場合に限られます。 `geoipProxyMatch` を使用すると、MCP サーバーを再起動することなく、そのセッションの GeoIP マッチングを有効または無効に
できます。既存のセッションは起動時のプロキシを維持します。
ロケーションを切り替えるには、新しい HTTP セッションを作成してください。

`humanize` は、他のセッションに影響を与えることなく、そのセッションにおける人間らしい入力動作を有効または無効にすることができます。 `humanPreset` を使用すると、そのセッションに対して `default` または `careful`
を選択できますが、それ自体ではヒューマナイズド動作を有効にはしません。 既存の
セッションは、`initialize`の間に記録された挙動を維持します。

`headless` を使用すると、そのセッションのヘッドレスブラウザモードを有効または無効にできます。 `headless` を `false` に設定するには、特に
DockerやLinuxサーバーでの展開において、特に重要です。

認証済みHTTPプロキシの認証情報は、`proxyServer`に埋め込むことができます。
例えば、`http://user:pass@proxy.example:8080` などです。`@`、
`:`、`/` など、URL 上で意味を持つ認証情報の文字はパーセントエンコードしてください。 `:`、`/`、 `?`, `#`、および `%`。

複数拠点のQAパターンについては、[GeoIPプロキシマッチング](geoip-proxy-matching.md)を参照してください。
インタラクションのリアリズムに関するパターンについては、[Humanized Input Behavior](humanized-input-behavior.md)を参照してください。

## 上流のオプション

このブリッジは、`PLAYWRIGHT_MCP_*` の設定をアップストリームの Playwright MCP に転送します。これには、次のようなアップストリームオプションが含まれます：

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_USER_DATA_DIR`

アップストリームのオプションの全一覧については、Playwright MCPのアップストリームドキュメントを参照してください。

## ログ記録

Streamable HTTP モードでは、人間が読み取れる形式の起動ログおよびリクエストログが stdout に出力されます。Stdio モードでは、通常の動作ログは出力されないため、MCP JSON-RPC の stdout はプロトコルに準拠した状態が保たれます。CLI の起動時に発生した致命的なエラーは、引き続き stderr に出力されます。

## HTTPS

Streamable HTTP は、デフォルトでローカル HTTP を使用します。`--http-protocol https` または `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` を使用してダイレクト TLS を選択し、証明書/鍵ペアまたは PFX ファイルのいずれかを指定してください:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

外部またはループバック以外の環境に公開する場合は、HTTPS に `--http-auth-token` を追加するか、認証およびネットワークアクセス制御も実施する信頼できるリバースプロキシで TLS を終了させてください。

## ストリーム可能なHTTPセッション

各Streamable HTTP MCPセッションは、独自のブリッジランタイムと上流のPlaywright MCP子プロセスを所有しています。HTTPセッションでは、上流のPlaywright MCPが隔離されたブラウザプロファイルで実行されるため、同時接続中のユーザーが同じ永続的なChromiumプロファイルを競合して使用することはありません。 組み込みの `memory` セッションバックエンドは、セッション ID、タイムスタンプ、有効期限、ステータスなどのメタデータのみを保存します。 ブラウザの状態は稼働中のアップストリーム子プロセスに残り、アーティファクトは引き続き `PLAYWRIGHT_MCP_OUTPUT_DIR` によって管理されます。

水平スケーリングを行うには、`mcp-session-id` ヘッダーをキーとするスティッキーセッションを設定し、ロードバランサーの背後で複数のサーバーレプリカを実行します。 将来的にRedis、Postgres、またはSQLiteのバックエンドが導入された場合、メタデータやロックの調整は可能ですが、セッションを所有するプロセスが終了した後、稼働中のブラウザセッションを復元することはできません。

## ストリーミング可能なHTTPプローブ

ブリッジが `--transport streamable-http` で動作している場合、MCPエンドポイントと同じホストおよびポート上に固定のプローブエンドポイントを公開します：

- `GET /healthz` は、プロセスの健全性に関するメタデータを返します： `status`、`version`、 `transport`、および `uptimeMs`。
- `GET /readyz` は、稼働状態のメタデータとセッション容量を返します： `sessions.active`、`sessions.pending`、 `sessions.max`、および `sessions.available`。

Readiness returns HTTP `200` while session capacity is available and HTTP `503` when `active + pending >= max`.
`--http-auth-token` または `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` が設定されている場合、両方のプローブは、MCP リクエストと同様に `Authorization: Bearer ...` ヘッダーを必要とします。 認証トークンがない場合、プローブは設定されたHTTPバインドアドレスで公開されます。
