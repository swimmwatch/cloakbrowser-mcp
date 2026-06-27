---
description: Sicherheitsmodell und Risikohinweise für Browserautomatisierung mit CloakBrowser MCP, Docker-Isolation, Artefakten, Secrets und Netzwerkfreigabe.
icon: material/shield-lock
tags:
  - Sicherheit
  - Benutzerhandbuch
---

# Sicherheit

Dieses Projekt ist eine Bridge für Browserautomatisierung. Behandle es als Infrastruktur zur Ausführung vertrauenswürdigen Codes.

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

Docker wird empfohlen, wenn du Isolation und reproduzierbare Browserabhängigkeiten brauchst. Mounte nur das benötigte Artefaktverzeichnis und verwende `--init`, damit Browser-Kindprozesse korrekt bereinigt werden.

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
