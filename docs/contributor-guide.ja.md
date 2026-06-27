---
description: CloakBrowser MCPのコントリビューターエントリポイント。
icon: material/source-branch
tags:
  - Project Internals
---

# 寄稿者ガイド

ユーザードキュメントでは、MCPサーバーのインストールと使用方法に重点を置いています。開発関連の資料は、こちらにまとめられています。

## セクション

- [開発](development.md)：ローカル環境のセットアップおよびパッケージ構造について。
- [テスト](testing.md)：ユニットテスト、統合テスト、Docker、npmパッケージ、およびパリティチェック。
- [アーキテクチャ](architecture.md)：ブリッジランタイムの設計。
- [リリース](release.md)：リポジトリ設定および公開ワークフローに関する情報。
- [貢献](contributing.md)：プロジェクトのワークフローについて。

## 必須の現地確認

```bash
npm run check
```

コミットする前に、フルチェックを実行してください。Docker パリティは処理負荷が高いため、以下のコマンドで実行できます：

```bash
npm run docker:build
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

メタデータおよびビルド依存関係のチェックは、以下のコマンドで直接実行できます：

```bash
npm run server:validate
npm run audit:prod
```
