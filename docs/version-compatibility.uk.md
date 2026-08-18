---
description: Таблиця сумісності релізів cloakbrowser-mcp із версіями upstream Playwright MCP.
icon: material/source-branch-sync
tags:
  - Посібник користувача
---

# Сумісність версій

`cloakbrowser-mcp` використовує Semantic Versioning для власних релізів. Контракти браузерних інструментів надходять із `@playwright/mcp`, тому кожен реліз фіксує версію Playwright MCP, з якою він збирається та тестується.

<!-- compatibility-table:start -->

| cloakbrowser-mcp | Залежність @playwright/mcp | Docker-база Playwright MCP                 | Залежність CloakBrowser | Node.js   | Транспорт              | Перевірені платформи                                                                            | Сумісність інструментів                 |
| ---------------- | -------------------------- | ------------------------------------------ | ----------------------- | --------- | ---------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------- |
| `1.12.0`          | `^0.0.79`                  | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.7`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 і 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.11.0`          | `^0.0.79`                  | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.6`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 і 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.10.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 і 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.9.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 і 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.8.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 і 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.7.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.6.1`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.6.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.5.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.4.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменти порівнюються в CI. |
| `1.3.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`               | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.2.7`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.2.6`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.2.5`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.2.3`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.2.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.2.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.2.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.1.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.0.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.0.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |
| `1.0.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменти порівнюються в CI. |

<!-- compatibility-table:end -->

## Як читати цю таблицю

- `cloakbrowser-mcp` — версія npm- і Docker-релізу цього проекту.
- `@playwright/mcp` — діапазон npm-залежності, який використовує CLI-пакет.
- Docker-база Playwright MCP — upstream-образ, на якому базується Docker-образ проекту.
- Залежність CloakBrowser — діапазон npm-залежності для визначення та встановлення бінарного файлу CloakBrowser Chromium.
- `Node.js` — підтримуваний runtime-діапазон для npm-пакета.
- Транспорт — MCP-транспорт, який надає міст.
- Перевірені платформи — платформи, покриті CI та release smoke-тестами.
- Сумісність інструментів показує, чи порівнюється стандартна upstream-поверхня Playwright MCP з офіційним runtime.

Коли важлива відтворюваність, закріплюйте `cloakbrowser-mcp` точною версією замість `latest`.

Docker-релізи зараз публікуються для `linux/amd64` і `linux/arm64`. Browser parity порівнюється на `linux/amd64`; обидві Docker-платформи проходять release smoke-тести перед публікацією multi-platform manifest.
