---
description: CloakBrowser MCPのnpmパッケージ、Dockerイメージ、ドキュメントサイト、MCPレジストリへの登録、およびGitHub Pagesへのデプロイに関するリリースプロセス。
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# リリース

リリースは、GitHubに公開されたリリースによって駆動され、そのタグは、
`v`がプレフィックスとして付加されたSemVer値です。例えば、`v1.2.7`といった形になります。

統合された `Release` ワークフローは、タグを一度解決した後、派生した `version`、
`version_tag`、およびDocker対応のイメージタグを、npmパッケージング、Dockerビルド
引数、イメージラベル、サーバーメタデータ、READMEマーカー、およびドキュメント
マーカーを通じて渡します。

## GitHub リポジトリの設定

初回リリース前に、これらの設定を行ってください。

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

`npm-production`、`docker-production`、および
`mcp-registry-production` に必須のレビュー担当者を追加してください。これにより、
GitHub Release の公開後にリリースに手動承認が必要となります。 `github-pages` 環境は、
ネイティブの GitHub Pages デプロイジョブで使用されます。

## npmへの公開

この npm リリースワークフローは、GitHub
Actions OIDC を利用した npm Trusted Publishing を通じて公開されます。公開には `NPM_TOKEN` は使用されません。

npmjs.com の信頼済みパブリッシャーを、以下の値とまったく同じ値で設定してください：

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

`npm` ジョブは GitHub がホストするランナー上で実行され、Node.js 24 を使用し、
`id-token: write` を保持するため、npm が GitHub Actions の OIDC トークンを
短期間有効な公開用認証情報と交換できるようになります。npm Trusted Publishing には npm CLI
`>=11.5.1` および Node.js `>=22.14.0` が必要です。

出版分野での用途：

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Trusted Publishing を通じて公開する場合、npm はパブリックリポジトリにあるパブリックパッケージの
パッケージの出所情報を自動的に生成します。このワークフローに、有効期間が長い
npm 公開トークンを追加しないでください。

パッケージのバージョンは、`npm pack`
および `npm publish`の間のGitHubリリースタグから適用されます。また、`package.json`が解決されたリリースバージョンと一致しない場合、
ジョブは失敗します。

## Dockerの公開

Docker イメージは以下の場所に公開されます：

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

`docker` ジョブは、`GITHUB_TOKEN` リポジトリを、
`packages: write`（GHCR用）。Docker Hubへの公開には以下が必要です。
`DOCKERHUB_USERNAME` および `DOCKERHUB_TOKEN` が `docker-production` 内に
環境またはリポジトリのシークレット。

このワークフローは、イメージのプッシュが成功した後、Docker Hub リポジトリの概要を更新します。
Docker Hub は、この GitHub Actions リリースフローに対して、ルート `README.md` を自動的にプルしません。 Docker Hub 専用の概要は
`docs/dockerhub-readme.md` で管理されています。

release PR をマージする前に、CI は次を検証します：

- TypeScript、リンティング、フォーマット、ビルド、テスト、およびカバレッジチェックを実行します。
- npm パッケージのメタデータと内容を検証します。
- `linux/amd64` と `linux/arm64` 向けの Docker イメージをビルドします。
- Docker `--help` のスモークチェックを実行します。
- ブリッジパリティスクリプトを使用して、`linux/amd64` イメージをアップストリームの Playwright MCP と比較します。
- Trivy を使用して、Docker イメージ内の OS およびライブラリに関する高リスクおよび重大な脆弱性をスキャンします。

リリース公開中、Docker ワークフローは次を実行します：

- リリースバージョンを適用します。
- Docker ビルド中に、ピン留めされた Playwright MCP
  ベースイメージに対して、利用可能な Debian セキュリティアップデートを適用します。
- ランタイムイメージから未使用のグローバル npm ペイロードを削除します。
- マルチプラットフォームイメージを公開します。
- イメージのプッシュが成功した後、Docker Hub の概要を更新します。

Docker ビルドには、`RELEASE_VERSION`、`RELEASE_VERSION_TAG`、および
`VCS_REF`というビルド引数を受け取ります。 また、このワークフローは、アップストリームの Playwright
MCP ベースイメージのダイジェストを解決し、それを `PLAYWRIGHT_MCP_IMAGE_DIGEST` として渡します。

最終的なイメージには、OCIラベルや実行時メタデータ
環境変数と同じ値が格納されます。公開されたイメージには、タイトル、説明、
ソース、ドキュメント、バージョン、リビジョン、ライセンス、作成者、ベンダー、ベースイメージ
名、ベースイメージのダイジェスト、およびMCPサーバー名に関するラベルが含まれます。

Trivyは無料でオープンソースであり、パブリック
イメージのスキャンに外部トークンは必要ありません。コードスキャンが有効になっている場合、
SARIFの結果はGitHubコードスキャンにアップロードされます。

初回公開後、GHCR パッケージが公開されており、この
リポジトリにリンクされていることを確認し、Docker Hub リポジトリが公開されていることも確認してください。

Dockerは、`linux/amd64`および
`linux/arm64` 向けのマルチプラットフォーム・マニフェストを公開します。PR CI はマージ前に両プラットフォームのスモークチェックを実施し、
`linux/amd64` におけるブラウザーツールのパリティ比較を維持します。

## MCPレジストリの公開

`mcp-registry` ジョブは、`server.json`を公式
レジストリに公開します：

```text
https://registry.modelcontextprotocol.io
```

サーバー公開では、ローカルの `MCP Registry Publish` 複合 GitHub Action、
公式の `mcp-publisher` CLI、および GitHub Actions OIDC を使用します。 このサーバーを一覧表示するために、`modelcontextprotocol/registry` に対してプル
リクエストを開かないでください。そのリポジトリでは
では、パッケージ作成者が `mcp-publisher` を使用して公開することを明示的に要求しています。

このワークフローでは、Glama、課金、GitHub PAT、DNS 認証情報、あるいは
長期保存型のレジストリシークレットは必要ありません。以下を使用します：

- `id-token: write`（GitHub OIDC認証用）；
- `mcp-publisher login github-oidc`;
- 既存の GitHub ネームスペース `io.github.swimmwatch/cloakbrowser-mcp`;
- npm パッケージの所有権を証明するための npm パッケージ `mcpName` の値;
- OCI
  イメージの所有権を証明するための Docker イメージラベル `io.modelcontextprotocol.server.name`。

MCPレジストリのジョブは、npm、Docker、
およびドキュメントの公開と同じGitHubリリースイベントから開始されます。このジョブでは `needs: [npm, docker]` を宣言しているため、レジストリへの公開が開始される前に、npmおよび
Dockerへの公開が完了します。ドキュメントのデプロイは `needs: [docs-build, npm, docker, mcp-registry]` を宣言しているため、GitHub Pages は npm、Docker、公式 MCP Registry の公開が成功した後にのみ更新されます。 この複合
アクションは意図的にレジストリに焦点を当てています。ローカルで `server.json` を検証し、
`mcp-publisher` を使用して検証し、正確なレジストリバージョンが
すでに公開されているかどうかを確認し、`mcp-publisher login github-oidc` を使用して認証を行い、
サーバーのメタデータを公開し、最終的なレジストリエントリを検証します。

一時的なレジストリの障害が発生した場合は、npm および Docker ジョブが「グリーン」状態になった後、
元のリリース実行において、失敗した `mcp-registry` ジョブを再実行してください。 `workflow_dispatch` トリガーは、`Release` に対して、
明示的なタグを指定した完全なリリースパイプラインの実行を行うためのものです。

公開されたレジストリエントリを、次のコマンドで確認してください：

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

GitHubの`https://github.com/mcp`レジストリは、個別にキュレーションされた
ディスカバリープラットフォームです。 公式の MCP レジストリへの公開は必須ですが、それだけでは
GitHub の `/mcp` ページでの即時表示は保証されません。 `npm run
registry:check` は、公式レジストリ、npm、
GHCR、Docker Hub 向けのリリース検証ツールであり、GitHub MCP での可視性については「最善を尽くす」範囲での確認ツールとして扱ってください。 `npm run
registry:check:strict` は、GitHub MCP での可視性が必須条件となる
段階になってから使用してください。

## Glamaディレクトリのチェックリスト

Glamaディレクトリのスコアリングは、GitHubのリリースや公式MCP
レジストリへの公開とは別個に行われます。このリポジトリには `glama.json` が含まれているため、
`swimmwatch`のメンテナアカウントは、Glamaで所有権を申請または確認することができます。

安定版を公開する前に、無料のGlamaチェックリストを完了してください：

- `glama.json`が
  が `main` にマージされた後、Glama MCP サーバー管理インターフェースからサーバーを同期します。
-
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile` を開く;
- Glama を設定し、このリポジトリの Dockerfile をビルドし、追加のシークレットなしで既存の
  stdio エントリポイントを起動する；
- ランタイムを CloakBrowser のデフォルト設定と互換性のある状態に保つ：`cloak` ブラウザ
  エンジン、ヘッドレスモード、stdout出力、および`/data`アーティファクトストレージ；
- 「デプロイ」をクリックし、ビルドテストが成功するのを待ちます；
- GitHubのリリースと同じバージョンのGlamaリリースを作成して公開します。
  例：`1.2.7`；
- リリース後に一度、Glamaの「ブラウザで試す」機能を使用して、初期の
  利用を促進します；
- 関連するサーバーを手動で追加します。少なくとも公式のPlaywright MCPサーバーを
  追加し、必要に応じて密接に関連するブラウザ自動化の代替手段も追加します。

ディレクトリのスコアを上げるためだけに、課金方法や有料のGlamaホスティングを追加してはいけません。
Glamaの必須チェックリスト項目に課金が必要とされる場合、それを
明示的なメンテナーの決定を要するリリースブロック要因として扱ってください。

## セキュリティワークフロー

このリポジトリでは、無料のセキュリティツールを使用しています：

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / npm release | `npm audit --omit=dev --audit-level=high` | PR CI and npm publish job | No external account or token. |

アクションのSHA固定については、今後の強化作業の一環として追跡されます。現在のワークフローでは
バージョン管理されたアクション参照を使用しているため、リリース
インフラがまだ整備途上の段階でも、更新を管理しやすい状態を維持しています。

## ドキュメントの公開

`docs-build` および `docs-deploy` ジョブは、GitHub Pages Actions のネイティブ
デプロイフローを使用して MkDocs をデプロイします。 リポジトリの Pages 設定では、ソースとして `GitHub Actions` を
指定する必要があります。

このワークフローは、厳格モードでドキュメントを生成し、生成された `site/`
ディレクトリに`actions/upload-pages-artifact`と共にアップロードし、
`actions/deploy-pages` として、npm、Docker、MCP Registry の公開が成功した後にのみ `github-pages` 環境にデプロイします。

ドキュメントの公開では、MkDocsのビルド後にSEOバリデータも実行されます。
オプションのウェブマスター認証トークンは、公式の無料ウェブマスターツールを使用しており、
リポジトリ変数またはシークレットとして指定できます：

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

IndexNowの通知（オプション）を使用するには、
`INDEXNOW_KEY` という名前のリポジトリシークレットが必要です。これが設定されている場合、ワークフローは必要なキーファイルを公開し、
GitHub Pagesへのデプロイ後に生成されたサイトマップのURLを送信します。

別途明示的な決定がない限り、有料のインデックス作成サービス、広告製品、またはサードパーティ製の
分析ツールを、ドキュメントのリリースフローに追加してはなりません。

## 上流監視

アップストリーム・モニターのワークフローは毎日実行され、
GitHub Actions から手動で起動することも可能です。このワークフローは、Playwright MCP の 2 つのアップストリーム配布チャネルの両方をチェックします：

- npm パッケージ: `@playwright/mcp`;
- Docker イメージ: `mcr.microsoft.com/playwright/mcp`.

より新しいアップストリーム版が検出されると、ワークフローによって GitHub のイシューが作成され、
`swimmwatch` に割り当てられます。このイシューには、現在版および最新の npm/Docker
バージョン、`microsoft/playwright-mcp`によるリリースノートの簡単な要約、およびアップストリームの完全な変更履歴、npm
パッケージ、Dockerタグへのリンクが含まれます。

次のコマンドで、ローカル環境でも同じチェックを実行してください：

```bash
npm run upstream:check
```

## リリースタグ

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## チェックリスト

プレスリリースを公開する前に：

- `Actionlint` および `CI` が緑色になってからマージしてください。
- `v1.2.7` のようなタグから GitHub リリースを作成してください。
- `next` の npm バージョンを公開する際、そのリリースを「プレリリース」としてマークします。
- `release.yml` および
  `npm-production` に対して npm Trusted Publisher が設定されていることを確認してください。
- `npm-production`、`docker-production`、 `github-pages`、および
  `mcp-registry-production` 環境が存在することを確認します。
- SARIFへのアップロード可視性が必要な場合は、GitHubコードスキャンが有効になっていることを確認してください。
- 最初のDocker公開後、GHCRパッケージの可視性が「公開」になっていることを確認してください。
- Glamaサーバーの同期が完了し、Dockerfile管理
  ページを通じてテストが行われ、同じ安定版バージョンでリリースされていることを確認してください。

`SUPPORT.md` は、GitHubのイシューやセキュリティアドバイザリにとどまらない、安定したサポート
ポリシーがプロジェクトに確立されるまで、意図的に延期されています。
