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
