---
description: CloakBrowser MCP npm 包、Docker 镜像、文档网站、MCP Registry 条目以及 GitHub Pages 部署的发布流程。
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# 发布

版本发布由一个已发布的 GitHub 版本驱动，其标签是一个 SemVer 值，
前缀为 `v`，例如 `v1.2.7`。

统一的 `Release` 工作流会先解析该标签一次，随后通过 npm 打包、Docker 构建参数以及 Docker-safe 镜像标签，传递派生的 `version`，
`version_tag` 以及 Docker 安全镜像标签，并将其传递至 npm 打包、Docker 构建
参数、镜像标签、服务器元数据、README 标记和文档
标记中。

## GitHub 仓库设置

请在首次发布之前配置这些设置。

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

将必要的审阅者添加到 `npm-production`、`docker-production` 以及
`mcp-registry-production`，以便在
发布 GitHub Release 后，发布版本需要人工审批。 `github-pages` 环境由
原生 GitHub Pages 部署任务使用。

## npm 发布

该 npm 发布工作流通过 npm Trusted Publishing 结合 GitHub
Actions OIDC 进行发布。它不使用 `NPM_TOKEN` 进行发布。

请使用以下确切值在 npmjs.com 上配置可信发布者：

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

`npm` 任务在 GitHub 托管的运行器上运行，使用 Node.js 24，并保留
`id-token: write`，以便 npm 能够将 GitHub Actions OIDC 令牌兑换为
短效发布凭证。npm 可信发布需要 npm CLI
`>=11.5.1` 以及 Node.js `>=22.14.0`。

出版用途：

```bash
npm publish <tarball> --access public --tag <latest|next>
```

通过 Trusted Publishing 发布时，npm 会自动为来自公共仓库的公共包生成
包来源信息。请勿将长期有效的
npm 发布令牌添加回此工作流中。

该软件包版本源自 GitHub 发布标签中 `npm pack`
和 `npm publish` 之间，若 `package.json` 与
解析后的发布版本不匹配，则任务将失败。

## Docker 发布

Docker 镜像发布到：

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

`docker` 作业使用存储库 `GITHUB_TOKEN`，其中
`packages: write` 作为 GHCR 的仓库。 Docker Hub 发布需要
`DOCKERHUB_USERNAME` 和 `DOCKERHUB_TOKEN` 必须包含在 `docker-production`
环境或仓库密钥中。

该工作流会在镜像成功
推送后更新 Docker Hub 仓库概览。对于此 GitHub Actions 发布流程，Docker Hub 不会自动拉取根镜像 `README.md`； Docker Hub 专用的概览由
`docs/dockerhub-readme.md` 维护。

在发布镜像之前，工作流程如下：

- 应用发布版本；
- 运行 TypeScript、代码检查、格式化、构建、测试及代码覆盖率检查；
- 构建本地发布烟雾测试镜像；
- 在 Docker 构建过程中，在已固定的 Playwright MCP
  基础镜像上应用可用的 Debian 安全更新；
- 从运行时镜像中移除未使用的全局 npm 有效载荷；
- 在镜像中运行 `--help`；
- 使用桥接一致性
  脚本将镜像与上游 Playwright MCP 进行比对；
- 将 JSON 桥接一致性报告上传为工作流工件；
- 使用 Trivy 对镜像进行扫描，以检测操作系统和库中的高危及关键漏洞。

Docker 构建接收了 `RELEASE_VERSION`、`RELEASE_VERSION_TAG` 以及
`VCS_REF` 这三个构建参数。 该工作流还会解析上游 Playwright
MCP 基础镜像的摘要，并将其作为 `PLAYWRIGHT_MCP_IMAGE_DIGEST` 传递。

最终镜像存储的值与 OCI 标签和运行时元数据
环境变量中的值相同。已发布的镜像包含以下标签：标题、描述、
来源、文档、版本、修订版、许可证、作者、供应商、基础镜像
名称、基础镜像摘要以及 MCP 服务器名称。

Trivy 是免费的开源软件，进行公共
图像扫描时无需外部令牌。当代码
扫描功能启用时，SARIF 结果会上传至 GitHub 代码扫描服务。

首次发布后，请确认 GHCR 软件包已设为公开并链接到此
仓库，同时确认 Docker Hub 仓库已设为公开。

Docker 发布了针对 `linux/amd64` 的多平台清单，以及
`linux/arm64` 发布了多平台清单。 发布工作流会在发布前对两个平台进行烟雾测试，
并保持 `linux/amd64` 上的浏览器兼容性对比。

## MCP 注册表发布

`mcp-registry` 作业将 `server.json` 至官方
注册表，地址为：

```text
https://registry.modelcontextprotocol.io
```

服务器发布使用本地 `MCP Registry Publish` 复合 GitHub Action、
官方的 `mcp-publisher` CLI 以及 GitHub Actions OIDC。 请勿针对 `modelcontextprotocol/registry` 提交拉取
请求以列出该服务器；该存储库
明确要求包作者使用 `mcp-publisher` 进行发布。

该工作流无需 Glama、计费、GitHub PAT、DNS 凭据或
长期有效的注册表密钥。它使用：

- `id-token: write`，用于 GitHub OIDC 身份验证；
- `mcp-publisher login github-oidc`；
- 现有的 GitHub 命名空间 `io.github.swimmwatch/cloakbrowser-mcp`；
- npm 包 `mcpName` 的值，用于证明 npm 包的所有权；
- Docker 镜像标签 `io.modelcontextprotocol.server.name`，用于证明 OCI
  镜像的所有权。

MCP 注册表任务与 npm、Docker
以及文档发布使用相同的 GitHub 发布事件触发。该任务声明了 `needs: [npm, docker]`，因此 npm 和
GHCR 的发布会在注册表发布开始之前完成。 该复合
操作有意侧重于注册表：它会在本地验证 `server.json`，
并使用 `mcp-publisher`进行验证，检查该注册表的精确版本是否
已可见，使用`mcp-publisher login github-oidc` 进行身份验证，发布
服务器元数据，并验证最终的注册表条目。

If a transient registry failure happens, rerun the failed `mcp-registry` job in
在 npm 和 Docker 任务显示为绿色后，将执行原始发布流程。手册
`workflow_dispatch` 触发器针对 `Release`，用于完整发布管道的运行，其中包含
一个显式标签。

使用以下命令验证已发布的注册表项：

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

GitHub 的 `https://github.com/mcp` 注册表是一个独立的、经过筛选的
发现平台。 虽然必须向官方 MCP 注册表发布，但这并不能
保证在 GitHub 的 `/mcp` 页面上立即可见。 请将 `npm run
registry:check` 视为针对官方注册表、npm、
GHCR、Docker Hub 以及 GitHub MCP 可见性（尽最大努力检测）的发布验证工具。 仅在 GitHub MCP 可见性应成为硬性
门槛后，才使用 `npm run
registry:check:strict`。

## Glama 目录检查清单

Glama 目录评分与 GitHub 发布以及官方 MCP
注册表发布是分开的。该代码库包含 `glama.json`，因此
`swimmwatch` 的维护者账户可在 Glama 中申领或确认所有权。

在发布稳定版之前，请完成免费的 Glama 检查清单：

- 在 `glama.json`
  合并到 `main` 之后；
- 启动
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile`；
- 配置 Glama 以构建该仓库的 Dockerfile，并启动现有的
  stdio 入口点，无需额外密钥；
- 保持运行时与 CloakBrowser 默认设置兼容：`cloak` 浏览器
  引擎、无头模式、标准输出（stdout）以及 `/data` 构建产物存储；
- 点击“部署”并等待构建测试通过；
- 创建并发布一个与 GitHub
  发布版本相同的 Glama 发布版本，例如 `1.2.7`；
- 发布后使用一次 Glama 的“在浏览器中试用”功能，以引导初始
  使用；
- 手动添加相关服务器，至少包括官方的 Playwright MCP 服务器，
  并可选添加密切相关的浏览器自动化替代方案。

请勿仅为了提高目录
评分而添加计费方式或付费的 Glama 托管服务。如果 Glama 要求针对必选检查清单项进行计费，请将其视为
发布阻碍，需要维护者做出明确决定。

## 安全工作流

该代码库使用免费的安全工具：

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / releases | `npm audit --omit=dev --audit-level=high` | CI and release checks | No external account or token. |

操作 SHA 固定功能将作为未来的一次强化迭代进行跟踪。当前的工作流采用
带版本号的操作引用，因此在发布
基础设施尚处于初期阶段时，更新仍可保持可控。

## 文档发布

`docs-build` 和 `docs-deploy` 任务使用原生的 GitHub Pages Actions
部署流程来部署 MkDocs。 仓库的 Pages 设置必须使用 `GitHub Actions` 作为
源。

该工作流以严格模式生成文档，将生成的 `site/`
目录中，并将其与`actions/upload-pages-artifact`一起部署，最后通过
`actions/deploy-pages` 部署到 `github-pages` 环境中。

文档发布过程还会在 MkDocs 构建完成后运行 SEO 验证工具。
可选的网站管理员验证令牌使用官方免费的网站管理员工具，并可
作为仓库变量或密钥提供：

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

可选的 IndexNow 通知需要一个名为
`INDEXNOW_KEY` 的存储库密钥。设置该密钥后，工作流会在 GitHub Pages 部署完成后发布所需的密钥文件，并
提交生成的站点地图 URL。

未经单独明确
决定，请勿将付费索引服务、广告产品或第三方
分析工具添加到文档发布流程中。

## 上游监测

上游监控工作流每天运行一次，也可以通过
GitHub Actions 手动启动。它会检查上游的两个 Playwright MCP 分发渠道：

- npm 包：`@playwright/mcp`；
- Docker 镜像：`mcr.microsoft.com/playwright/mcp`。

当检测到上游有新版本时，该工作流会创建一个 GitHub 问题
并将其分配给 `swimmwatch`。该问题包含当前版本和最新版本的 npm/Docker
版本、来自
`microsoft/playwright-mcp` 的简短发布说明摘要，以及上游完整变更日志、npm
包和 Docker 标签的链接。

在本地运行相同的检查，命令如下：

```bash
npm run upstream:check
```

## 发布标签

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## 检查清单

发布新闻稿之前：

- 仅在 `Actionlint` 和 `CI` 显示为绿色后才进行合并。
- 基于 `v1.2.7` 这样的标签创建 GitHub 发布版本。
- 发布 `next` npm 版本时，将其标记为预发布版本。
- 确认已为 `release.yml` 和
  `npm-production` 已配置 npm 受信任发布者。
- 确认 `npm-production`、`docker-production`、 `github-pages` 以及
  `mcp-registry-production` 环境是否存在。
- 若需上传 SARIF 报告，请确认已启用 GitHub 代码扫描功能。
- 首次发布 Docker 镜像后，请确认 GHCR 包的可见性设置为公开。
- 请确认 Glama 服务器已完成同步，并通过 Dockerfile 管理
  页面进行测试，且已发布为相同的稳定版本。

`SUPPORT.md` 已刻意推迟，直到该项目拥有超越 GitHub 问题跟踪和安全公告的稳定支持
政策为止。
