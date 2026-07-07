---
title: Тэст дыму CI
description: Дадайце лёгкі тэст дыму CI, які правярае дыягностыку пакета CloakBrowser MCP і гатоўнасць Streamable HTTP.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# Тэст дыму CI

Выкарыстоўвайце тэст дыму, каб злавіць згубленую залежнасць падчас выканання, перш чым кліент MCP паспрабуе выкарыстаць інструменты браўзэра.

## Праверка пакетаў npm

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

Гэта правярае Node.js, метададзеныя пакета, дазвол Playwright MCP CLI уверх па плыні і двайковыя метададзеныя CloakBrowser без запуску моста.

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

Выкарыстоўвайце гэта толькі ў кароткачасовай працы CI. Для вытворчых выпрабаванняў, падобных на дым, запусціце той жа зонд супраць выявы Docker і пункта ўводу разгортвання, які вы фактычна адгружаеце.

## Праверка пакетаў Docker

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## ЗВЯЗАНАЕ

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
