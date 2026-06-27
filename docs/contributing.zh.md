---
description: CloakBrowser MCP 开发的贡献检查清单和拉取请求指南。
icon: material/source-pull
tags:
  - Project Internals
---

# 贡献

在提交拉取请求之前，请先运行本地检查，并阅读桥接架构页面。

```bash
npm install
npm run check
```

## Pull Request 检查清单

- [ ] `npm run check` 通过测试。
- [ ] 新的桥接行为已通过测试。
- [ ] 上游 Playwright MCP 模式、描述和响应保持不变。
- [ ] 用户可见的变更已记录在案。
- [ ] `CHANGELOG.md` 已针对用户可见的变更进行更新。
- [ ] 涉及安全敏感的变更已在 PR 描述中注明。

## 切勿这样做

- 请勿重新引入已移除的原生浏览器适配器、工具注册表或功能模型。
- 请勿将运行时日志写入 `stdout`；stdio 专用于 MCP JSON-RPC。
- 除非被运行时或测试导入，否则不要添加依赖项。
- 不要为了让更改通过而降低 TypeScript、ESLint 或 Prettier 的配置标准。
- 请勿提交 `dist/`、`coverage/`、 `artifacts/`、`site/`、 `.venv-docs/`，或 `node_modules/`。

## 安全问题

请通过 GitHub 安全公告报告漏洞，而非公开问题。请参阅 [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md)。
