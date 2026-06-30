---
description: Correspondance de compatibilité entre les releases de cloakbrowser-mcp et les versions upstream de Playwright MCP.
icon: material/source-branch-sync
tags:
  - Guide utilisateur
---

# Compatibilité des versions

`cloakbrowser-mcp` suit Semantic Versioning pour ses propres releases. Les contrats d'outils navigateur proviennent de `@playwright/mcp`, donc chaque release indique la version de Playwright MCP utilisée pour la construction et les tests.

<!-- compatibility-table:start -->

| cloakbrowser-mcp | Dépendance @playwright/mcp | Base Docker Playwright MCP                 | Dépendance CloakBrowser | Node.js   | Transport              | Plateformes testées                                                                            | Parité des outils                     |
| ---------------- | -------------------------- | ------------------------------------------ | ----------------------- | --------- | ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| `1.5.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.3`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Outils upstream comparés dans CI. |
| `1.4.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Outils upstream comparés dans CI. |
| `1.3.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`               | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.2.7`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.2.6`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.2.5`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.2.3`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.2.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.2.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.2.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.1.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.0.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.0.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |
| `1.0.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Outils upstream comparés dans CI. |

<!-- compatibility-table:end -->

## Comment lire ce tableau

- `cloakbrowser-mcp` est la version de release npm et Docker de ce projet.
- `@playwright/mcp` est la plage de dépendance npm utilisée par le paquet CLI.
- La base Docker Playwright MCP est l'image upstream utilisée par l'image Docker du projet.
- La dépendance CloakBrowser est la plage npm utilisée pour résoudre et installer le binaire Chromium de CloakBrowser.
- `Node.js` est la plage runtime prise en charge par le paquet npm.
- Transport est le transport MCP exposé par ce pont.
- Les plateformes testées sont couvertes par CI et les smoke tests de release.
- La parité des outils indique si la surface upstream par défaut de Playwright MCP est comparée au runtime officiel.

Lorsque la reproductibilité est importante, fixez `cloakbrowser-mcp` à une version exacte au lieu d'utiliser `latest`.

Les releases Docker publient actuellement `linux/amd64` et `linux/arm64`. Browser parity est comparée sur `linux/amd64`; les deux plateformes Docker reçoivent des smoke tests de release avant la publication d'un multi-platform manifest.
