---
description: CloakBrowser MCP 的测试策略，涵盖单元测试、假 upstream 集成测试、Docker smoke 测试以及 Playwright MCP 兼容性检查。
icon: material/test-tube
tags:
  - 测试
  - 项目内部
---

# 测试

## 单元测试

```bash
npm run test:unit
```

单元测试覆盖环境解析、桥接配置生成、启动参数处理以及本地 Cloak introspection 工具。

## 集成测试

```bash
npm run test:integration
```

集成测试使用假的 upstream MCP 子进程，并验证桥接层会合并本地工具，同时原样转发 upstream 调用。

CI 在 Node.js 22 和 24-26 上运行单元测试、集成测试和打包 CLI E2E 测试，覆盖 Linux x64、Linux arm64、macOS arm64、macOS x64 和 Windows x64。

## 包验证

```bash
npm run package:verify
```

该命令会构建包，运行 `npm pack`，检查 tarball 文件列表，将 tarball 安装到临时项目，并验证 CLI 的 `--version` 和 `--help`。

包验证还会根据已发布的 MCP server schema 验证 `server.json`。

## Docker smoke 测试

```bash
npm run docker:build
npm run docker:smoke
```

smoke 测试验证构建后的镜像能够启动并输出 CLI 帮助。CI 会对 `linux/amd64` 和 `linux/arm64` 的 Docker 镜像执行 smoke 测试。

## Upstream 兼容性

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

兼容性脚本会启动官方 Playwright MCP Docker 镜像和 CloakBrowser 桥接镜像，比较 upstream 工具名称，在同一个 fixture 页面上执行默认浏览器工具表面，并验证本地 Cloak introspection 工具。

CI 会将 JSON 兼容性报告作为 Docker 构建任务和发布任务的 artifact 上传。浏览器兼容性目前在 `linux/amd64` 上运行；arm64 Docker 任务使用 smoke 测试和漏洞检查。

## 安全检查

```bash
npm run audit:prod
npm run server:validate
```

CI 还会运行 CodeQL、Dependency Review、OpenSSF Scorecard、zizmor 和 Trivy。这些工具对公开仓库免费，并且不需要外部账户。
