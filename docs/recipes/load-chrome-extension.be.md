---
title: Загрузка пашырэння Chrome
description: Загрузіце распакаванае пашырэнне Chrome у CloakBrowser MCP з устойлівым профілем.
icon: material/puzzle
tags:
  - User Guide
---

# Загрузка пашырэння Chrome

Пашырэнні Chrome патрабуюць распакаванага каталога пашырэнняў і пастаяннага профілю. Настаўленне абодвух перад запускам браўзэра.

Гэты рэцэпт выкарыстоўвае запуск распакаванага пашырэння CloakBrowser. Рэжым падключэння праз асобна ўсталяванае афіцыйнае Playwright Extension выкарыстоўвае `PLAYWRIGHT_MCP_EXTENSION=true`, process-level `PLAYWRIGHT_MCP_EXTENSION_TOKEN` і асобны persistent profile. Не спалучайце гэтыя механізмы.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Выкарыстоўвайце масіў JSON, калі шляхі ўтрымліваюць коскі, пры загрузцы некалькіх пашырэнняў або пры выкарыстанні шляхоў дыскавых літар Windows.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Перазагрузіць сервер пасля змены файлаў пашырэння або шляхоў пашырэння.

## Праверыць

Папрасіце кліент MCP адкрыць старонку, на якой павінна працаваць пашырэнне, затым праверце паводзіны старонкі або зрабіце здымак экрана. Таксама можна выклікаць `cloakbrowser_bridge_info`, каб праверыць чаканую версію пакета моста.

## ЗВЯЗАНАЕ

- [Канфігурацыя](../configuration.md#chrome-extensions)
- [Докер](../docker.md#chrome-extensions)
- [Пастаянны профіль уваходу](persistent-login-profile.md)
