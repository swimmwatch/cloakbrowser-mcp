---
description: CloakBrowser MCPのインストール、Dockerの使用方法、Playwright MCPとの互換性、およびセキュリティに関するよくある質問。
icon: material/help-circle
tags:
  - User Guide
---

# よくある質問

## CloakBrowser MCPとは何ですか？

CloakBrowser MCP は、stdio または Streamable HTTP 経由でのブラウザ自動化のための [Model Context Protocol](https://modelcontextprotocol.io/) サーバーです。 これは、[`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) のアップストリームで実行され、Playwright MCP のブラウザ起動設定を [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) Chromium バイナリに向けます。

## 上流のPlaywright MCPとはどう違うのですか？

上流の Playwright MCP サーバーが、ブラウザツールのスキーマ、説明、およびレスポンスを管理しています。CloakBrowser MCP はこれらのツールを変更せず、2 つのローカルなイントロスペクションツールのみを追加します： `cloakbrowser_binary_info` および `cloakbrowser_bridge_info`。

[`@playwright/mcp` と `cloakbrowser-mcp`](comparison.md) では、ツールの同等性、CloakBrowser の実行、パッケージ化、Streamable HTTP、プロファイル、拡張機能、地域別テスト、人間らしい入力を比較しています。

## npmからインストールすべきか、それともDockerからインストールすべきか？

MCP クライアントがすでにローカルで動作しており、Node.js `{{ project.node_engine_range }}` が利用可能な場合は npm を使用してください。Playwright MCP をベースにした再現可能なイメージと、コンテナー内に準備済みの CloakBrowser キャッシュが必要な場合は Docker を使用してください。

## どのMCPクライアントがこれを利用できますか？

stdio または Streamable HTTP サーバーをサポートする MCP クライアントであれば、どれでも CloakBrowser MCP を使用できます。[はじめに](getting-started.md) ガイドには、Codex、Claude Desktop、Claude Code、Cursor、VS Code/Cline スタイルのクライアント、Continue、Windsurf、Goose、および Warp スタイルの設定に関する stdio JSON の例が掲載されています。

手順別のガイド： [Claude Desktop に接続](recipes/connect-claude-desktop.md), [Codex CLI に接続](recipes/connect-codex-cli.md).

## 実用的な設定例はどこにありますか？

upstream Playwright MCP とこのパッケージのどちらを使うかは[比較](comparison.md)を参照してください。短い作業手順には[レシピ](recipes/index.md)を使います: 永続プロファイル、拡張機能、reverse proxy、リージョン QA、Claude Desktop、Codex CLI、CI スモークテスト。
## Playwright MCPと同じブラウザツールに対応していますか？

はい。UpstreamのPlaywright MCPブラウザツールは、変更を加えずに転送されます。また、このプロジェクトではCIでパリティ比較を実行しているため、ブリッジへの変更が公式のPlaywright MCPの動作と照らし合わせて確認できます。

## Dockerはセキュリティを向上させるのか？

Docker を使用することで、再現性が高く、隔離された実行環境が得られますが、ブラウザの自動化がリスクフリーになるわけではありません。自動化されたブラウジングは、信頼できない実行環境として扱ってください。 未知のページとの間で機密情報を共有しないようにし、アーティファクトやスクリーンショットは管理されたディレクトリに保管し、サーバーを他のシステムに公開する前に、[セキュリティ](security.md) ガイドを確認してください。

## このプロジェクトでは、分析やトラッキング機能を使用していますか？

いいえ。ドキュメントサイトでは、デフォルトでは分析機能は有効になっていません。検索エンジンによる発見は、標準のメタデータ（`robots.txt`）、サイトマップの生成、オプションのウェブマスター認証タグ、およびオプションのIndexNow通知を通じて行われます。
