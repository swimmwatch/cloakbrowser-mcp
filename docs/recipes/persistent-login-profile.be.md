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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Выкарыстоўваць кантэйнерныя шляхі ў зменных навакольнага асяроддзя. Шлях хаста выкарыстоўваецца толькі ў мацаванні `-v`.

## Праверыць

1. Папрасіце кліент MCP адкрыць старонку ўваходу і ўвайдзіце ў сістэму.
2. Карэктна спыніце сервер.
3. Запусціце яго зноў з тым жа `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Папрасіце кліент зноў адкрыць сайт і пераканайцеся, што стан уваходу захаваўся.

## ЗВЯЗАНАЕ

- [Канфігурацыя](../configuration.md#streamable-http-runtime-metadata)
- [Докер](../docker.md#persistent-profiles)
- [Загрузка пашырэння Chrome](load-chrome-extension.md)

## CloakBrowser 0.6.0

Калі stealth CloakBrowser уключаны, яўна наладжаны пастаянны профіль захоўвае fingerprint seed у `.cloakbrowser-seed`. Першы запуск пасля абнаўлення прызначае seed, калі файла няма. Яўны `--fingerprint`, у тым ліку `--fingerprint=off`, мае прыярытэт і не змяняе файл. Калі stealth выключаны, файл не змяняецца. Пашкоджаны файл аднаўляецца з папярэджаннем; памылка доступу да файла спыняе запуск.
