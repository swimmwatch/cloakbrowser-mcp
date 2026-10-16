---
title: 人間らしい入力動作
description: インタラクションに敏感なQAおよびStreamable HTTPセッション向けに、CloakBrowserの人間のようなマウス、キーボード、スクロール動作を有効にします。
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# 人間らしい入力行動

人間らしい入力動作により、ページとのやり取りはCloakBrowserの
人間のようなマウス、キーボード、スクロールレイヤーを経由して行われます。これは、QAにおいて、
標準的な自動化機能よりもさらに現実的な操作ペース、ポインタの動き、タイピングのリズム、およびスクロール動作が
求められる場合に役立ちます。

このブリッジは、新しいブラウザツールを追加したり、上流のPlaywright MCPの
スキーマを変更したりすることはありません。Playwright MCPの
ページ初期化時にCloakBrowserのページ操作パッチを適用するため、既存のツールはこれまでと同じ入力で引き続き動作します。

## 変更点

`CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`の場合、CloakBrowserは次のような一般的なページ操作を
人間らしい操作に変換できます：

- マウスの動きとクリック；
- キーボードの入力とキーの押下；
- フォームへの入力とフィールドの切り替え；
- スクロールおよび要素へのスクロール動作。

これにより、インタラクションのタイミングや動作パターンに影響が生じます。ただし、ページの
コンテンツ、ネットワークのルーティング、プロキシ設定、およびブラウザの位置情報には影響しません。

## グローバル設定

すべての stdio セッションまたはデフォルトの Streamable HTTP
セッションで「ヒューマナイズド」な動作を採用したい場合は、環境変数を使用してください：

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

この設定は、明示的な CLI フラグを使用した場合にも機能します：

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## Docker のセットアップ

同じ環境変数をコンテナに渡します：

```bash
docker run --rm -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker での Streamable HTTP の場合、この環境変数が新しい HTTP セッションの
デフォルト設定となります：

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## セッションごとのストリーム対応HTTPの設定

ストリーミング対応のHTTPクライアントは、MCPセッションの
初期化時に「人間らしい」動作を選択できます。これにより、サーバーを再起動することなく、
標準的な動作と「人間らしい」動作を比較することが可能になります。

`initialize` リクエストでブリッジのメタデータを送信します：

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`humanize` は、その HTTP セッションに対するプロセスレベルの設定を上書きします。 `true` を使用して人間らしい動作を有効にするか、`false` を使用すると、
サーバーが `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` で起動された場合でも、この動作を無効にできます。

`humanPreset` は、`default` または `careful` を受け入れ、そのセッションに対して CloakBrowser のヒューマン
ビヘイビアプリセットを選択します。 これだけでは人間らしい挙動は有効になりません
。 `humanize: true` を設定するか、`CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` を有効にする必要があります。
`careful`プリセットは、`default`よりも動作が遅く、より慎重です。

既存のHTTPセッションは変更できません。標準の動作と人間らしい動作を切り替えるには、
別のStreamable HTTPセッションを作成してください。

## ユースケース

<div class="grid cards" markdown>

- :material-form-textbox: **フォーム QA**

  より現実的なキーボード cadence で、入力、入力補完、フォーカス変更、検証フローを確認します。

- :material-cart-check: **チェックアウトフロー**

  入力、クリック、フィールド切り替えの timing がクライアント側検証に影響する、
  操作の多い購入経路をテストします。

- :material-shield-search: **操作に敏感な UI チェック**

  ページが非常に速い入力や完全に直線的な入力に異なる反応を示す場合、
  標準自動化と人間らしい操作を比較します。

- :material-mouse-scroll-wheel: **スクロール中心のページ**

  より滑らかなスクロール動作で、長いページ、フィード、商品リスト、lazy-loading コンテンツを検証します。

- :material-presentation-play: **デモと録画**

  product demo、walkthrough、録画された QA 証跡で、機械的に見えにくいブラウザーセッションを作成します。

</div>

## 優先順位と制限

| 領域 | 動作 |
| --- | --- |
| Stdio | プロセスレベルの環境変数と CLI フラグのみを使用します。 |
| Streamable HTTP の既定値 | runtime メタデータが指定されていない場合、プロセスレベルの環境変数と CLI フラグを使用します。 |
| Streamable HTTP メタデータ | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` は、1 セッションの人間らしい動作を上書きできます。`humanPreset` は `default` または `careful` を選択できます。 |
| 既存セッション | `initialize` 中に取得された humanize 設定を保持します。 |
| ブラウザーエンジン | `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak` の場合のみ適用されます。 |
| ツール schema | Upstream Playwright MCP のブラウザーツール schema は変更されません。 |
| カスタム設定 | `humanConfig` は意図的にまだ受け付けていません。構造化設定には明示的な検証 schema が必要です。 |

この機能は、正当な品質保証（QA）、操作のリアリティ、および一貫性の
テストを目的としています。アクセス制御やポリシー
チェックを迂回する手段として扱ってはなりません。

## 関連する設定

- [設定](configuration.md) には、すべてのブリッジおよびアップストリームの環境変数が記載されています。
- [GeoIP プロキシのマッチング](geoip-proxy-matching.md) では、地域に一貫性のあるプロキシプロファイルについて説明しています。
- [ツール](tools.md) では、アップストリームの Playwright MCP ブラウザツールが変更されずに転送される理由について説明しています。

## 追加の実用パス

upstream Playwright MCP とこのパッケージのどちらを使うかは[比較](comparison.md)を参照してください。短い作業手順には[レシピ](recipes/index.md)を使います: 永続プロファイル、拡張機能、reverse proxy、リージョン QA、Claude Desktop、Codex CLI、CI スモークテスト。

## CloakBrowser

現在の CloakBrowser 依存関係は `{{ project.cloakbrowser_dependency }}` です。人間らしい入力ではキーを押している時間が重なり、キー間の間隔が変化します。マウスの移動時間は距離に応じて変わります。スクロールは偽装対象のプラットフォームに対応する整数のホイール刻みを使うため、小さな要求移動量は丸められることがあります。固定位置のモーダルや、祖先のスクロールコンテナー外にある絶対位置の要素にも操作できます。ページ遷移を起こす選択肢を選ぶと、古い要素のエラーではなく選択値が返されます。

CloakBrowser 0.6.2/0.6.3 では、ブリッジはネイティブの日付・時刻エディターに入力する前に、`ArrowLeft` で最初のセグメントに移動します。これにより、最初のクリック後にすべての数字が年のフィールドに入力されることを防ぎます。値はキーボードで入力し、プログラムによる代入は行いません。

CloakBrowser 0.6.2 は、Playwright 1.64 での humanize 操作の可視性チェックを修正します。ブリッジは、上流の無条件の `true` の代わりに、祖先 iframe の実際の可視性を両方の要素状態チェック経路に渡します。

人間らしい操作は、厳密モードを含む Playwright のセレクターの意味に従います。曖昧なロケーターや未対応の操作は、通常の操作に暗黙に切り替わらず、エラーになります。例えば、人間らしい `fill()` は `input[type=color]` を操作できません。この操作が必要なセッションでは humanize を無効にしてください。

humanize が有効な場合、ブリッジは検証済みの依存関係バージョンとソースハッシュのみを受け入れます。祖先 iframe の可視性を確認し、見つかった DOM 要素への弱参照を保持するため、切り離された要素を回収できます。未対応のバージョンや変更されたソースは拒否されます。対応するまでは `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=false` を使用してください。

CloakBrowser 0.6.1 は、`Page`、`Frame`、`Locator`、`ElementHandle` の `inputValue()`、`textContent()`、`innerText()`、`innerHTML()`、`getAttribute()`、`dispatchEvent()` を humanize の隔離コンテキストで実行します。非表示または重なった `ElementHandle` 要素と、`JSHandle` を含むイベント引数については、上流の実装が humanize を使わない Playwright にフォールバックして読み取りとイベント送信を行います。

ドロップダウンの選択は入力した接頭辞で検索し、繰り返しの選択にも対応します。macOS では、emoji で始まるラベルを人間らしい入力で選択できない場合があり、そのエラーは MCP 経由で転送されます。プログラムによる選択が許容される場合は、上流の `page._original.selectOption()` を明示的に使用してください。
