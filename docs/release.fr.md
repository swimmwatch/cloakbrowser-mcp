---
description: Processus de publication du paquet npm CloakBrowser MCP, de l'image Docker, du site de documentation, de la fiche sur le registre MCP et du déploiement sur GitHub Pages.
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# Communiqué de presse

Les versions sont gérées par une version GitHub publiée dont le tag correspond à une valeur Semver
préfixée par `v`, par exemple `v1.2.7`.

Le workflow unifié `Release` résout la balise une seule fois, puis transmet les balises dérivées `version`,
`version_tag` et l'étiquette d'image compatible avec Docker via le packaging npm, les arguments de compilation Docker,
les étiquettes d'image, les métadonnées du serveur, les marqueurs README et les marqueurs de documentation.
>

## Paramètres du dépôt GitHub

Configurez ces paramètres avant la première mise en production.

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Ajoutez les réviseurs requis à `npm-production`, `docker-production` et
`mcp-registry-production` si les versions doivent nécessiter une validation manuelle après la
publication d’une version GitHub. L’environnement `github-pages` est utilisé par la
tâche de déploiement native de GitHub Pages.

## Publication sur npm

Le workflow de publication npm utilise le service « npm Trusted Publishing » avec GitHub
Actions OIDC. Il n'utilise pas `NPM_TOKEN` pour la publication.

Configurez l'éditeur de confiance sur npmjs.com en utilisant exactement ces valeurs :

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

La tâche `npm` s'exécute sur des runners hébergés par GitHub, utilise Node.js 24 et conserve
`id-token: write` afin que npm puisse échanger le jeton OIDC de GitHub Actions contre un
identifiant de publication à durée de vie limitée. La publication sécurisée npm nécessite la CLI npm
`>=11.5.1` et Node.js `>=22.14.0`.

Utilisations dans le domaine de l'édition :

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Lors d'une publication via Trusted Publishing, npm génère automatiquement la
provenance des paquets publics issus de dépôts publics. N'ajoutez pas de
jeton de publication npm à durée de vie prolongée à ce flux de travail.

La version du paquet provient de la balise de publication GitHub antérieure à `npm pack`
et `npm publish`, et la tâche échoue si `package.json` ne correspond pas à la
version de publication déterminée.

## Publication Docker

Les images Docker sont publiées sur :

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

Le job `docker` utilise le référentiel `GITHUB_TOKEN` avec
`packages: write` pour GHCR. La publication sur Docker Hub nécessite
`DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN` dans les secrets de l’environnement ou du dépôt `docker-production`.

Le workflow met à jour la page d'aperçu du dépôt Docker Hub une fois le
poussage de l'image réussi. Docker Hub ne récupère pas automatiquement le répertoire racine `README.md` pour
ce flux de publication GitHub Actions ; la vue d'ensemble spécifique à Docker Hub est
gérée dans `docs/dockerhub-readme.md`.

Avant de fusionner une release PR, CI valide :

- exécute les vérifications TypeScript, lint, format, build, test et de couverture ;
- vérifie les métadonnées et le contenu du paquet npm ;
- construit des images Docker pour `linux/amd64` et `linux/arm64` ;
- exécute les vérifications smoke Docker `--help` ;
- compare l’image `linux/amd64` à la version en amont de Playwright MCP à l’aide du script de parité
  du pont ;
- analyse les images Docker avec Trivy à la recherche de vulnérabilités élevées et critiques du système d’exploitation et des bibliothèques.

Pendant la publication de la version, le workflow Docker :

- applique la version de publication ;
- applique les mises à jour de sécurité Debian disponibles sur l’image de base Playwright MCP
  fixée pendant la compilation Docker ;
- supprime la charge utile npm globale inutilisée de l’image d’exécution ;
- publie l’image multiplateforme ;
- met à jour la présentation Docker Hub après l’envoi réussi de l’image.

La compilation Docker reçoit les arguments de compilation `RELEASE_VERSION`, `RELEASE_VERSION_TAG` et
`VCS_REF`. Le workflow résout également le digest de l’image de base Playwright
MCP en amont et le transmet sous la forme `PLAYWRIGHT_MCP_IMAGE_DIGEST`.

L'image finale contient les mêmes valeurs que les étiquettes OCI et les métadonnées d'exécution
sous forme de variables d'environnement. Les images publiées comprennent des étiquettes pour le titre, la description,
la source, la documentation, la version, la révision, la licence, les auteurs, le fournisseur, le nom de l'image de base,
le condensé de l'image de base et le nom du serveur MCP.

Trivy est un logiciel gratuit et open source qui ne nécessite pas de jeton externe pour l'analyse publique
des images. Les résultats SARIF sont téléchargés vers l'outil d'analyse de code de GitHub lorsque l'analyse de code
est activée.

Après la première publication, vérifiez que le paquet GHCR est public et lié à ce
dépôt, et assurez-vous que le dépôt Docker Hub est public.

Docker publie un manifeste multiplateforme pour `linux/amd64` et
`linux/arm64`. PR CI exécute des vérifications smoke sur les deux plateformes avant la fusion
et conserve la comparaison de parité des outils de navigateur sur `linux/amd64`.

## Publication dans le registre MCP

La tâche `mcp-registry` publie `server.json` dans le
registre officiel à l'adresse suivante :

```text
https://registry.modelcontextprotocol.io
```

La publication sur le serveur utilise l'action GitHub composite locale `MCP Registry Publish`,
l’interface CLI officielle `mcp-publisher` et GitHub Actions OIDC. N'ouvrez pas de pull
request sur `modelcontextprotocol/registry` pour répertorier ce serveur ; ce dépôt
exige explicitement que les auteurs de paquets publient via `mcp-publisher`.

Ce workflow ne nécessite ni Glama, ni système de facturation, ni PAT GitHub, ni identifiants DNS, ni
secrets de registre à durée de vie prolongée. Il utilise :

- `id-token: write` pour l'authentification OIDC sur GitHub ;
- `mcp-publisher login github-oidc` ;
- l'espace de noms GitHub existant `io.github.swimmwatch/cloakbrowser-mcp` ;
- la valeur du paquet npm `mcpName` pour prouver la propriété du paquet npm ;
- l'étiquette de l'image Docker `io.modelcontextprotocol.server.name` pour prouver la propriété de l'image OCI
  .

La tâche du registre MCP démarre à partir du même événement de publication GitHub que npm, Docker
et la publication de la documentation. Elle déclare `needs: [npm, docker]`, de sorte que la publication sur npm et
Docker soit terminée avant le début de la publication sur le registre. Le déploiement de la documentation déclare
`needs: [docs-build, npm, docker, mcp-registry]`, de sorte que GitHub Pages n’est mis à jour
qu’après la publication réussie de npm, Docker et du registre MCP officiel. L’action composite
est intentionnellement axée sur le registre : elle valide `server.json` localement,
la valide avec `mcp-publisher`, vérifie si la version exacte du registre est
déjà visible, s’authentifie avec `mcp-publisher login github-oidc`, publie
les métadonnées du serveur et vérifie l’entrée finale dans le registre.

En cas de défaillance temporaire du registre, relancez la tâche `mcp-registry` qui a échoué lors
de l'exécution initiale, une fois que les tâches npm et Docker sont passées au vert. Le déclencheur manuel
`workflow_dispatch` sur `Release` est destiné aux exécutions complètes du pipeline de publication avec
une balise explicite.

Vérifiez l'entrée de registre publiée à l'aide de :

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

Le registre `https://github.com/mcp` de GitHub constitue une interface de découverte distincte
et modérée. La publication sur le registre officiel MCP est obligatoire, mais elle ne
garantit pas une visibilité immédiate sur la page `/mcp` de GitHub. Considérez `npm run
registry:check` comme un outil de vérification des versions pour le registre officiel, npm,
GHCR, Docker Hub, ainsi que comme un test de visibilité GitHub MCP effectué au mieux. N’utilisez `npm run
registry:check:strict` qu’une fois que la visibilité sur GitHub MCP est devenue une condition
impérative.

## Liste de contrôle du répertoire Glama

Le classement dans le répertoire Glama est indépendant des versions GitHub et des publications officielles dans le MCP
Registry. Le dépôt contient `glama.json` ; ainsi, le
compte de gestionnaire `swimmwatch` peut revendiquer ou confirmer la propriété dans Glama.

Avant de publier une version stable, remplissez la liste de contrôle gratuite de Glama :

- synchroniser le serveur depuis l'interface d'administration du serveur Glama MCP après que `glama.json`
  a été fusionné avec `main` ;
- ouvrir
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile` ;
- configurer Glama pour qu’il compile le fichier Dockerfile de ce référentiel et lance le
  point d’entrée stdio existant sans secrets supplémentaires ;
- conserver le runtime compatible avec les paramètres par défaut de CloakBrowser : `cloak` moteur de navigateur
  , mode headless, sortie stdout et stockage d’artefacts `/data` ;
- cliquez sur « Déployer » et attendez que le test de compilation soit réussi ;
- créez et publiez une version Glama portant le même numéro de version que la version GitHub,
  par exemple `1.2.7` ;
- utilisez la fonctionnalité « Try in Browser » de Glama une fois après la publication pour amorcer l’
  utilisation initiale ;
- ajoutez manuellement les serveurs associés, au minimum le serveur MCP officiel de Playwright,
  et, de manière facultative, des alternatives d’automatisation de navigateur étroitement liées.

N'ajoutez pas de mode de paiement ni d'hébergement Glama payant dans le seul but d'améliorer le
score du répertoire. Si Glama exige un mode de paiement pour un élément obligatoire de la liste de contrôle, considérez cela comme un
obstacle à la publication nécessitant une décision explicite de la part du responsable de maintenance.

## Processus de sécurité

Le référentiel utilise des outils de sécurité libres :

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / npm release | `npm audit --omit=dev --audit-level=high` | PR CI and npm publish job | No external account or token. |

La fixation des hachages SHA des actions est prévue dans le cadre d'une prochaine phase de renforcement de la sécurité. Les workflows actuels utilisent
des références d'actions versionnées afin que les mises à jour restent gérables tant que l'infrastructure de mise en production
en est encore à ses débuts.

## Publication de la documentation

Les tâches `docs-build` et `docs-deploy` déploient MkDocs à l’aide du flux de déploiement natif de GitHub Pages Actions.
Les paramètres Pages du dépôt doivent utiliser `GitHub Actions` comme
source.

Le workflow génère la documentation en mode strict, télécharge le répertoire `site/`
avec `actions/upload-pages-artifact`, puis la déploie avec
`actions/deploy-pages` vers l’environnement `github-pages` uniquement après la publication réussie de npm,
Docker et MCP Registry.

La publication de la documentation lance également le validateur SEO après la compilation MkDocs.
Les jetons de vérification pour webmasters, facultatifs, utilisent les outils officiels gratuits destinés aux webmasters et peuvent
être fournis sous forme de variables de dépôt ou de secrets :

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

Les notifications IndexNow facultatives nécessitent un secret de référentiel nommé
`INDEXNOW_KEY`. Lorsqu'il est défini, le workflow publie le fichier de clé requis et
soumet les URL du plan du site générées après le déploiement sur GitHub Pages.

N'ajoutez pas de services d'indexation payants, de produits publicitaires ou d'outils d'analyse tiers
au processus de publication de la documentation sans une décision explicite distincte
.

## Surveillance en amont

Le workflow de surveillance en amont s'exécute quotidiennement et peut également être lancé manuellement depuis
GitHub Actions. Il vérifie les deux canaux de distribution en amont de Playwright MCP :

- Paquet npm : `@playwright/mcp` ;
- image Docker : `mcr.microsoft.com/playwright/mcp`.

Lorsqu’une version en amont plus récente est détectée, le workflow crée un ticket GitHub
attribué à `swimmwatch`. Ce ticket comprend les versions actuelles et les dernières versions npm/Docker
, un bref résumé des notes de mise à jour provenant de
`microsoft/playwright-mcp`, ainsi que des liens vers le journal des modifications complet en amont, le paquet npm
et les balises Docker.

Effectuez la même vérification en local à l'aide de la commande suivante :

```bash
npm run upstream:check
```

## Balises de version

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## Liste de contrôle

Avant de publier un communiqué :

- Ne fusionner qu’une fois que `Actionlint` et `CI` sont au vert.
- Créez une version GitHub à partir d'une balise telle que `v1.2.7`.
- Marquez la version comme « préversion » lors de la publication d’une version npm `next`.
- Vérifiez que l’éditeur de confiance npm est configuré pour `release.yml` et
  `npm-production`.
- Vérifiez que `npm-production`, `docker-production`, `github-pages` et
  `mcp-registry-production`.
- Vérifiez que l’analyse de code GitHub est activée si la visibilité du téléchargement SARIF est requise.
- Vérifiez que la visibilité du package GHCR est publique après la première publication Docker.
- Vérifiez que le serveur Glama a été synchronisé, testé via la page d’administration du Dockerfile
  et publié avec la même version stable.

`SUPPORT.md` est volontairement reporté jusqu’à ce que le projet dispose d’une politique de support stable
allant au-delà des tickets GitHub et des avis de sécurité.
