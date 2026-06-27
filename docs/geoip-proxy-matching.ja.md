---
title: GeoIP プロキシのマッチング
description: CloakBrowserのタイムゾーン、言語、ロケールのフィンガープリントを、設定されたプロキシのロケーションと照合し、地域ごとのQAおよびStreamable HTTPセッションを実現します。
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# GeoIPプロキシの照合

GeoIPプロキシのマッチング機能により、ブラウザのフィンガープリント設定が、
上流のPlaywright MCPで使用されているプロキシの所在地と整合するようになります。これは、地域ごとのQAにおいて、
一貫したプロキシ、タイムゾーン、言語、ロケールプロファイルが求められる場合に役立ちます。

このブリッジ自体は、プロキシトラフィックを作成したりルーティングしたりすることはありません。プロキシのルーティングは、
`PLAYWRIGHT_MCP_PROXY_SERVER` を通じて、上流の Playwright MCP が引き続き管理します。 マッチングが
有効になっている場合、CloakBrowser MCP は設定されたプロキシのロケーションを解決し、
タイムゾーン、ブラウザの言語、および
フィンガープリントのロケールに合わせて、CloakBrowser の起動フラグを追加します。

## 変更点

`CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true`の場合、ブリッジはCloakBrowserに対して以下の
起動フラグを追加できます：

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`

これにより、ブラウザプロファイルがプロキシリージョンと内部的に整合性を持つようになります。
上流のPlaywright MCPツールのスキーマおよびブラウザツールは、
引き続き変更なしで転送されます。

## グローバル設定

stdio クライアントではプロセスレベルの環境変数を使用し、
Streamable HTTP セッションのデフォルトとしてもこれを使用します：

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

特定のホストがプロキシを経由しないようにするには、バイパスリストを追加します：

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

認証済みHTTPプロキシは、認証情報を
`PLAYWRIGHT_MCP_PROXY_SERVER`。認証情報に含まれる特殊文字をパーセントエンコードし、
たとえば、`p%40ssword` を `p@ssword` の代わりに使用します。

## Docker のセットアップ

同じ変数をコンテナに渡してください。プロキシの認証情報は、可能な限りシークレット
マネージャーまたはMCPクライアント環境に保管してください。

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker での Streamable HTTP については、通常通り HTTP ポートを公開し、プロキシ
変数はコンテナ環境のデフォルト設定のままにします：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## セッションごとのストリーミング対応HTTPプロキシ

ストリーム対応のHTTPクライアントは、MCPセッションの初期化時にプロキシを選択できます。
これにより、1つの長時間稼働するMCPサーバーが、再起動することなく、
さまざまな地域ごとのシナリオに対応できるようになります。

`initialize` リクエストでブリッジのメタデータを送信します：

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` は、その HTTP セッションにおいて `PLAYWRIGHT_MCP_PROXY_SERVER` よりも優先されます。
`proxyBypass` は、`PLAYWRIGHT_MCP_PROXY_BYPASS` よりも優先されます。ただし、`proxyServer` が
存在する場合に限ります。`proxyServer`が存在し、かつ`proxyBypass`が省略されている場合、そのセッションの継承された
プロキシバイパス設定はクリアされます。

`geoipProxyMatch` は、その HTTP
セッションにおけるプロセスレベルの GeoIP 設定を上書きします。`true` を使用すると、そのセッションのマッチングを有効にできます。また、`false` を使用すると、
サーバーがマッチングを有効にして起動された場合でも、マッチングを無効にできます。

既存のHTTPセッションは変更できません。別のプロキシやロケーションに切り替えるには、
別のStreamable HTTPセッションを作成してください。

`proxyServer` に認証情報が含まれている場合は、それらを URL エンコードした状態で保持し、その値を
プロジェクトファイルにコミットするのではなく、シークレットやクライアントの実行時設定を通じて
渡してください。

## ユースケース

<div class="grid cards" markdown>

- :material-cart-check: **ローカライズされたコマース QA**

  チェックアウト、税、配送メッセージ、通貨、地域別カタログルールを、
  プロキシ位置に合わせたブラウザーのタイムゾーンとロケールでテストします。

- :material-web: **地域別ランディングページ**

  訪問者の地域に依存する言語、同意、キャンペーン、コンテンツバリエーションを検証します。

- :material-lifebuoy: **カスタマーサポートの再現**

  プロキシ位置ごとに MCP サーバー全体を再起動せず、顧客地域からの報告を再現します。

- :material-clock-check: **タイムゾーンに敏感なフロー**

  タイムゾーンとロケールがネットワーク地域と一致する必要がある日付選択、予約枠、リマインダー、スケジュールページを検証します。

- :material-source-branch-sync: **並列地域セッション**

  異なるプロキシで個別の Streamable HTTP セッションを実行し、1 つのサーバープロセスで複数地域を比較できるようにします。

</div>

## 優先順位と制限

| 領域 | 動作 |
| --- | --- |
| Stdio | プロセスレベルの環境変数と CLI フラグのみを使用します。 |
| Streamable HTTP の既定値 | runtime メタデータが指定されていない場合、プロセスレベルの環境変数と CLI フラグを使用します。 |
| Streamable HTTP メタデータ | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` は、1 セッションのプロキシと GeoIP 照合を上書きできます。 |
| 既存セッション | `initialize` 中に取得されたプロキシと GeoIP 設定を保持します。 |
| プロキシルーティング | upstream Playwright MCP に委譲されたままです。 |
| Browser geolocation API | この機能では設定されません。CloakBrowser のタイムゾーン、言語、locale fingerprint flags のみを合わせます。 |

GeoIPの位置情報は概算であり、プロキシのIPアドレスおよびCloakBrowserの
GeoIPデータベースに依存します。CloakBrowserは、初回
使用時に必要に応じて、そのオフラインデータベースをダウンロードしてキャッシュします。

この機能は、正当な品質保証（QA）、ローカライズ、および環境の一貫性
テストのために使用してください。アクセス制御や地域
ポリシーのチェックを回避する手段として扱ってはなりません。

## 関連する設定

- [設定](configuration.md) には、すべてのブリッジおよびアップストリームの環境変数が記載されています。
- [Docker](docker.md) では、コンテナランタイムのデフォルト設定と Streamable HTTP パブリッシングについて解説しています。
- [ツール](tools.md) では、アップストリームの Playwright MCP ブラウザツールが変更されずに転送される理由について説明しています。
