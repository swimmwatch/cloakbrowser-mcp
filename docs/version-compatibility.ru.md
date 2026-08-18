---
description: Таблица совместимости релизов cloakbrowser-mcp с версиями upstream Playwright MCP.
icon: material/source-branch-sync
tags:
  - Руководство пользователя
---

# Совместимость версий

`cloakbrowser-mcp` использует Semantic Versioning для собственных релизов. Контракты браузерных инструментов приходят из `@playwright/mcp`, поэтому каждый релиз фиксирует версию Playwright MCP, с которой он собирается и тестируется.

<!-- compatibility-table:start -->

| cloakbrowser-mcp | Зависимость @playwright/mcp | Docker-база Playwright MCP                 | Зависимость CloakBrowser | Node.js   | Транспорт              | Проверенные платформы                                                                            | Совместимость инструментов                |
| ---------------- | --------------------------- | ------------------------------------------ | ------------------------ | --------- | ---------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `1.12.0`          | `^0.0.79`                   | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.7`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 и 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.11.0`          | `^0.0.79`                   | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.6`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 и 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.10.0`          | `^0.0.78`                   | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 и 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.9.0`          | `^0.0.78`                   | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 и 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.8.0`          | `^0.0.78`                   | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 и 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.7.0`          | `^0.0.77`                   | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.6.1`          | `^0.0.77`                   | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.6.0`          | `^0.0.77`                   | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.5.0`          | `^0.0.76`                   | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.4.0`          | `^0.0.76`                   | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-инструменты сравниваются в CI.  |
| `1.3.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`                | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.2.7`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.2.6`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.2.5`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.2.3`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.2.2`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.2.1`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.2.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.1.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.0.2`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.0.1`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |
| `1.0.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-инструменты сравниваются в CI.  |

<!-- compatibility-table:end -->

## Как читать эту таблицу

- `cloakbrowser-mcp` — версия npm- и Docker-релиза этого проекта.
- `@playwright/mcp` — диапазон npm-зависимости, используемый CLI-пакетом.
- Docker-база Playwright MCP — upstream-образ, на котором основан Docker-образ проекта.
- Зависимость CloakBrowser — диапазон npm-зависимости для разрешения и установки бинарного файла CloakBrowser Chromium.
- `Node.js` — поддерживаемый диапазон runtime для npm-пакета.
- Транспорт — MCP-транспорт, который предоставляет мост.
- Проверенные платформы — платформы, покрытые CI и release smoke-тестами.
- Совместимость инструментов показывает, сравнивается ли стандартная upstream-поверхность Playwright MCP с официальным runtime.

Когда важна воспроизводимость, закрепляйте `cloakbrowser-mcp` точной версией вместо `latest`.

Docker-релизы сейчас публикуются для `linux/amd64` и `linux/arm64`. Browser parity сравнивается на `linux/amd64`; обе Docker-платформы проходят release smoke-тесты перед публикацией multi-platform manifest.
