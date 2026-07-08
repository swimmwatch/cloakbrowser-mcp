---
description: Drop-in совместимый с Playwright MCP сервер браузерной автоматизации с неизменёнными upstream-инструментами, CloakBrowser Chromium и готовой упаковкой npm, Docker и Streamable HTTP.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Начать</a>
  <a class="md-button" href="comparison/">Сравнение</a>
  <a class="md-button" href="recipes/">Рецепты</a>
</p>

# Сервер CloakBrowser MCP

`cloakbrowser-mcp` — это drop-in совместимый с Playwright MCP сервер браузерной автоматизации с неизменёнными upstream-инструментами, CloakBrowser Chromium и готовой упаковкой npm, Docker и Streamable HTTP. Он запускает upstream `@playwright/mcp` как каноническую поверхность браузерных инструментов и добавляет вокруг неё возможности запуска CloakBrowser для развёртывания.

## 30-секундная демонстрация

<div class="clb-demo-video">
<video controls preload="metadata" poster="assets/videos/30-second-demo-poster.png" aria-label="30-секундная демонстрация CloakBrowser MCP">
<source src="assets/videos/30-second-demo.mp4" type="video/mp4">
</video>
</div>

<p class="clb-demo-caption">Посмотрите первый запуск: запустите npm-пакет, подключите MCP-клиент, попросите выполнить веб-исследование, автоматизацию или тестирование и проверьте результат в настоящем браузере.</p>

Используйте его, когда нужны совместимые с Playwright MCP браузерные инструменты плюс постоянные профили, загрузка расширений, проверка контекста, сопоставление GeoIP прокси для регионального QA или человекоподобный ввод для чувствительных к взаимодействию сценариев.

Текущая версия: {{ project.version_tag }}.

## Совместимость версий

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.7.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`     | stdio, Streamable HTTP | Сравнивается в CI |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Сравнивается в CI |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Сравнивается в CI |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | Сравнивается в CI |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Сравнивается в CI |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Сравнивается в CI |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Сравнивается в CI |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Сравнивается в CI |

<!-- compatibility-table:end -->

См. раздел [Совместимость версий](version-compatibility.md), где приведено актуальное сопоставление релизов данного проекта по стандарту SemVer и версий исходного проекта Playwright MCP.

## Что это такое

<div class="grid cards" markdown>

- :material-connection: **Среда выполнения моста**

  Запускает upstream Playwright MCP как дочерний процесс и пересылает вызовы браузерных инструментов без изменений.

- :material-incognito: **Запуск CloakBrowser**

  Создает конфигурацию Playwright MCP, где `launchOptions.executablePath` указывает на CloakBrowser.

- :fontawesome-brands-node-js: **npm CLI**

  Поставляется как тонкий CLI-пакет Node.js для MCP-клиентов stdio и Streamable HTTP.

- :fontawesome-brands-docker: **Образ Docker**

  Основан на официальном образе Playwright MCP и предварительно загружает кэш бинарного файла CloakBrowser.

- :material-map-marker-radius: **Сопоставление GeoIP прокси**

  Согласует часовой пояс, язык и локаль отпечатка CloakBrowser с настроенным местоположением прокси.

- :material-gesture-tap: **Человекообразное поведение ввода**

  Направляет взаимодействия со страницей через слой CloakBrowser для человекоподобной работы мыши, клавиатуры и прокрутки.

</div>

## Поверхность инструмента

Определяющими являются контракты инструмента Playwright MCP, расположенные выше по цепочке. В рамках данного проекта добавляются лишь два локальных инструмента интроспекции:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Следующие шаги

- [Начало работы](getting-started.md) — настройка npm, Docker и клиента MCP.
- [Настройка](configuration.md) поддерживаемых переменных среды.
- [Сопоставление прокси по GeoIP](geoip-proxy-matching.md) для регионального контроля качества, метаданных прокси во время выполнения и HTTP-сессий Streamable с несколькими местоположениями.
- [Гуманизированное поведение ввода](humanized-input-behavior.md) для реалистичности взаимодействия, настройки и сценариев использования.
- [Инструменты](tools.md) для соответствия ожиданиям в отношении интерфейса инструментов и согласованности с исходным кодом.
- [Часто задаваемые вопросы](faq.md) по типичным вопросам об установке, Docker, совместимости и безопасности.
- [Руководство для участников](contributor-guide.md) с подробностями о разработке, тестировании, архитектуре и выпусках.

## Дополнительные практические сценарии

Для выбора между upstream Playwright MCP и этим пакетом используйте [сравнение](comparison.md). Для быстрых задач используйте [рецепты](recipes/index.md): постоянный профиль, расширения, reverse proxy, региональное QA, Claude Desktop, Codex CLI и smoke-тест CI.
