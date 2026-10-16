---
description: CloakBrowser MCP開発のための貢献チェックリストおよびプルリクエストのガイドライン。
icon: material/source-pull
tags:
  - Project Internals
---

# 貢献について

プルリクエストを送信する前に、ローカルでのチェックを実行し、ブリッジのアーキテクチャに関するページをよく読んでください。

```bash
npm install
npm run check
```

## テストレポート

`test:report:generate` で生成するローカルレポートは、引き続き単独の HTML ファイルです。統合 CI レポートは GitHub のファイルサイズ制限を超えないよう、HTML、JavaScript、データを別々のファイルに保存します。`combined-test-report` アーティファクト全体をダウンロードして展開し、そのディレクトリを開いてください。

```bash
npm run test:report:open -- --report /path/to/extracted-report
```

複数ファイルのレポートでは、このコマンドがインストール済みの Allure ビューアーを起動します。閲覧中は実行したままにし、終了するには `Ctrl+C` を押してください。GitHub Pages への公開では、レポートのリソースを専用のレポートリポジトリに保存します。

## プルリクエストのチェックリスト

- [ ] `npm run check` は合格しました。
- [ ] 新しいブリッジの挙動に対するテストが実施されました。
- [ ] 上流の Playwright MCP スキーマ、説明、およびレスポンスに変更はありません。
- [ ] ユーザーに表示される変更点は文書化されています。
- [ ] `CHANGELOG.md` は、ユーザーに表示される変更点に合わせて更新されています。
- [ ] セキュリティに影響する変更点は、プルリクエストの説明に記載されています。

## やってはいけないこと

- 削除されたネイティブブラウザアダプタ、ツールレジストリ、または機能モデルを再導入しないでください。
- `stdout` にランタイムログを書き込まないでください。stdio は MCP JSON-RPC 用に予約されています。
- ランタイムまたはテストでインポートされていない限り、依存関係を追加しないでください。
- 変更を通すために、TypeScript、ESLint、またはPrettierの設定を緩和しないでください。
- `dist/`、`coverage/`、 `artifacts/`、`site/`、 `.venv-docs/`、または `node_modules/`。

## セキュリティ上の問題

脆弱性は、公開イシューではなく、GitHub Security Advisoriesを通じて報告してください。詳細は [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md) をご覧ください。
