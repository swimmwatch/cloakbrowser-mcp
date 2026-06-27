---
title: Menschliches Eingabeverhalten
description: Aktivieren Sie das menschenähnliche Maus-, Tastatur- und Scrollverhalten von CloakBrowser für interaktionssensitive QA- und Streamable-HTTP-Sitzungen.
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# Menschliches Eingabeverhalten

Durch das humanisierte Eingabeverhalten werden Seiteninteraktionen über die
menschähnliche Maus-, Tastatur- und Scroll-Ebene von CloakBrowser geleitet. Dies ist nützlich, wenn die Qualitätssicherung ein
realistischeres Tempo, realistischere Zeigerbewegungen, eine realistischere Tippgeschwindigkeit und ein realistischeres Scrollverhalten benötigt, als
es die Standardautomatisierung bietet.

Die Brücke fügt keine neuen Browser-Tools hinzu und verändert auch nicht die Upstream-Schemas von Playwright MCP.
Sie wendet den Patch für die Seiteninteraktion von CloakBrowser während der Initialisierung der Playwright-MCP-Seite an,
sodass bestehende Tools weiterhin mit denselben Eingaben funktionieren.

## Was sich dadurch ändert

Wenn `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` aktiviert ist, kann CloakBrowser gängige Seitenaktionen
humanisieren, darunter:

- Mausbewegungen und Klicks;
- Tastatureingaben und Tastenanschläge;
- Ausfüllen von Formularen und Wechseln zwischen Feldern;
- Scrollen und das Verhalten beim Scrollen zu einem bestimmten Element.

Dies wirkt sich auf das Timing der Interaktionen und die Bewegungsmuster aus. Es hat keine Auswirkungen auf den Seiteninhalt,
die Netzwerkweiterleitung, die Proxy-Einstellungen oder die Standortbestimmung des Browsers.

## Globale Einstellungen

Verwenden Sie die Umgebungsvariable, wenn jede stdio-Sitzung oder jede standardmäßige Streamable-HTTP-
Sitzung ein benutzerfreundliches Verhalten anwenden soll:

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

Die gleiche Einstellung funktioniert auch mit dem expliziten CLI-Flag:

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## Docker-Einrichtung

Übergeben Sie dieselbe Umgebungsvariable an den Container:

```bash
docker run --rm --init -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Bei „Streamable HTTP“ in Docker wird die Umgebungsvariable zur Standardeinstellung für
neue HTTP-Sitzungen:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Einrichtung von „Streamable HTTP“ pro Sitzung

Streamable-HTTP-Clients können bei der Initialisierung der MCP-Sitzung
ein „humanisiertes“ Verhalten wählen. Dadurch kann ein Server das Standardverhalten mit dem
„humanisierten“ Interaktionsverhalten vergleichen, ohne neu gestartet werden zu müssen.

Senden Sie die Bridge-Metadaten in der Anfrage `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`humanize` überschreibt die Einstellung auf Prozessebene für diese HTTP-Sitzung. Verwenden Sie
`true`, um ein benutzerfreundliches Verhalten zu aktivieren, oder `false`, um es zu deaktivieren, selbst wenn der
Server mit `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` gestartet wurde.

`humanPreset` akzeptiert `default` oder `careful` und wählt die CloakBrowser-Voreinstellung für menschliches
Verhalten für die Sitzung aus. Es aktiviert das humanisierte Verhalten nicht
von selbst; sondern muss `humanize: true` festgelegt oder `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` aktiviert werden.
Die Voreinstellung `careful` ist langsamer und vorsichtiger als `default`.

Bestehende HTTP-Sitzungen sind unveränderlich. Erstellen Sie eine weitere „Streamable“-HTTP-Sitzung, um
zwischen dem Standardverhalten und dem humanisierten Verhalten zu wechseln.

## Anwendungsfälle

<div class="grid cards" markdown>

- :material-form-textbox: **Formular-QA**

  Prüfe Tippen, Ausfüllen, Fokuswechsel und Validierungsabläufe mit realistischerer
  Tastaturkadenz.

- :material-cart-check: **Checkout-Abläufe**

  Teste interaktionsreiche Kaufpfade, bei denen Timing von Tippen, Klicken und
  Feldwechseln die clientseitige Validierung beeinflussen kann.

- :material-shield-search: **Interaktionssensible UI-Prüfungen**

  Vergleiche Standardautomatisierung mit humanisierter Interaktion, wenn eine Seite
  anders auf sehr schnelle oder perfekt lineare Eingaben reagiert.

- :material-mouse-scroll-wheel: **Scroll-intensive Seiten**

  Prüfe lange Seiten, Feeds, Produktlisten und lazy-loading Inhalte mit
  sanfterem Scrollverhalten.

- :material-presentation-play: **Demos und Aufzeichnungen**

  Erzeuge Browser-Sitzungen, die bei Produktdemos, walkthroughs oder aufgezeichneten
  QA-Nachweisen weniger mechanisch wirken.

</div>

## Rangfolge und Grenzen

| Bereich | Verhalten |
| --- | --- |
| Stdio | Verwendet nur Umgebungsvariablen und CLI-Flags auf Prozessebene. |
| Streamable-HTTP-Standard | Verwendet Umgebungsvariablen und CLI-Flags auf Prozessebene, wenn keine runtime-Metadaten angegeben sind. |
| Streamable-HTTP-Metadaten | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` kann humanisiertes Verhalten für eine Sitzung überschreiben. `humanPreset` kann `default` oder `careful` auswählen. |
| Bestehende Sitzungen | Behalten die während `initialize` erfasste humanize-Einstellung. |
| Browser-Engine | Gilt nur bei `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak`. |
| Tool-Schemata | Upstream Playwright-MCP-Browser-Tool-Schemata bleiben unverändert. |
| Benutzerdefinierte Konfiguration | `humanConfig` wird absichtlich noch nicht akzeptiert; strukturierte Konfiguration benötigt ein explizites Validierungsschema. |

Diese Funktion ist für legitime Qualitätssicherung, die Überprüfung des Interaktionsrealismus und Konsistenztests
vorgesehen. Sie sollte nicht als Möglichkeit zur Umgehung von Zugriffskontrollen oder Richtlinienprüfungen
betrachtet werden.

## Zugehörige Konfiguration

- [Konfiguration](configuration.md) listet alle Bridge- und Upstream-Umgebungsvariablen auf.
- [GeoIP-Proxy-Zuordnung](geoip-proxy-matching.md) erläutert regionenkonsistente Proxy-Profile.
- [Tools](tools.md) erläutert, warum Upstream-Browser-Tools von Playwright MCP unverändert weitergeleitet werden.
