---
description: CloakBrowser MCP est une passerelle Playwright MCP destinée à l'automatisation des navigateurs avec CloakBrowser, Docker, Streamable HTTP, des sessions proxy tenant compte de la localisation géographique (GeoIP) et un comportement de saisie humanisé.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Premiers pas</a>
  <a class="md-button" href="tools/">Outils</a>
  <a class="md-button" href="docker/">Docker</a>
</p>

# Serveur MCP de CloakBrowser

`cloakbrowser-mcp` est un serveur d’automatisation de navigateur basé sur le protocole Model Context Protocol (MCP) qui s’exécute en amont de `@playwright/mcp` avec le binaire CloakBrowser Chromium. Utilisez-le lorsque vous avez besoin d’outils de navigateur compatibles avec le protocole MCP de Playwright, de l’exécution de CloakBrowser, d’une installation via npm, d’images Docker, de sessions HTTP streamables, d’une correspondance de proxy tenant compte de l’adresse GeoIP pour l’assurance qualité régionale, ou d’un comportement de saisie humanisé pour les flux sensibles aux interactions.

Version actuelle : {{ project.version_tag }}.

## Compatibilité entre versions

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.5.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.3`     | stdio, Streamable HTTP | Comparé dans CI |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Comparé dans CI |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Comparé dans CI |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Comparé dans CI |

<!-- compatibility-table:end -->

Consultez la page [Compatibilité des versions](version-compatibility.md) pour connaître la correspondance mise à jour entre les versions SemVer de ce projet et les versions en amont de Playwright MCP.

## De quoi s'agit-il ?

<div class="grid cards" markdown>

- :material-connection: **Runtime du pont**

  Démarre upstream Playwright MCP comme processus enfant et transmet les appels aux outils du navigateur sans modification.

- :material-incognito: **Exécution de CloakBrowser**

  Génère une configuration Playwright MCP avec `launchOptions.executablePath` pointant vers CloakBrowser.

- :fontawesome-brands-node-js: **npm CLI**

  Publié comme paquet CLI Node.js léger pour les clients MCP stdio et Streamable HTTP.

- :fontawesome-brands-docker: **Image Docker**

  Basé sur l'image officielle Playwright MCP et précharge le cache du binaire CloakBrowser.

- :material-map-marker-radius: **Correspondance GeoIP du proxy**

  Aligne le fuseau horaire, la langue et la locale de l'empreinte CloakBrowser sur l'emplacement du proxy configuré.

- :material-gesture-tap: **Comportement de saisie humanisé**

  Fait passer les interactions de page par la couche de souris, clavier et défilement humanisée de CloakBrowser.

</div>

## Surface de l'outil

Les contrats de l'outil Playwright MCP en amont font autorité. Ce projet n'ajoute que deux outils d'introspection locaux :

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Prochaines étapes

- [Mise en route](getting-started.md) pour la configuration de npm, Docker et du client MCP.
- [Configuration](configuration.md) des variables d'environnement prises en charge.
- [Correspondance de proxy GeoIP](geoip-proxy-matching.md) pour l'assurance qualité régionale, les métadonnées de proxy d'exécution et les sessions HTTP Streamable multi-sites.
- [Comportement d'entrée humanisé](humanized-input-behavior.md) pour le réalisme des interactions, la configuration et les cas d'utilisation.
- [Outils](tools.md) pour les attentes en matière d’interface utilisateur et la parité en amont.
- [FAQ](faq.md) pour les questions courantes sur l’installation, Docker, la parité et la sécurité.
- [Guide du contributeur](contributor-guide.md) pour les détails relatifs au développement, aux tests, à l'architecture et aux versions.
