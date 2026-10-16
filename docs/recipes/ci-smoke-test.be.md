---
title: Базавая праверка CI
description: Дадайце лёгкую базавую праверку CI, якая правярае дыягностыку пакета CloakBrowser MCP і гатоўнасць Streamable HTTP.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# Базавая праверка CI

Выкарыстоўвайце базавую праверку, каб выявіць адсутную залежнасць выканання, перш чым кліент MCP паспрабуе выкарыстаць інструменты браўзера.

## Праверка пакетаў npm

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

Гэта правярае Node.js, метаданыя пакета, фактычны upstream CLI Playwright MCP, вызначаныя версіі і шляхі пакетаў `@playwright/mcp`, `playwright` і `playwright-core`, фактычны шлях да core bundle і метаданыя бінарнага файла CloakBrowser без запуску брыджа.

## Зонд Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000 &
server_pid=$!

for attempt in 1 2 3 4 5; do
  curl -fsS http://127.0.0.1:3000/readyz && break
  sleep 1
done

kill "$server_pid"
wait "$server_pid" || true
```

Выкарыстоўвайце гэта толькі ў кароткачасовай задачы CI. Для базавай праверкі ў асяроддзі, падобным да рабочага, запусціце той жа запыт да Docker-вобраза і кропкі ўваходу разгортвання, якія вы фактычна пастаўляеце.

## Праверка пакетаў Docker

```bash
docker run --rm \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## ЗВЯЗАНАЕ

- [Пачатак працы](../getting-started.md)
- [Докер](../docker.md#build-locally)
- [Тэставанне](../testing.md)
