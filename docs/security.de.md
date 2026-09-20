---
description: Sicherheitsmodell und Risikohinweise für Browserautomatisierung mit CloakBrowser MCP, Docker-Isolation, Artefakten, Secrets und Netzwerkfreigabe.
icon: material/shield-lock
tags:
  - Sicherheit
  - Benutzerhandbuch
---

# Sicherheit

Dieses Projekt ist eine Bridge für Browserautomatisierung. Behandle es als Infrastruktur zur Ausführung vertrauenswürdigen Codes.

## Verwaltete CDP Sicherheit { #managed-cdp-security }

Managed CDP ist standardmäßig deaktiviert. Es bietet beliebige Chromium DevTools-Steuerung,
kein reduziertes Browser-Tool API. Aktivieren Sie es nur für vertrauenswürdige Clients. Die Funktion in
`cloakbrowser_bridge_info.cdp.discoveryUrl` ist ein Trägernachweis: notieren Sie ihn nicht,
Speichern Sie es in Tickets oder teilen Sie es zwischen Sitzungen. Es dreht sich nach dem Austausch des Browsers
und ein alter URL geht niemals in die Ersatzgeneration über.

Eine Nicht-Loopback-CDP-Bindung erfordert sowohl `--cdp-allow-remote` als auch eine konkret angegebene Anzeige
Host. Fügen Sie Netzwerkzugriffskontrollen um den veröffentlichten Port hinzu. Auswahl
`--cdp-advertised-scheme https` stellt TLS nicht bereit. Der verwaltete Listener und
Chromium hop bleibt Klartext; ein vom Betreiber betriebener gleichportiger TLS-Terminator muss erhalten bleiben
die beworbenen `Host`- und `Origin`-Berechtigungen und die Aufrechterhaltung einer Eins-zu-Eins-Routing-Verbindung zu dem
Sitzung besitzen.

Laufzeitprotokolle enthalten niemals Fähigkeitswege, Ziel-IDs, CDP-Nutzlasten, Browserdaten,
Cookies, rohe `Host`- oder `Origin`-Werte oder Profilpfade. Abgelehnte Sicherheitsprüfungen sind
nur als sitzungsbezogene `cdp_security_rejections`-Warnung mit 60 Sekunden gemeldet
Sättigende Zählungen für `capability`, `host` und `origin`; Aufräumvorgänge spülen alles Übrige
zählt. Erfolgreiche Überprüfungen erzeugen keine Prüfungsaufzeichnungen pro Anfrage.

### Feste Grenzen

Limits gelten unabhängig für jede CDP-aktivierte MCP-Sitzung:

| Grenze | Grenze |
| --- | --- |
| Aktive vermittelte WebSocket-Verbindungen, einschließlich laufender Handshakes | 8 |
| Gleichzeitige Pre-Upgrade HTTP-Anfragen | 16 |
| Anforderungsheader | 16 KiB |
| Anfrageinhalt auf unterstützten Routen | Nicht erlaubt |
| Pufferte Chromium HTTP Antwort | 4 MiB |
| Eingehende oder ausgehende WebSocket-Nachricht | 16 MiB |
| Warteschlangen nicht gesendeter WebSocket-Daten pro Richtung | 16 MiB |
| Anforderungs-Header, Upstream HTTP-Antwort oder WebSocket-Handschlag | 10 Sekunden |
| Anmutiges Herunterfahren des Proxys vor dem erzwungenen Schließen | 5 Sekunden |
| Lokaler Fehlermeldungskörper | 8 KiB |

### HTTP Fehler

Lokale Fehler verwenden JSON `{"error":{"code":"...","message":"..."}}` mit
`Cache-Control: no-store`, `Content-Type: application/json; charset=utf-8` und ein
exakt `Content-Length`. Methodenfehler beinhalten auch `Allow`. Die stabilen Zuordnungen sind:

| Status | Code |
| --- | --- |
| `400` | `bad_request` |
| `403` | `forbidden` |
| `404` | `not_found` |
| `405` | `method_not_allowed` |
| `408` | `request_timeout` |
| `413` | `payload_too_large` |
| `431` | `headers_too_large` |
| `500` | `internal_error` |
| `502` | `bad_gateway` |
| `503` | `unavailable` |
| `504` | `gateway_timeout` |
| Chromium `400..499` | `upstream_error`, den Status beibehaltend |

Chromium-Weiterleitungen, Serverfehler, fehlerhafte Antworten und Übertragungsfehler sind
normalisiert anstelle der Offenlegung von Chromium-Antwortkörpern. Eine von der Brücke erzeugte Ablehnung
vor dem Upstream-Dispatch hat keine Chromium-Nebenwirkung. Eine nur lesbare Entdeckungsanfrage kann
nach Korrektur der Bedingung erneut versucht werden. Bei mehrdeutigen zustandsändernden Fehlern,
liest `/json/list` erneut und stimmt den Anwendungszustand ab; gehe nicht davon aus `Retry-After` oder
automatische Idempotenz.

### WebSocket Schließt

Lokal erzeugte Abschlüsse verwenden feste geschwärzte Paare. Gültige Peer-Abschlüsse werden weitergeleitet.

| Code | Grund | Verwenden |
| --- | --- | --- |
| `1001` | `going_away` | Sitzung, Generierung oder Proxy-Abschaltung |
| `1002` | `protocol_error` | Fehlerhafte WebSocket-Protokolleingabe |
| `1009` | `message_too_big` | Nachricht überschreitet das konfigurierte Limit |
| `1011` | `internal_error` | Unerwartete Unterbrechung oder Relay-Ausfall stromaufwärts |
| `1013` | `try_again_later` | Pro-Richtung nicht gesendetes Queue-Limit überschritten |

## Vertrauensgrenze

Der äußere Server unterstützt stdio und Streamable HTTP. Er startet upstream Playwright MCP als Kindprozess und leitet Tool-Aufrufe weiter. Browserautomatisierung, Dateiausgabe, Netzwerkzugriff und unsichere Auswertungsfunktionen werden durch upstream Playwright MCP bestimmt.

Setze den stdio-Server nicht über einen nicht authentifizierten Netzwerk-Wrapper frei. Jeder Client, der Tools aufrufen kann, kann den Browser steuern, im Browser sichtbare Seitendaten lesen und Artefakte anfordern.

Streamable HTTP bindet standardmäßig per HTTP an `127.0.0.1` für lokale Clients. Wenn du an `0.0.0.0` bindest oder außerhalb von loopback veröffentlichst, verlange `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` oder gleichwertige Reverse-Proxy-Authentifizierung, nutze direktes HTTPS mit `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` und TLS-Dateien oder terminiere TLS an einem vertrauenswürdigen Netzwerkrand und beschränke den Zugriff auf vertrauenswürdige Clients.

## Unsichere Tools

Upstream Playwright MCP enthält Tools wie `browser_evaluate` und `browser_run_code_unsafe`. Diese können JavaScript im Browser- oder Playwright-Server-Kontext ausführen. Verbinde diesen Server nur mit MCP-Clients, denen du vertraust.

## Konfiguration

Verwende upstream Optionen für Zugriffskontrollen und Schutzmaßnahmen:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

Diese Optionen sind praktische Schutzmaßnahmen, ersetzen aber keine Prozess-, Container-, Netzwerk- und Dateisystem-Isolation.

Nutze nach Möglichkeit Allowlists für vertrauenswürdige Ziele. Behandle uneingeschränkten Dateizugriff und Secrets-Dateien als sensible Fähigkeiten und halte sie aus gemeinsam genutzten MCP-Client-Profilen heraus.

## Sandbox-Modus

Das Docker-Image verwendet standardmäßig `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true`, weil Browser-Sandboxing in containerisierten CI- und MCP-Umgebungen häufig nicht verfügbar ist. Das ist ein Kompatibilitätskompromiss. Wenn dein Host und deine Container-Laufzeit Chromium-Sandboxing unterstützen, setze:

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

Wenn du ohne Chromium-Sandbox arbeitest, nutze Docker oder eine andere Prozessisolationsgrenze und vermeide das Mounten breiter Host-Verzeichnisse.

## Artefakte und Secrets

Screenshots, Snapshots, Downloads, Netzwerklogs, Konsolenlogs und Traces können Zugangsdaten oder private Seiteninhalte enthalten. Mounte nur das benötigte Artefaktverzeichnis, bereinige es nach der Nutzung und teile Artefaktpakete nicht öffentlich.

Wenn dein MCP-Client Zugangsdaten in Browser-Sessions injiziert, bevorzuge kurzlebige Zugangsdaten, die auf die Zielseite beschränkt sind. Lege keine langlebigen Tokens in Screenshots, Netzwerkantworten oder persistenten Browserprofilen ab.

## Docker

Docker wird für Isolation und reproduzierbare Browser-Abhängigkeiten empfohlen. Mounten Sie nur das benötigte Artefaktverzeichnis; das Image enthält bereits Tini, das Browser-Kindprozesse korrekt einsammelt. Lassen Sie in einem gehärteten schreibgeschützten Container `/data` eingehängt und stellen Sie beschreibbare temporäre Mounts für `/tmp` und `/tmp/.X11-unix` bereit, wenn Sitzungen mit grafischer Oberfläche möglich sind.


Wenn du Streamable HTTP aus Docker veröffentlichst, bevorzuge `-p 127.0.0.1:3000:3000`. Eine Veröffentlichung direkt auf einer öffentlichen Schnittstelle gibt jedem erreichbaren Client Browserautomatisierungsfähigkeiten, sofern du keine Authentifizierung und Netzwerkkontrollen hinzufügst.

Das Docker-Image wird in CI und vor Release-Veröffentlichungen mit Trivy gescannt. Der Scanner prüft hohe und kritische OS-/Bibliothekslücken und lädt SARIF-Ergebnisse in GitHub code scanning hoch, wenn dies aktiviert ist.

## Supply-Chain-Prüfungen

Das Repository nutzt kostenlose GitHub-native und Open-Source-Prüfungen:

- CodeQL für statische Analyse von JavaScript und TypeScript.
- Dependency Review für Dependency-Änderungen in Pull Requests.
- `npm audit --omit=dev --audit-level=high` für runtime npm-Abhängigkeiten.
- OpenSSF Scorecard für Repository-Supply-Chain-Signale.
- zizmor für Sicherheitslinting von GitHub Actions.
- Trivy für Schwachstellenscans von Docker-Images.

Diese Prüfungen ersetzen keine manuelle Prüfung des Browserautomatisierungsverhaltens oder von Release-Änderungen.

## Meldung

Melde Schwachstellen über [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
