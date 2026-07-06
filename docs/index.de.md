---
description: Playwright-MCP-kompatibler Browserautomationsserver als Drop-in, mit unveränderten upstream Tools, CloakBrowser Chromium und produktionsreifer Paketierung für npm, Docker und Streamable HTTP.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Erste Schritte</a>
  <a class="md-button" href="comparison/">Vergleich</a>
  <a class="md-button" href="recipes/">Rezepte</a>
</p>

# CloakBrowser MCP-Server

`cloakbrowser-mcp` ist ein Playwright-MCP-kompatibler Browserautomationsserver als Drop-in, mit unveränderten upstream Tools, CloakBrowser Chromium und produktionsreifer Paketierung für npm, Docker und Streamable HTTP. Er führt upstream `@playwright/mcp` als kanonische Browser-Tool-Oberfläche aus und ergänzt deployment-orientierte CloakBrowser-Ausführungsfunktionen.

## 30-Sekunden-Demo

<div class="clb-demo-video">
  <video controls playsinline preload="metadata" poster="assets/videos/30-second-demo-poster.png">
    <source src="assets/videos/30-second-demo.mp4" type="video/mp4" />
    <a href="assets/videos/30-second-demo.mp4">Demo-Video herunterladen.</a>
  </video>
</div>

<p class="clb-demo-caption">Sehen Sie den ersten Lauf: Starten Sie das npm-Paket, verbinden Sie einen MCP-Client, bitten Sie um Web-Recherche, Automatisierung oder Tests und prüfen Sie das Ergebnis im echten Browser.</p>

Nutzen Sie ihn, wenn Sie Playwright-MCP-kompatible Browsertools plus persistente Profile, Erweiterungen, Kontextvalidierung, GeoIP-Proxy-Abgleich für regionale QA oder humanisierte Eingabe benötigen.

Aktuelle Version: {{ project.version_tag }}.

## Versionskompatibilität

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`     | stdio, Streamable HTTP | In CI verglichen |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | In CI verglichen |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | In CI verglichen |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | In CI verglichen |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | In CI verglichen |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | In CI verglichen |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | In CI verglichen |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | In CI verglichen |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | In CI verglichen |

<!-- compatibility-table:end -->

Unter [Versionskompatibilität](version-compatibility.md) finden Sie die gepflegte Zuordnung zwischen den SemVer-Versionen dieses Projekts und den Upstream-Versionen von Playwright MCP.

## Was es ist

<div class="grid cards" markdown>

- :material-connection: **Bridge-Laufzeit**

  Startet upstream Playwright MCP als Kindprozess und leitet Browser-Tool-Aufrufe unverändert weiter.

- :material-incognito: **CloakBrowser-Ausführung**

  Erzeugt eine Playwright-MCP-Konfiguration, in der `launchOptions.executablePath` auf CloakBrowser gesetzt ist.

- :fontawesome-brands-node-js: **npm CLI**

  Wird als schlankes Node.js-CLI-Paket für stdio- und Streamable-HTTP-MCP-Clients veröffentlicht.

- :fontawesome-brands-docker: **Docker-Image**

  Basiert auf dem offiziellen Playwright-MCP-Image und lädt den CloakBrowser-Binärcache vor.

- :material-map-marker-radius: **GeoIP-Proxy-Abgleich**

  Gleicht Zeitzone, Sprache und Locale-Fingerprint-Flags von CloakBrowser mit dem konfigurierten Proxy-Standort ab.

- :material-gesture-tap: **Humanisiertes Eingabeverhalten**

  Leitet Seiteninteraktionen über die menschenähnliche Maus-, Tastatur- und Scroll-Ebene von CloakBrowser.

</div>

## Werkzeugoberfläche

Die Verträge des vorgelagerten Playwright-MCP-Tools sind maßgebend. Dieses Projekt fügt lediglich zwei lokale Introspektions-Tools hinzu:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Nächste Schritte

- [Erste Schritte](getting-started.md) zur Konfiguration von npm, Docker und dem MCP-Client.
- [Konfiguration](configuration.md) für unterstützte Umgebungsvariablen.
- [GeoIP-Proxy-Zuordnung](geoip-proxy-matching.md) für regionale Qualitätssicherung, Proxy-Metadaten zur Laufzeit und Streamable-HTTP-Sitzungen an mehreren Standorten.
- [Humanisiertes Eingabeverhalten](humanized-input-behavior.md) für realistische Interaktion, Einrichtung und Anwendungsfälle.
- [Tools](tools.md) für Erwartungen an die Tool-Oberfläche und Upstream-Parität.
- [FAQ](faq.md) zu häufigen Fragen zu Installation, Docker, Kompatibilität und Sicherheit.
- [Leitfaden für Mitwirkende](contributor-guide.md) mit Details zu Entwicklung, Tests, Architektur und Veröffentlichungen.

## Weitere praktische Pfade

Für die Entscheidung zwischen upstream Playwright MCP und diesem Paket nutzen Sie den [Vergleich](comparison.md). Für kurze Aufgaben nutzen Sie die [Rezepte](recipes/index.md): persistentes Profil, Erweiterungen, reverse proxy, regionale QA, Claude Desktop, Codex CLI und CI-Smoke-Test.
