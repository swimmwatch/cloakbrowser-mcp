---
description: CloakBrowser MCP Docker イメージを実行し、永続的な /data プロファイル、拡張機能マウント、CloakBrowser による再現性のある Playwright MCP ブラウザー自動化を実現します。
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

掲載されている画像は、MCPを安定して繰り返し使用するための推奨実行環境です。

稼働中の HTTP サーバーを TLS と認証の背後に配置する短い手順は、[Docker Streamable HTTP のリバースプロキシレシピ](recipes/docker-streamable-http-reverse-proxy.md)を参照してください。

## 実行

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

アーティファクトは、コンテナ内の `/data` に書き込まれます。このパスをマウントして、スクリーンショット、スナップショット、ダウンロードしたファイル、およびネットワーク出力を保存してください。

イメージはすでに Tini を PID 1 および subreaper として実行しているため、通常のコマンドに追加の Docker init プロセスは不要です。

同じリリースタグが、Docker Hub には `swimmwatch/cloakbrowser-mcp`という形式で公開され、GHCRには`ghcr.io/swimmwatch/cloakbrowser-mcp`という形式で公開されます。

## ヘッドありセッションと仮想ディスプレイ { #headed-sessions-and-virtual-display }

イメージの既定値は `PLAYWRIGHT_MCP_HEADLESS=true` で、ヘッドレスセッションは Xvfb を起動しません。セッションが `headless: false` を要求すると、ランチャーは必要に応じてコンテナ専用の Xvfb ディスプレイを 1 つ起動し、利用可能になるまで待機して、コンテナ終了まで維持します。同時実行のヘッドあり HTTP セッションはこのディスプレイを共有しますが、Playwright のブラウザコンテキスト、ページ、プロファイル、成果物はそれぞれ分離されたままです。

ヘッドあり stdio セッションでは、標準の Playwright MCP 環境変数を設定します：

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

これは可視デスクトップや GUI ストリーミングサービスではありません。イメージは VNC、noVNC、RDP、ホストの X11 へのアクセス、ディスプレイのキャプチャを提供しません。ネイティブ X11 のフォーカス、クリップボード、ディスプレイのキャプチャをテナント間の隔離境界として扱わないでください。ランチャーは終了処理でディスプレイを停止します。起動失敗や MCP CLI の終了時にはコンテナも終了し、利用可能なブリッジを残しません。

このイメージ以外でも、ヘッドありブラウザには利用可能なディスプレイ環境が必要です。ディスプレイを利用できない場合は `PLAYWRIGHT_MCP_HEADLESS=true` を設定してください。

## コンテナのヘルスチェックと制限された実行環境 { #container-health-and-restricted-runtime }

Docker の `HEALTHCHECK` は専用の Unix ソケットを使い、MCP CLI のイベントループが応答することを能動的に確認します。Xvfb が起動済みの場合は X11 ディスプレイも確認します。ディスプレイを一度も要求していないヘッドレスコンテナは正常と判定されます。ディスプレイの起動中、終了中、障害時は異常と判定されます。X11 の応答待ちは最大 1 秒、CLI の応答待ちは 750 ミリ秒、内部ヘルスチェックリクエストは 2.5 秒に制限され、Docker は 1 回のヘルスチェックコマンドを 3 秒後に終了します。Docker の確認間隔は 2 秒で、再試行は 2 回です。そのため状態遷移は Docker のスケジューリングに依存し、可用性のサービスレベル目標ではありません。このチェックは公開 HTTP エンドポイントの `/healthz` と `/readyz` とは別で、MCP stdio 経由で通信しません。ブラウザ、MCP セッション、リモートサイトが利用できることを保証するものではありません。再起動と復旧は外部のオーケストレーターが担当します。

ランチャーは各子プロセスに `SIGTERM` を送信した後、終了を最大 8 秒待ちます。その後 `SIGKILL` を送信し、さらに最大 2 秒待ちます。Docker の停止タイムアウトには、CLI と Xvfb を順番に終了するための時間が必要です。イメージは root ではない `node` ユーザーで実行され、読み取り専用のルートファイルシステムでも動作できます。成果物用の `/data` をマウントし、ヘッドありセッションを使用する可能性がある場合は `/tmp` と `/tmp/.X11-unix` に書き込み可能な一時マウントを用意してください。ヘルスチェックソケットへのアクセスは所有者のみ許可されます（`0600`）。コンテナ内の X11 ソケットは `node` プロセスと Xvfb が共有するため、テナント間の隔離境界にはなりません。どちらのソケットもホストからマウントしたり、コンテナ間で共有したりしないでください。

## 永続プロファイル { #persistent-profiles }

Docker はデフォルトでは永続的なブラウザプロファイルを有効にしません。cookie、
ローカルストレージ、キャッシュ、または拡張機能の状態をコンテナ再起動後も保持したい場合は、
既存の `/data` ボリュームを永続化ルートとして使用してください：

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker 内の環境変数には、ホストパスではなく `/data/profiles/default` のような
コンテナパスを使用する必要があります。ブリッジはプロファイルディレクトリが存在しない場合に
作成し、書き込み可能であることを確認し、コンテナパスを生成済みの Playwright MCP
設定に書き込み、1 つのサーバープロセス内で重複するアクティブなプロファイルディレクトリを拒否します。

## CloakBrowser ライセンスキャッシュ

このイメージは、CloakBrowser のバイナリ、ライセンス状態、検証キャッシュを
`/home/node/.cloakbrowser` に保存します。コンテナを置き換えても GitHub
無料枠または Pro のログインを保持するには、ここに名前付きボリュームをマウントします。

```bash
docker volume create cloakbrowser-cache

docker run --rm -it \
  --entrypoint node \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  swimmwatch/cloakbrowser-mcp:latest \
  /opt/cloakbrowser-mcp/node_modules/cloakbrowser/dist/cli.js login

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

保存済みのログインを確認または削除するには、同じボリュームでアップストリームの
`info` または `logout` コマンドを使用します。代わりに、コンテナのシークレット管理
から `CLOAKBROWSER_LICENSE_KEY` を注入できます。ライセンスキーをイメージレイヤー、
バージョン管理に登録する Compose ファイル、またはビルド証拠として記録する
コマンド出力に含めないでください。

## カスタム CloakBrowser バイナリ

互換性のあるブラウザ実行ファイルをコンテナにマウントし、コンテナ内のパスを
`--binary-path`（または `CLOAKBROWSER_BINARY_PATH`）で渡します。

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/custom-chrome:/browser/chrome:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --binary-path /browser/chrome
```

このファイルはイメージの CPU アーキテクチャと互換性のある読み取り可能な Linux
実行ファイルであり、必要なライブラリがコンテナ内に存在する必要があります。この
パスはコンテナ内のすべての Streamable HTTP セッションに適用されます。異なる
ブラウザバイナリには別のコンテナを実行してください。

## Chrome 拡張機能 { #chrome-extensions }

Chrome 拡張機能には永続プロファイルが必要で、個別にマウントする必要があります。
環境変数にはホストパスではなくコンテナパスを使用してください。
拡張機能のマウントは読み取り専用にできます：

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

パスにカンマが含まれる場合、または複数の拡張機能ディレクトリを渡す場合は、
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` に JSON 配列を使用してください。
拡張機能ファイルまたは拡張機能パスを変更した後は、コンテナを再起動してください。

Playwright Extension 接続モードは、上記の展開済み拡張機能のマウントとは別です。persistent Chrome/Edge profile に公式拡張機能をインストールし、`PLAYWRIGHT_MCP_EXTENSION_TOKEN` を指定する必要があります。各 profile を別々の writable path にマウントし、token は secret manager から渡してください。`PLAYWRIGHT_MCP_EXTENSION=true` と `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` は併用しないでください。

## ストリーム可能なHTTP { #streamable-http }

ローカルでの Streamable HTTP を使用する場合は、コンテナのポートをループバックで公開してください：

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

ヘッドあり HTTP セッションでは、コンテナに `PLAYWRIGHT_MCP_HEADLESS=false` を設定します。個別の `initialize` リクエストでは、対応する MCP メタデータを使ってヘッドレスモードを選択できます。

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

コンテナから直接HTTPSにアクセスするには、証明書ファイルをマウントし、「HTTPS」を選択してください：

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

ホスト側の `127.0.0.1:3000` バインドは、エンドポイントをローカルに保持します。 非ループバックインターフェースで Streamable HTTP を公開する場合、HTTPS と認証を使用するか、認証およびネットワーク制御機能を備えた信頼できる TLS ターミネーション型リバースプロキシの背後にサーバーを配置してください。
Streamable HTTP は、固定の `GET /healthz` および `GET /readyz` プローブを公開します。 `--http-auth-token` または `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` が設定されている場合、プローブには MCP リクエストと同じ `Authorization: Bearer ...` ヘッダーが必要です。
すべての HTTP トランスポートフラグおよび環境変数については、生成された [CLI リファレンス](generated/cli.md) を参照してください。

## 管理された CDP { #managed-cdp }

構成された管理-CDP 範囲を一対一で公開します。この stdio の例では、一つを有効にします
セッションとすべてのホストポートをループバックにバインドしたままにします:

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

`--cdp-host 0.0.0.0`はDockerのポートフォワーディングに必要なので、明示的な
`--cdp-allow-remote`のオプトインと具体的な`--cdp-advertised-host`も必要です。
範囲を異なるホストポート番号に再マップしないでください: ディスカバリーURLには含まれています
リースされたポートと各公開ポートは、それぞれ所有するセッションに一対一でルーティングする必要があります。

マルチセッション Streamable HTTP の場合、プールを設定して公開しますが、次を設定しないでください
クライアントが個別にオプトインする場合のデフォルトの処理：

```bash
docker run --rm \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http \
  --http-host 0.0.0.0 \
  --http-port 3000 \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

`cdpEnabled: true`で認証された`initialize`リクエストは、1つの公開済みをリースします
ポート。省略された値はプロセスのデフォルトを継承します、一方で`cdpEnabled: false`
明示的にオプトアウトし、CDPポートを消費しません。プールの枯渇は新しいもののみを拒否します
CDP対応セッション；無効なセッションの容量を減らすことはありません。

`cloakbrowser_bridge_info`から能力を持つURLを読み取ります。それを入れないでください
コンテナのログまたはヘルスチェック。CDP API のようなものと接続します
`chromium.connectOverCDP()`；URLはPlaywrightと互換性がありません
`chromium.connect()` または現在の Open WebUI フロー。

`--cdp-advertised-scheme https` は公開された URL を `https`/`wss` に変更しますが、
ブリッジは、管理された CDP に対して TLS を提供しません。オペレーター所有の TLS ターミネーターを使用してください
外部ネットワーク名前空間で同じ宣伝されたポートを占有し、保持する
`Host`/`Origin`、そしてプレーンテキストブリッジリスナーに一対一で転送します。
bridge-to-Chromiumホップもプレーンテキストのループバックトラフィックとして残ります。

## GeoIPプロキシの照合 { #geoip-proxy-matching }

Docker は npm と同じプロキシおよび GeoIP 環境変数を使用します。地域ごとの QA において、CloakBrowser のタイムゾーン、言語、および
ロケールのフィンガープリントを設定されたプロキシの場所に合わせる必要がある場合は、
GeoIP プロキシのマッチングを有効にしてください：

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

認証が必要なプロキシの場合は、プロキシのURLに認証情報を埋め込み、ユーザー名やパスワードに含まれる特殊文字をパーセントエンコードしてください。

対応する CloakBrowser バイナリはネイティブの URL 内インラインプロキシ認証を
使用し、古いバイナリは Playwright のプロキシオブジェクトにフォールバックします。

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
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## ローカルでビルドする { #build-locally }

```bash
npm run docker:build
npm run docker:smoke
```

この Dockerfile では、ピン留めされた公式の Playwright MCP イメージをランタイムのベースとして使用し、ビルド中に利用可能な Debian のセキュリティ更新を適用し、ランタイムイメージから未使用のグローバル npm ペイロードを削除し、`/opt/cloakbrowser-mcp`の下にブリッジをインストールします。

このリリースワークフローでは、SBOMおよび出所証明を公開し、ソース、リビジョン、バージョン、ライセンス、ベースイメージ名、ベースイメージのダイジェストに関するOCIラベルを含め、公開前にTrivyを使用してビルド済みイメージをスキャンします。

## 追加の実用パス

upstream Playwright MCP とこのパッケージのどちらを使うかは[比較](comparison.md)を参照してください。短い作業手順には[レシピ](recipes/index.md)を使います: 永続プロファイル、拡張機能、reverse proxy、リージョン QA、Claude Desktop、Codex CLI、CI スモークテスト。
