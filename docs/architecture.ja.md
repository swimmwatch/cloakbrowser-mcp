---
description: CloakBrowser MCP用のブリッジアーキテクチャ。
icon: material/graph
tags:
  - Project Internals
---

# アーキテクチャ

## 実行時間

`cloakbrowser-mcp` は、stdio または Streamable HTTP を公開できる外部 MCP サーバーです。起動時には、以下の処理を行います：

1. CloakBrowser Chromium バイナリを解決またはインストールします。
2. 一時的な Playwright MCP 設定ファイルを作成します。
3. アップストリームの `@playwright/mcp` を、stdio 経由で子プロセスとして起動します。
4. MCP SDK クライアントトランスポートを使用して、その子プロセスに接続します；
5. 選択されたトランスポートを介して、ユーザーの MCP クライアントに対して外部 MCP サーバーを公開します；
6. アップストリームのツールリストおよびツール呼び出しを、変更せずに転送します；
7. `cloakbrowser_binary_info` および `cloakbrowser_bridge_info` を追加します。

## このデザインを選んだ理由

上流のPlaywright MCPプロジェクトは、すでにブラウザツール用の契約を保有しており、急速に進化しています。このブリッジモデルにより、本プロジェクトの規模を小さく抑え、ブラウザ自動化ロジックの複製を回避しています。

## Docker

この Docker イメージは、ピン留めされた公式の Playwright MCP イメージをベースイメージとして使用しています。 ブリッジは `/opt/cloakbrowser-mcp` の下にインストールされますが、上流の Playwright MCP は `/app/cli.js`で引き続き利用可能です。

## 設定

このブリッジは、CloakBrowserの起動オプションを含む一時的なJSON設定を書き込みます。アップストリームの `PLAYWRIGHT_MCP_*` 環境変数は、引き続きアップストリームのPlaywright MCPに転送されます。

## 輸送

デフォルトのトランスポートは stdio です。 ストリーム可能なHTTPは、`--transport streamable-http` または `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http` によって明示的に有効化されます。

stdioの場合、1つの外部サーバーが1つのアップストリームPlaywright MCP子プロセスを所有し、アップストリームPlaywright MCPのデフォルトのプロファイル動作を維持します。 Streamable HTTPの場合、各MCPセッションは、独自の外部サーバー、アップストリームの子プロセス、生成された設定、およびメモリ内のトランスポート状態を保持します。HTTPセッションは、隔離されたブラウザプロファイルを使用してアップストリームのPlaywright MCPを起動するため、同時接続ユーザー間で同じ永続的なChromiumプロファイルを共有したり、競合したりすることはありません。

このセッションバックエンドはメタデータのみを保存します。 組み込みのバックエンドは `memory` です。将来実装される Redis、Postgres、または SQLite アダプタは、メタデータとロックの調整を行うことはできますが、所有するサーバープロセスが終了した後、稼働中のアップストリームブラウザプロセスを復元することはできません。 水平スケーリングでは、`mcp-session-id`をキーとするスティッキーセッションを使用する必要があります。

このブリッジは、Streamable HTTP 向けに MCP SDK `StreamableHTTPServerTransport` を使用しています。非推奨となった MCP `SSEServerTransport`やレガシーな `/sse` エンドポイントは公開していません。
