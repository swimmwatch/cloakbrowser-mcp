---
title: Пастаянны профіль уваходу
description: Паўторна выкарыстоўвайце файлы cookie CloakBrowser, лакальнае сховішча, кэш і стан пашырэння, запусціўшы CloakBrowser MCP з пастаянным каталогам профілю.
icon: material/account-key
tags:
  - User Guide
---

# Пастаянны профіль уваходу

Выкарыстоўвайце пастаянны профіль, калі кліент MCP павінен захоўваць файлы cookie, лакальнае сховішча, кэш або стан пашырэння паміж сесіямі браўзэра.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Пакажыце кліента MCP па той жа камандзе stdio. Трымаеце адзін актыўны сервер у каталогу профілю; мост адхіляе дубляванае актыўнае выкарыстанне, каб знізіць рызыку карупцыі профілю Chromium.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Выкарыстоўваць кантэйнерныя шляхі ў зменных навакольнага асяроддзя. Шлях хаста выкарыстоўваецца толькі ў мацаванні `-v`.

## Праверыць

1. Папытаеце кліента MCP адкрыць старонку ўваходу і ўвайсці.
2. Спыніць сервер чыста.
3. Запусціце яго зноў з тым жа `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Папрасіце кліента перагледзець сайт і пацвердзіць, што стан уваходу ўсё яшчэ прысутнічае.

## ЗВЯЗАНАЕ

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Load Chrome Extension](load-chrome-extension.md)
