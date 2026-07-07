---
title: Пашырэнне нагрузкі Chrome
description: Загрузіце распакаванае пашырэнне Chrome у CloakBrowser MCP з устойлівым профілем.
icon: material/puzzle
tags:
  - User Guide
---

# Пашырэнне нагрузкі Chrome

Пашырэнні Chrome патрабуюць распакаванага каталога пашырэнняў і пастаяннага профілю. Настаўленне абодвух перад запускам браўзэра.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Выкарыстоўвайце масіў JSON, калі шляхі ўтрымліваюць коскі, пры загрузцы некалькіх пашырэнняў або пры выкарыстанні шляхоў дыскавых літар Windows.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Перазагрузіць сервер пасля змены файлаў пашырэння або шляхоў пашырэння.

## Праверыць

Папытаеце кліента MCP адкрыць старонку, дзе пашырэнне павінна быць актыўным, а затым праверыць паводзіны старонкі або зрабіць скрыншот. Вы таксама можаце патэлефанаваць у `cloakbrowser_bridge_info`, каб пацвердзіць, што мост працуе з чаканай версіяй пакета.

## ЗВЯЗАНАЕ

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Persistent Login Profile](persistent-login-profile.md)
