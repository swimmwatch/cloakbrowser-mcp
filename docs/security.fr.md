---
description: Modèle de sécurité et recommandations sur les risques d'automatisation navigateur pour CloakBrowser MCP, l'isolation Docker, les artefacts, les secrets et l'exposition réseau.
icon: material/shield-lock
tags:
  - Sécurité
  - Guide utilisateur
---

# Sécurité

Ce projet est un pont d'automatisation navigateur. Traitez-le comme une infrastructure d'exécution de code de confiance.

## Frontière de confiance

Le serveur externe prend en charge stdio et Streamable HTTP. Il démarre upstream Playwright MCP comme processus enfant et transmet les appels d'outils. L'automatisation navigateur, la sortie de fichiers, l'accès réseau et les comportements d'évaluation non sûrs sont régis par upstream Playwright MCP.

N'exposez pas le serveur stdio via une enveloppe réseau non authentifiée. Tout client capable d'appeler des outils peut piloter le navigateur, lire les données de page observables par le navigateur et demander des artefacts.

Streamable HTTP se lie par défaut à `127.0.0.1` en HTTP pour les clients locaux. Si vous le liez à `0.0.0.0` ou le publiez hors loopback, exigez `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` ou une authentification équivalente par proxy inverse, utilisez HTTPS direct avec `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` et des fichiers TLS ou terminez TLS à une bordure réseau de confiance, et limitez l'accès aux clients de confiance.

## Outils non sûrs

Upstream Playwright MCP inclut des outils comme `browser_evaluate` et `browser_run_code_unsafe`. Ils peuvent exécuter du JavaScript dans le contexte du navigateur ou du serveur Playwright. Ne connectez ce serveur qu'à des clients MCP auxquels vous faites confiance.

## Configuration

Utilisez les options upstream pour les contrôles d'accès et les garde-fous :

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

Ces options sont des garde-fous pratiques, pas un substitut à l'isolation des processus, conteneurs, réseaux et systèmes de fichiers.

Utilisez des listes d'autorisation pour les cibles de confiance quand c'est possible. Traitez l'accès fichier non restreint et les fichiers de secrets comme des capacités sensibles et gardez-les hors des profils MCP partagés.

## Mode sandbox

L'image Docker utilise par défaut `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true`, car le sandboxing du navigateur est souvent indisponible dans les environnements CI et MCP conteneurisés. C'est un compromis de compatibilité. Si votre hôte et votre runtime de conteneur prennent en charge le sandboxing Chromium, définissez :

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

Lorsque vous exécutez sans sandbox Chromium, utilisez Docker ou une autre frontière d'isolation de processus et évitez de monter de larges répertoires hôte.

## Artefacts et secrets

Les captures d'écran, snapshots, téléchargements, logs réseau, logs console et traces peuvent contenir des identifiants ou du contenu privé. Montez uniquement le répertoire d'artefacts nécessaire, nettoyez-le après usage et évitez de publier des bundles d'artefacts.

Si votre client MCP injecte des identifiants dans les sessions navigateur, préférez des identifiants courts et limités au site cible. Ne placez pas de tokens longue durée dans les captures, réponses réseau ou profils navigateur persistants.

## Docker

Docker est recommandé lorsque vous voulez de l'isolation et des dépendances navigateur reproductibles. Montez uniquement le répertoire d'artefacts requis et utilisez `--init` pour nettoyer correctement les processus enfants du navigateur.

Lorsque vous publiez Streamable HTTP depuis Docker, préférez `-p 127.0.0.1:3000:3000`. Une publication directe sur une interface publique donne des capacités d'automatisation navigateur à tout client joignable, sauf si vous ajoutez authentification et contrôles réseau.

L'image Docker est scannée avec Trivy en CI et avant publication de release. Le scanner vérifie les vulnérabilités OS/bibliothèques hautes et critiques et téléverse les résultats SARIF vers GitHub code scanning quand c'est activé.

## Contrôles de supply chain

Le dépôt utilise des contrôles gratuits, natifs GitHub et open source :

- CodeQL pour l'analyse statique JavaScript et TypeScript.
- Dependency Review pour les changements de dépendances dans les pull requests.
- `npm audit --omit=dev --audit-level=high` pour les dépendances npm runtime.
- OpenSSF Scorecard pour les signaux de supply chain du dépôt.
- zizmor pour le linting de sécurité GitHub Actions.
- Trivy pour le scan de vulnérabilités des images Docker.

Ces contrôles ne remplacent pas la revue manuelle du comportement d'automatisation navigateur ou des changements de release.

## Signalement

Signalez les vulnérabilités avec [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
