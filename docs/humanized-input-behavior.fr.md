---
title: Comportement d'entrée humanisé
description: Activer le comportement de la souris, du clavier et du défilement de CloakBrowser, similaire à celui d’un utilisateur humain, pour les sessions QA sensibles aux interactions et les sessions HTTP Streamable.
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# Comportement d'entrée humanisé

Le comportement d'entrée « humanisé » achemine les interactions avec les pages via la
couche de souris, de clavier et de défilement « réaliste » de CloakBrowser. Cette fonctionnalité s'avère utile lorsque les équipes d'assurance qualité ont besoin d'un
rythme, d'un mouvement du pointeur, d'une cadence de frappe et d'un comportement de défilement plus
réalistes que ceux offerts par
l'automatisation standard.

Le pont n'ajoute pas de nouveaux outils de navigation et ne modifie pas les schémas en amont de Playwright MCP.
Il applique le correctif d'interaction avec les pages de CloakBrowser lors de l'initialisation des pages de Playwright MCP,
de sorte que les outils existants continuent de fonctionner avec les mêmes données d'entrée.

## Quels sont les changements ?

Lorsque `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` est activé, CloakBrowser permet d'humaniser les actions courantes sur les pages,
notamment :

- les mouvements et les clics de la souris ;
- la saisie au clavier et les touches enfoncées ;
- le remplissage des formulaires et le passage d'un champ à l'autre ;
- le défilement et le comportement de « défilement jusqu'à un élément ».

Cela a une incidence sur la synchronisation des interactions et les schémas de mouvement. Cela ne modifie pas le
contenu des pages, le routage réseau, les paramètres de proxy ni la géolocalisation du navigateur.

## Paramètres généraux

Utilisez cette variable d'environnement lorsque chaque session stdio ou session HTTP Streamable par défaut
doit adopter un comportement plus intuitif :

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

Ce même paramètre fonctionne également avec l'option CLI explicite :

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## Configuration de Docker

Transmettez cette même variable d'environnement au conteneur :

```bash
docker run --rm --init -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Pour Streamable HTTP dans Docker, cette variable d'environnement devient la valeur par défaut pour les
nouvelles sessions HTTP :

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Configuration HTTP « Streamable » par session

Les clients HTTP « streamables » peuvent opter pour un comportement « humanisé » lors de l’initialisation
de la session MCP. Cela permet à un serveur de comparer un comportement d’interaction standard et un comportement
« humanisé » sans avoir à être redémarré.

Envoyer les métadonnées du pont dans la requête `initialize` :

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

`humanize` remplace le paramètre au niveau du processus pour cette session HTTP. Utilisez
`true` pour activer un comportement humanisé ou `false` pour le désactiver, même si le
serveur a été démarré avec `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.

`humanPreset` accepte `default` ou `careful` et sélectionne le préréglage de comportement humain
CloakBrowser pour la session. Elle n’active pas le comportement humanisé en
soi ; définissez `humanize: true` ou activez `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.
Le préréglage `careful` est plus lent et plus prudent que `default`.

Les sessions HTTP existantes sont immuables. Créez une autre session HTTP de type « Streamable » pour
passer du comportement standard au comportement humanisé.

## Cas d'utilisation

<div class="grid cards" markdown>

- :material-form-textbox: **QA des formulaires**

  Exercez la saisie, le remplissage, les changements de focus et les flux de validation avec une cadence
  clavier plus réaliste.

- :material-cart-check: **Parcours de paiement**

  Testez les parcours d'achat riches en interactions où le timing de saisie, clic et
  changement de champ peut affecter la validation côté client.

- :material-shield-search: **Contrôles UI sensibles aux interactions**

  Comparez l'automatisation standard avec l'interaction humanisée lorsqu'une page réagit
  différemment à des entrées très rapides ou parfaitement linéaires.

- :material-mouse-scroll-wheel: **Pages riches en défilement**

  Validez les longues pages, fils, listes de produits et contenus lazy-loading avec
  un défilement plus fluide.

- :material-presentation-play: **Démonstrations et enregistrements**

  Produisez des sessions navigateur qui semblent moins mécaniques pendant les demos produit,
  walkthroughs ou preuves QA enregistrées.

</div>

## Priorité et limites

| Zone | Comportement |
| --- | --- |
| Stdio | Utilise uniquement les variables d'environnement et les indicateurs CLI au niveau du processus. |
| Valeur par défaut Streamable HTTP | Utilise les variables d'environnement et les indicateurs CLI au niveau du processus lorsqu'aucune métadonnée runtime n'est fournie. |
| Métadonnées Streamable HTTP | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` peut remplacer le comportement humanisé pour une session. `humanPreset` peut sélectionner `default` ou `careful`. |
| Sessions existantes | Conservent le réglage humanize capturé pendant `initialize`. |
| Moteur navigateur | S'applique seulement quand `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak`. |
| Schémas d'outils | Les schémas des outils navigateur upstream Playwright MCP restent inchangés. |
| Configuration personnalisée | `humanConfig` n'est volontairement pas encore accepté; une configuration structurée exige un schéma de validation explicite. |

Cette fonctionnalité est destinée aux tests légitimes d'assurance qualité, de réalisme des interactions et de cohérence.
Elle ne doit pas être considérée comme un moyen de contourner les contrôles d'accès ou les vérifications de politique.

## Configuration associée

- [Configuration](configuration.md) répertorie toutes les variables d'environnement du pont et de l'en amont.
- [Correspondance de proxy GeoIP](geoip-proxy-matching.md) explique les profils de proxy cohérents au niveau régional.
- [Outils](tools.md) explique pourquoi les outils de navigateur Playwright MCP en amont sont transférés tels quels.

## Parcours pratiques supplémentaires

Pour choisir entre Playwright MCP amont et ce paquet, consultez la [comparaison](comparison.md). Pour des tâches courtes, utilisez les [recettes](recipes/index.md): profil persistant, extensions, reverse proxy, QA régionale, Claude Desktop, Codex CLI et test smoke CI.
