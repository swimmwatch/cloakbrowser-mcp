---
title: Correspondance de proxy GeoIP
description: Faire correspondre les empreintes de fuseau horaire, de langue et de paramètres régionaux de CloakBrowser à un emplacement de proxy configuré pour l’assurance qualité régionale et les sessions HTTP Streamable.
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# Correspondance de proxys GeoIP

La mise en correspondance des proxys GeoIP permet de synchroniser les paramètres d'empreinte du navigateur avec l'emplacement du proxy
utilisé par le MCP Playwright en amont. Cette fonctionnalité est utile lorsque l'assurance qualité régionale dépend
d'un proxy, d'un fuseau horaire, d'une langue et d'un profil régional cohérents.

Le pont ne génère ni n'achemine lui-même le trafic proxy. Le routage proxy reste
sous la responsabilité du MCP Playwright en amont via `PLAYWRIGHT_MCP_PROXY_SERVER`. Lorsque
la correspondance est activée, le MCP CloakBrowser résout l’emplacement de proxy configuré et
ajoute les indicateurs de lancement CloakBrowser correspondants pour le fuseau horaire, la langue du navigateur et
la locale de l’empreinte digitale.

## Quels sont les changements ?

Lorsque `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` est activé, le pont peut ajouter ces
indicateurs de lancement pour CloakBrowser :

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`

Cela permet d'assurer la cohérence interne du profil de navigateur avec la région du proxy.
Les schémas de l'outil MCP de Playwright en amont et les outils de navigateur sont toujours transmis
tels quels.

## Paramètres généraux

Utilisez les variables d'environnement au niveau du processus pour les clients stdio et comme valeur par défaut pour les
sessions HTTP « streamables » :

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Ajoutez une liste de contournement lorsque certains hôtes doivent contourner le proxy :

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Les proxys HTTP authentifiés sont pris en charge grâce à l'intégration des identifiants dans
`PLAYWRIGHT_MCP_PROXY_SERVER`. Les caractères spéciaux des identifiants doivent être encodés en pourcentage ;
par exemple, utilisez `p%40ssword` pour `p@ssword`.

## Configuration de Docker

Transmettez ces mêmes variables au conteneur. Dans la mesure du possible, conservez les identifiants du proxy dans votre gestionnaire de secrets
ou dans l'environnement client MCP.

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Pour Streamable HTTP dans Docker, publiez le port HTTP comme d'habitude et conservez les variables de proxy
telles qu'elles sont définies par défaut dans l'environnement du conteneur :

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Proxy HTTP permettant la diffusion en continu par session

Les clients HTTP prenant en charge le streaming peuvent choisir un proxy lors de l'initialisation de la session MCP.
Cela permet à un serveur MCP fonctionnant en continu de gérer différents scénarios régionaux sans
avoir à être redémarré.

Envoyer les métadonnées du pont dans la requête `initialize` :

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` remplace `PLAYWRIGHT_MCP_PROXY_SERVER` pour cette session HTTP.
`proxyBypass` remplace `PLAYWRIGHT_MCP_PROXY_BYPASS` uniquement lorsque `proxyServer` est
présent. Si `proxyServer` est présent et que `proxyBypass` est omis, la
configuration héritée de contournement du proxy est effacée pour cette session.

`geoipProxyMatch` remplace le paramètre GeoIP au niveau du processus pour cette session HTTP.
Utilisez `true` pour activer la correspondance pour la session ou `false` pour la désactiver,
même si le serveur a été démarré avec la correspondance activée.

Les sessions HTTP existantes sont immuables. Créez une autre session HTTP de type « Streamable » pour
passer à un autre proxy ou à un autre emplacement.

Si `proxyServer` contient des identifiants, conservez-les sous forme encodée en URL et transmettez la valeur
via des secrets ou la configuration d'exécution du client plutôt que de l'enregistrer dans
les fichiers du projet.

## Cas d'utilisation

<div class="grid cards" markdown>

- :material-cart-check: **QA commerce localisé**

  Testez le paiement, les taxes, les messages de livraison, la devise et les règles régionales de catalogue
  avec le fuseau horaire et la locale du navigateur alignés sur l'emplacement du proxy.

- :material-web: **Pages d'atterrissage régionales**

  Vérifiez la langue, le consentement, les campagnes et les variantes de contenu qui dépendent de la région
  du visiteur.

- :material-lifebuoy: **Reproduction pour le support client**

  Reproduisez un signalement depuis une région client sans redémarrer tout le serveur MCP
  pour chaque emplacement de proxy.

- :material-clock-check: **Parcours sensibles au fuseau horaire**

  Validez les sélecteurs de date, fenêtres de réservation, rappels et pages de planification où
  le fuseau horaire et la locale doivent correspondre à la région réseau.

- :material-source-branch-sync: **Sessions régionales parallèles**

  Exécutez des sessions Streamable HTTP séparées avec différents proxies afin qu'un agent puisse
  comparer plusieurs régions dans un seul processus serveur.

</div>

## Priorité et limites

| Zone | Comportement |
| --- | --- |
| Stdio | Utilise uniquement les variables d'environnement et les indicateurs CLI au niveau du processus. |
| Valeur par défaut Streamable HTTP | Utilise les variables d'environnement et les indicateurs CLI au niveau du processus lorsqu'aucune métadonnée runtime n'est fournie. |
| Métadonnées Streamable HTTP | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` peut remplacer le proxy et la correspondance GeoIP pour une session. |
| Sessions existantes | Conservent le proxy et le réglage GeoIP capturés pendant `initialize`. |
| Routage du proxy | Reste délégué à upstream Playwright MCP. |
| Browser geolocation API | N'est pas configurée par cette fonctionnalité; elle aligne seulement le fuseau horaire, la langue et les locale fingerprint flags de CloakBrowser. |

Les données de localisation GeoIP sont approximatives et dépendent de l'adresse IP du proxy et de la
base de données GeoIP de CloakBrowser. CloakBrowser télécharge et met en cache cette base de données hors ligne lors de sa première
utilisation, lorsque cela s'avère nécessaire.

Utilisez cette fonctionnalité dans le cadre de tests légitimes d'assurance qualité, de localisation et de cohérence des environnements.
Elle ne doit pas être considérée comme un moyen de contourner les contrôles d'accès ou les vérifications des politiques régionales.

## Configuration associée

- [Configuration](configuration.md) répertorie toutes les variables d'environnement du pont et de l'environnement en amont.
- [Docker](docker.md) explique les paramètres par défaut du runtime des conteneurs et la publication HTTP via Streamable.
- [Outils](tools.md) explique pourquoi les outils de navigateur Playwright MCP en amont sont transmis tels quels.

## Parcours pratiques supplémentaires

Pour choisir entre Playwright MCP amont et ce paquet, consultez la [comparaison](comparison.md). Pour des tâches courtes, utilisez les [recettes](recipes/index.md): profil persistant, extensions, reverse proxy, QA régionale, Claude Desktop, Codex CLI et test smoke CI.
