---
description: Serveur d’automatisation de navigateur compatible Playwright MCP en drop-in, avec outils amont inchangés, CloakBrowser Chromium et packaging prêt pour npm, Docker et Streamable HTTP.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Premiers pas</a>
  <a class="md-button" href="comparison/">Comparaison</a>
  <a class="md-button" href="recipes/">Recettes</a>
</p>

# Serveur MCP de CloakBrowser

`cloakbrowser-mcp` est un serveur d’automatisation de navigateur compatible Playwright MCP en drop-in, avec outils amont inchangés, CloakBrowser Chromium et packaging prêt pour npm, Docker et Streamable HTTP. Il exécute l’amont `@playwright/mcp` comme surface canonique des outils navigateur et ajoute autour des fonctions d’exécution CloakBrowser orientées déploiement.

## Démo de 30 secondes

<div class="clb-demo-video">
<video controls preload="metadata" poster="assets/videos/30-second-demo-poster.png" aria-label="Démo de 30 secondes de CloakBrowser MCP">
<source src="assets/videos/30-second-demo.mp4" type="video/mp4">
</video>
</div>

<p class="clb-demo-caption">Regardez le premier lancement : démarrez le paquet npm, connectez un client MCP, demandez une recherche web, une automatisation ou des tests, puis inspectez le résultat dans un vrai navigateur.</p>

Utilisez-le lorsque vous voulez des outils navigateur compatibles Playwright MCP avec profils persistants, chargement d’extensions, validation de contexte, correspondance GeoIP de proxy pour la QA régionale ou saisie humanisée.

Version actuelle : {{ project.version_tag }}.

## Compatibilité entre versions

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.13.0` | `^0.0.80` | `mcr.microsoft.com/playwright/mcp:v0.0.80` | `^0.5.10` | stdio, Streamable HTTP | Comparé dans CI |
| `1.12.0`          | `^0.0.79`       | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.7`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.11.0`          | `^0.0.79`       | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.6`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.10.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.9.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.8.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`    | stdio, Streamable HTTP | Comparé dans CI |
| `1.7.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`     | stdio, Streamable HTTP | Comparé dans CI |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Comparé dans CI |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Comparé dans CI |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | Comparé dans CI |
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

## Parcours pratiques supplémentaires

Pour choisir entre Playwright MCP amont et ce paquet, consultez la [comparaison](comparison.md). Pour des tâches courtes, utilisez les [recettes](recipes/index.md): profil persistant, extensions, reverse proxy, QA régionale, Claude Desktop, Codex CLI et test smoke CI.
