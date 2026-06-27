---
description: CloakBrowser MCP 的贡献者入口点。
icon: material/source-branch
tags:
  - Project Internals
---

# 贡献者指南

用户文档特意侧重于 MCP 服务器的安装和使用。开发资料汇总在此处。

## 章节

- [开发](development.md) 用于本地环境配置和包结构。
- [测试](testing.md)，用于单元测试、集成测试、Docker 测试、npm 包测试及一致性检查。
- [架构](architecture.md)，用于桥接运行时设计。
- [发布](release.md)，用于仓库设置和发布工作流。
- [贡献](contributing.md)，介绍项目工作流。

## 必需的本地检查

```bash
npm run check
```

在提交之前请运行完整检查。Docker 兼容性检查更耗资源，可通过以下命令运行：

```bash
npm run docker:build
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

可以直接通过以下命令运行元数据和生产依赖项检查：

```bash
npm run server:validate
npm run audit:prod
```
