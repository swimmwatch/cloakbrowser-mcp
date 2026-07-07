---
description: CloakBrowser MCP Docker イメージを実行し、永続的な /data プロファイル、拡張機能マウント、CloakBrowser による再現性のある Playwright MCP ブラウザー自動化を実現します。
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

掲載されている画像は、MCPを安定して繰り返し使用するための推奨実行環境です。

## 実行

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

アーティファクトは、コンテナ内の `/data` に書き込まれます。このパスをマウントして、スクリーンショット、スナップショット、ダウンロードしたファイル、およびネットワーク出力を保存してください。

`--init` の使用が推奨されます。これは、ブラウザの自動化処理によって短命な子プロセスが生成される可能性があるためです。Docker の init プロセスは、これらの子プロセスを適切にクリーンアップします。

同じリリースタグが、Docker Hub には `swimmwatch/cloakbrowser-mcp`という形式で公開され、GHCRには`ghcr.io/swimmwatch/cloakbrowser-mcp`という形式で公開されます。

## 永続プロファイル

Docker はデフォルトでは永続的なブラウザプロファイルを有効にしません。cookie、
ローカルストレージ、キャッシュ、または拡張機能の状態をコンテナ再起動後も保持したい場合は、
既存の `/data` ボリュームを永続化ルートとして使用してください：

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker 内の環境変数には、ホストパスではなく `/data/profiles/default` のような
コンテナパスを使用する必要があります。ブリッジはプロファイルディレクトリが存在しない場合に
作成し、書き込み可能であることを確認し、コンテナパスを生成済みの Playwright MCP
設定に書き込み、1 つのサーバープロセス内で重複するアクティブなプロファイルディレクトリを拒否します。

## Chrome 拡張機能

Chrome 拡張機能には永続プロファイルが必要で、個別にマウントする必要があります。
環境変数にはホストパスではなくコンテナパスを使用してください。
拡張機能のマウントは読み取り専用にできます：

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

パスにカンマが含まれる場合、または複数の拡張機能ディレクトリを渡す場合は、
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` に JSON 配列を使用してください。
拡張機能ファイルまたは拡張機能パスを変更した後は、コンテナを再起動してください。

## ストリーム可能なHTTP

ローカルでの Streamable HTTP を使用する場合は、コンテナのポートをループバックで公開してください：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

コンテナから直接HTTPSにアクセスするには、証明書ファイルをマウントし、「HTTPS」を選択してください：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

ホスト側の `127.0.0.1:3000` バインドは、エンドポイントをローカルに保持します。 非ループバックインターフェースで Streamable HTTP を公開する場合、HTTPS と認証を使用するか、認証およびネットワーク制御機能を備えた信頼できる TLS ターミネーション型リバースプロキシの背後にサーバーを配置してください。
Streamable HTTP は、固定の `GET /healthz` および `GET /readyz` プローブを公開します。 `--http-auth-token` または `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` が設定されている場合、プローブには MCP リクエストと同じ `Authorization: Bearer ...` ヘッダーが必要です。
すべての HTTP トランスポートフラグおよび環境変数については、生成された [CLI リファレンス](generated/cli.md) を参照してください。

## GeoIPプロキシの照合

Docker は npm と同じプロキシおよび GeoIP 環境変数を使用します。地域ごとの QA において、CloakBrowser のタイムゾーン、言語、および
ロケールのフィンガープリントを設定されたプロキシの場所に合わせる必要がある場合は、
GeoIP プロキシのマッチングを有効にしてください：

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

認証が必要なプロキシの場合は、プロキシのURLに認証情報を埋め込み、ユーザー名やパスワードに含まれる特殊文字をパーセントエンコードしてください。

コンテナが Streamable HTTP を実行している場合、クライアントは `initialize` メタデータを通じて、MCP セッションごとに異なる
プロキシを選択することもできます。
[GeoIP プロキシのマッチング](geoip-proxy-matching.md) を参照して、実行時のプロキシメタデータ、
マルチリージョンでのユースケース、および制限事項について確認してください。

## デフォルト設定

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## MCP クライアント設定

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "--init",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## ローカルでビルドする

```bash
npm run docker:build
npm run docker:smoke
```

この Dockerfile では、ピン留めされた公式の Playwright MCP イメージをランタイムのベースとして使用し、ビルド中に利用可能な Debian のセキュリティ更新を適用し、ランタイムイメージから未使用のグローバル npm ペイロードを削除し、`/opt/cloakbrowser-mcp`の下にブリッジをインストールします。

このリリースワークフローでは、SBOMおよび出所証明を公開し、ソース、リビジョン、バージョン、ライセンス、ベースイメージ名、ベースイメージのダイジェストに関するOCIラベルを含め、公開前にTrivyを使用してビルド済みイメージをスキャンします。

## 追加の実用パス

upstream Playwright MCP とこのパッケージのどちらを使うかは[比較](comparison.md)を参照してください。短い作業手順には[レシピ](recipes/index.md)を使います: 永続プロファイル、拡張機能、reverse proxy、リージョン QA、Claude Desktop、Codex CLI、CI スモークテスト。
