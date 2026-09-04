---
description: Mapa de compatibilidad entre versiones de cloakbrowser-mcp y versiones upstream de Playwright MCP.
icon: material/source-branch-sync
tags:
  - Guía de usuario
---

# Compatibilidad de versiones

`cloakbrowser-mcp` sigue Semantic Versioning para sus propios releases. Los contratos de herramientas de navegador vienen de `@playwright/mcp`, por lo que cada release registra la versión de Playwright MCP con la que se compila y se prueba.

<!-- compatibility-table:start -->

| cloakbrowser-mcp | Dependencia @playwright/mcp | Base Docker de Playwright MCP              | Dependencia CloakBrowser | Node.js   | Transporte             | Plataformas probadas                                                                            | Paridad de herramientas                   |
| ---------------- | --------------------------- | ------------------------------------------ | ------------------------ | --------- | ---------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `1.13.0` | `^0.0.80` | `mcr.microsoft.com/playwright/mcp:v0.0.80` | `^0.5.10` | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 y 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.12.0`          | `^0.0.79`                   | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.7`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 y 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.11.0`          | `^0.0.79`                   | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.6`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 y 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.10.0`          | `^0.0.78`                   | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 y 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.9.0`          | `^0.0.78`                   | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 y 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.8.0`          | `^0.0.78`                   | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 y 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.7.0`          | `^0.0.77`                   | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.6.1`          | `^0.0.77`                   | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.6.0`          | `^0.0.77`                   | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.5.0`          | `^0.0.76`                   | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.4.0`          | `^0.0.76`                   | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Herramientas upstream comparadas en CI. |
| `1.3.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`                | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.2.7`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.2.6`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.2.5`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.2.3`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.2.2`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.2.1`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.2.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.1.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.0.2`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.0.1`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |
| `1.0.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Herramientas upstream comparadas en CI. |

<!-- compatibility-table:end -->

## Cómo leer esta tabla

- `cloakbrowser-mcp` es la versión de release npm y Docker de este proyecto.
- `@playwright/mcp` es el rango de dependencia npm usado por el paquete CLI.
- La base Docker de Playwright MCP es la imagen upstream usada por la imagen Docker del proyecto.
- La dependencia CloakBrowser es el rango npm usado para resolver e instalar el binario Chromium de CloakBrowser.
- `Node.js` es el rango de runtime admitido por el paquete npm.
- Transporte es el transporte MCP expuesto por este puente.
- Plataformas probadas son las plataformas cubiertas por CI y smoke tests de release.
- Paridad de herramientas indica si la superficie upstream predeterminada de Playwright MCP se compara con el runtime oficial.

Cuando la reproducibilidad importe, fija `cloakbrowser-mcp` por versión exacta en lugar de usar `latest`.

Los releases Docker publican actualmente `linux/amd64` y `linux/arm64`. La paridad del navegador se compara en `linux/amd64`; ambas plataformas Docker reciben smoke tests de release antes de publicar un multi-platform manifest.
