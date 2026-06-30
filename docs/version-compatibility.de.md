---
description: Kompatibilitätszuordnung zwischen cloakbrowser-mcp-Releases und upstream Playwright-MCP-Versionen.
icon: material/source-branch-sync
tags:
  - Benutzerhandbuch
---

# Versionskompatibilität

`cloakbrowser-mcp` verwendet Semantic Versioning für eigene Releases. Browser-Tool-Verträge kommen aus `@playwright/mcp`, deshalb dokumentiert jedes Release die Playwright-MCP-Version, gegen die es gebaut und getestet wurde.

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp-Abhängigkeit | Playwright-MCP-Docker-Basis                | CloakBrowser-Abhängigkeit | Node.js   | Transport              | Getestete Plattformen                                                                          | Tool-Parität                         |
| ---------------- | ---------------------------- | ------------------------------------------ | ------------------------- | --------- | ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| `1.5.0`          | `^0.0.77`                    | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.3`                 | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-Tools in CI verglichen. |
| `1.4.0`          | `^0.0.76`                    | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`                 | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-Tools in CI verglichen. |
| `1.3.0`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.2.7`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.2.6`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.2.5`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.2.3`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.2.2`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.2.1`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.2.0`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.1.0`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.0.2`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.0.1`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |
| `1.0.0`          | `^0.0.75`                    | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                 | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Upstream-Tools in CI verglichen. |

<!-- compatibility-table:end -->

## So liest du diese Tabelle

- `cloakbrowser-mcp` ist die npm- und Docker-Release-Version dieses Projekts.
- `@playwright/mcp` ist der npm-Abhängigkeitsbereich des CLI-Pakets.
- Die Playwright-MCP-Docker-Basis ist das upstream Image, das dieses Projekt für sein Docker-Image nutzt.
- Die CloakBrowser-Abhängigkeit ist der npm-Bereich zum Auflösen und Installieren des CloakBrowser-Chromium-Binärs.
- `Node.js` ist der unterstützte runtime-Bereich des npm-Pakets.
- Transport ist der MCP-Transport, den diese Bridge bereitstellt.
- Getestete Plattformen sind durch CI und release smoke tests abgedeckt.
- Tool-Parität zeigt, ob die standardmäßige upstream Playwright-MCP-Tooloberfläche gegen die offizielle runtime verglichen wird.

Wenn Reproduzierbarkeit wichtig ist, pinne `cloakbrowser-mcp` auf eine exakte Version statt `latest`.

Docker-Releases veröffentlichen derzeit `linux/amd64` und `linux/arm64`. Browser parity wird auf `linux/amd64` verglichen; beide Docker-Plattformen erhalten release smoke tests, bevor ein multi-platform manifest veröffentlicht wird.
