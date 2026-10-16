---
description: CloakBrowser MCP のテスト戦略。単体テスト、偽 upstream 統合テスト、Docker smoke テスト、Playwright MCP との互換性チェックを扱います。
icon: material/test-tube
tags:
  - テスト
  - プロジェクト内部
---

# テスト

## 単体テスト

```bash
npm run test:unit
```

単体テストは、環境変数の解析、ブリッジ設定の生成、起動引数の処理、ローカル Cloak introspection ツールをカバーします。

## 統合テスト

```bash
npm run test:integration
```

統合テストは偽の upstream MCP 子プロセスを使用し、ブリッジがローカルツールを統合し、upstream 呼び出しを変更せずに転送することを検証します。

`npm run check` は静的チェック、単体/統合テスト、模擬 upstream MCP を使うパッケージ済み CLI テストを実行し、Chromium は起動しません。PR CI はプラットフォームと Node.js の組み合わせごとに単体/統合と CLI のテストを一度実行します。対象は Linux x64/arm64、macOS x64/arm64、Windows x64 と Node.js {{ project.node_check_versions }} です。Linux x64 では同じテスト実行でカバレッジを収集し Codecov に送信します。静的チェックとパッケージ検証は Linux x64/Node.js {{ project.node_minimum_version }} で一度実行します。

CI 行列、期待される結果の一覧、ドキュメントは `.github/workflows/ci.yml` から Node.js のバージョンを読み取ります。テスト対象のリリース系列が変わったら、このファイルを更新してください。

## 実ブラウザと配布物のテスト

```bash
npm run test:e2e
npm run test:e2e:playwright-console
npm run test:e2e:cdp
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run test:e2e:cdp:docker
```

`test:e2e` は模擬 upstream を使う CLI チェックと、実際の Playwright Chromium のコンソールチェックを組み合わせます。`test:e2e:playwright-console` は新しいセッションでコンソールメソッドを検証します。`test:e2e:cdp` は Free CloakBrowser と管理された Playwright Chromium を使い、管理対象の Chrome DevTools Protocol (CDP) アクセスを検証します。

`test:e2e:npm-package` はパッケージを作成して一時プロジェクトへインストールします。転送契約のチェックは模擬 upstream を使用し、ブラウザシナリオは実際の CloakBrowser とローカルページで標準ツール、永続状態、両方の人間らしい操作のプリセットを検証します。別のテストでは空のキャッシュへの同時ダウンロードと、stdout に余計なテキストがないことを確認します。パッケージ検証だけではブラウザの受け入れ確認になりません。

PR のブラウザ行列では、同じ五つのプラットフォームの Node.js {{ project.node_current_version }} で Playwright コンソールと管理対象 CDP を検証し、CDP は Linux x64/Node.js {{ project.node_minimum_version }} でも検証します。並列の Node.js {{ project.node_primary_version }} 行列は五つのプラットフォームで npm パッケージ、proxy/GeoIP、拡張機能、ライフサイクルのスイートを実行し、人間らしい操作の両プリセットを含みます。Docker の配布と CDP の受け入れ検証は `linux/amd64` と `linux/arm64` の両エンジンを対象とします。

`required-ci` はマージ前にすべてのスイートと完全な集約レポートの成功を要求します。同じ `CI` ワークフローは毎週および手動でも実行できます。`Release` はテスト済みリビジョンから成果物をビルドして公開します。

## テストレポート

各 CI マトリクスセルは、機密情報を除去した結果と診断添付をアップロードします。集約ジョブはテスト群と環境のラベルを保持して、1 つの Allure HTML レポートに統合します。必要な結果提供元の不足やテスト失敗で集約は失敗しますが、元の結果と HTML は Actions の成果物として残ります。

条件を満たす PR 実行は、設定された別のレポートリポジトリを通じてリンクを公開できます。公開には配信の有効化、実行証拠の検証、Pages チェックの成功が必要です。ドキュメントサイトは別にデプロイします。公開レポートには、管理されたテストデータから許可され、機密情報を除去した診断のみを含めます。

```bash
npm run test:report -- --suite unit --run-id local
npm run test:report:generate -- --input artifacts/test-results --output artifacts/test-report/local
npm run test:report:open -- --report artifacts/test-report/local
```

収集ツールが実際に出力したディレクトリを生成ツールの入力に指定してください。形式、添付、CI 配信は[貢献ガイド](contributing.md)を参照してください。

## パッケージ検証

```bash
npm run package:verify
```

このコマンドはパッケージをビルドし、`npm pack` を実行し、tarball のファイル一覧を確認し、一時プロジェクトへ tarball をインストールして CLI の `--version` と `--help` を検証します。

パッケージ検証では、公開済み MCP server schema に対して `server.json` も検証します。

リリースの生成には `npm run package:pack` を使い、アーカイブを作成してメタデータとファイル一覧を検証します。インストールと CLI の実行はマージ前の `package:verify` で検証します。

## Docker smoke テスト

```bash
npm run docker:build
npm run docker:smoke
```

smoke テストは、ビルド済みイメージが起動して CLI ヘルプを出力することを確認します。CI は `linux/amd64` と `linux/arm64` の Docker イメージで smoke テストを実行します。

## Upstream 互換性

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

互換性スクリプトは、公式 Playwright MCP Docker イメージと CloakBrowser ブリッジイメージを起動し、upstream ツール名を比較し、同じ fixture ページで既定のブラウザーツール表面を実行し、ローカル Cloak introspection ツールを検証します。

CI は Docker ジョブからツールの同等性を示す JSON レポートをアップロードします。ブラウザの同等性検証は `linux/amd64` で実行し、両アーキテクチャで基本動作、脆弱性、配布、CDP を検証します。同等性検証の対象は固定された Docker MCP バージョンで、npm スイートは npm MCP を別途検証します。

## セキュリティチェック

```bash
npm run audit:prod
npm run server:validate
```

CI は CodeQL、Dependency Review、OpenSSF Scorecard、zizmor、Trivy も実行します。これらのツールは公開リポジトリでは無料で、外部アカウントを必要としません。
