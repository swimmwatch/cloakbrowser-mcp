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

CI は Node.js 22 および 24-26 で単体テスト、統合テスト、パッケージ済み CLI E2E テストを実行し、Linux x64、Linux arm64、macOS arm64、macOS x64、Windows x64 を対象にします。

## パッケージ検証

```bash
npm run package:verify
```

このコマンドはパッケージをビルドし、`npm pack` を実行し、tarball のファイル一覧を確認し、一時プロジェクトへ tarball をインストールして CLI の `--version` と `--help` を検証します。

パッケージ検証では、公開済み MCP server schema に対して `server.json` も検証します。

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

CI は JSON 互換性レポートを Docker ビルドジョブとリリースジョブの artifact としてアップロードします。ブラウザー互換性は現在 `linux/amd64` で実行され、arm64 Docker ジョブは smoke テストと脆弱性チェックを使用します。

## セキュリティチェック

```bash
npm run audit:prod
npm run server:validate
```

CI は CodeQL、Dependency Review、OpenSSF Scorecard、zizmor、Trivy も実行します。これらのツールは公開リポジトリでは無料で、外部アカウントを必要としません。
