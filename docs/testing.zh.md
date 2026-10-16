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

`npm run check` 包含静态检查、单元/集成测试及使用模拟 upstream MCP 的已打包 CLI 测试，不启动 Chromium。PR CI 对每个平台与 Node.js 组合执行一次单元/集成及 CLI 测试：Linux x64/arm64、macOS x64/arm64 和 Windows x64，配合 Node.js {{ project.node_check_versions }}。Linux x64 在同一次测试运行中收集覆盖率并上传 Codecov。静态检查和包验证仅在 Linux x64/Node.js {{ project.node_minimum_version }} 上执行一次。

CI 矩阵、预期结果清单和文档均从 `.github/workflows/ci.yml` 读取 Node.js 版本。测试的发行版本分支发生变化时，请更新该文件。

## 真实浏览器及发行包测试

```bash
npm run test:e2e
npm run test:e2e:playwright-console
npm run test:e2e:cdp
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run test:e2e:cdp:docker
```

`test:e2e` 将模拟上游的 CLI 检查与真实 Playwright Chromium 的控制台检查组合运行。`test:e2e:playwright-console` 在全新会话中验证控制台方法。`test:e2e:cdp` 使用 Free CloakBrowser 和受控的 Playwright Chromium 验证托管 Chrome DevTools Protocol (CDP) 访问。

`test:e2e:npm-package` 打包并安装到临时项目。转发契约检查使用模拟上游；浏览器场景使用真实 CloakBrowser 和本地页面验证标准工具、持久状态及两种人性化预设。另有测试验证空缓存中的并发下载及 stdout 不含额外文本。仅通过包验证并不代表浏览器验收通过。

PR 浏览器矩阵在相同五个平台上使用 Node.js {{ project.node_current_version }} 验证 Playwright 控制台和托管 CDP，并额外在 Linux x64/Node.js {{ project.node_minimum_version }} 上验证 CDP。并行的 Node.js {{ project.node_primary_version }} 矩阵在五个平台上执行 npm 包、proxy/GeoIP、扩展和生命周期测试，包括两种类人操作预设。Docker 分发和 CDP 验收在 `linux/amd64` 与 `linux/arm64` 上覆盖两种引擎。

`required-ci` 要求所有测试套件和完整汇总报告成功后才能合并。同一个 `CI` 工作流也按周和手动运行。`Release` 从已测试的代码版本构建并发布产物。

## 测试报告

每个 CI 矩阵单元上传脱敏的结果及诊断附件。聚合任务将其合并为一份 Allure HTML 报告，保留测试集与环境标签。缺少预期结果生产者或测试失败会导致聚合失败；原始结果与 HTML 报告仍可作为 Actions 产物获取。

符合条件的 PR 运行可通过配置的独立报告仓库发布报告链接。发布要求启用交付、验证运行证据并通过 Pages 检查。文档站点单独部署。公开报告仅包含受控测试数据中经允许且已脱敏的诊断内容。

```bash
npm run test:report -- --suite unit --run-id local
npm run test:report:generate -- --input artifacts/test-results --output artifacts/test-report/local
npm run test:report:open -- --report artifacts/test-report/local
```

请将收集器实际输出目录作为生成器输入。报告格式、附件和 CI 交付详见[贡献指南](contributing.md)。

## 包验证

```bash
npm run package:verify
```

该命令会构建包，运行 `npm pack`，检查 tarball 文件列表，将 tarball 安装到临时项目，并验证 CLI 的 `--version` 和 `--help`。

包验证还会根据已发布的 MCP server schema 验证 `server.json`。

发布构建使用 `npm run package:pack` 创建压缩包并验证元数据和文件清单。安装和 CLI 执行由合并前的 `package:verify` 验证。

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

CI 从 Docker 作业上传工具一致性 JSON 报告。浏览器一致性测试在 `linux/amd64` 上运行；两种架构都执行基本检查、漏洞扫描、分发和 CDP 测试。一致性检查覆盖固定的 Docker MCP 版本；npm 套件单独验证 npm MCP。

## 安全检查

```bash
npm run audit:prod
npm run server:validate
```

CI 还会运行 CodeQL、Dependency Review、OpenSSF Scorecard、zizmor 和 Trivy。这些工具对公开仓库免费，并且不需要外部账户。
