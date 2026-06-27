---
description: CloakBrowser MCP、Docker 分離、artifact、secret、ネットワーク公開に関するセキュリティモデルとブラウザー自動化リスクのガイド。
icon: material/shield-lock
tags:
  - セキュリティ
  - ユーザーガイド
---

# セキュリティ

このプロジェクトはブラウザー自動化ブリッジです。信頼済みコードを実行するインフラとして扱ってください。

## 信頼境界

外側のサーバーは stdio と Streamable HTTP をサポートします。upstream Playwright MCP を子プロセスとして起動し、ツール呼び出しを転送します。ブラウザー自動化、ファイル出力、ネットワークアクセス、安全でない評価の挙動は upstream Playwright MCP によって決まります。

stdio サーバーを認証なしのネットワークラッパー経由で公開しないでください。ツールを呼び出せるクライアントは、ブラウザーを操作し、ブラウザーから見えるページデータを読み取り、artifact を要求できます。

Streamable HTTP は既定でローカルクライアント向けに `127.0.0.1` へ HTTP で bind します。`0.0.0.0` に bind したり loopback の外へ公開したりする場合は、`CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` または同等の reverse proxy 認証を必須にし、`CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` と TLS ファイルで直接 HTTPS を使うか、信頼できるネットワーク境界で TLS を終端し、信頼済みクライアントにアクセスを制限してください。

## 安全でないツール

Upstream Playwright MCP には `browser_evaluate` や `browser_run_code_unsafe` などのツールがあります。これらはブラウザーまたは Playwright server context で JavaScript を実行できます。このサーバーは信頼できる MCP クライアントにのみ接続してください。

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

分離と再現可能なブラウザー依存関係が必要な場合は Docker を推奨します。必要な artifact ディレクトリだけを mount し、ブラウザー子プロセスが正しく cleanup されるように `--init` を使用してください。

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
