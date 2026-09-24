---
description: Modèle de sécurité et recommandations sur les risques d'automatisation navigateur pour CloakBrowser MCP, l'isolation Docker, les artefacts, les secrets et l'exposition réseau.
icon: material/shield-lock
tags:
  - Sécurité
  - Guide utilisateur
---

# Sécurité

Ce projet est un pont d'automatisation navigateur. Traitez-le comme une infrastructure d'exécution de code de confiance.

## Sécurité gérée CDP { #managed-cdp-security }

CDP géré est désactivé par défaut. Il fournit un contrôle arbitraire de Chromium DevTools,
pas un outil de navigateur réduit API. Activez-le uniquement pour les clients de confiance. La capacité dans
`cloakbrowser_bridge_info.cdp.discoveryUrl` est un justificatif de porteur : ne le consignez pas,
stockez-le dans des tickets, ou partagez-le entre les sessions. Il tourne après le remplacement du navigateur
et un vieux URL ne passe jamais à la génération de remplacement.

Un lien de CDP sans boucle nécessite à la fois `--cdp-allow-remote` et un concret annoncé
hôte. Ajoutez des contrôles d'accès réseau autour du port publié. Sélectionner
`--cdp-advertised-scheme https` ne fournit pas TLS. L'auditeur géré et
Chromium hop rester en texte clair ; un terminateur TLS appartenant à l'opérateur sur le même port doit être préservé
l'autorité `Host` et `Origin` annoncée et maintenir un routage un-à-un vers le
session possédée.

Les journaux d'exécution n'incluent jamais les chemins de capacités, les ID cibles, les charges utiles CDP, les données du navigateur,
cookies, valeurs brutes `Host` ou `Origin`, ou chemins de profil. Les contrôles de sécurité rejetés sont
signalé uniquement comme un avertissement `cdp_security_rejections` à portée de session avec 60 secondes
comptages saturés pour `capability`, `host` et `origin` ; le nettoyage vide tout ce qui reste
comptes. Les vérifications réussies ne créent pas de dossiers d'audit par demande.

### Limites fixes

Les limites s'appliquent indépendamment à chaque session MCP activée CDP :

| Frontière | Limite |
| --- | --- |
| Connexions WebSocket activement proxifiées, y compris les poignées de main en cours | 8 |
| Requêtes HTTP concurrentes avant mise à niveau | 16 |
| En-têtes de requête | 16 Ko |
| Corps de la requête sur les routes prises en charge | Non autorisé |
| Réponse mise en mémoire tampon Chromium HTTP | 4 Mio |
| Message WebSocket entrant ou sortant | 16 Mio |
| Données WebSocket non envoyées mises en file d'attente par direction | 16 Mio |
| En-têtes de requête, réponse en amont HTTP, ou poignée de main WebSocket | 10 secondes |
| Arrêt gracieux du proxy avant fermeture forcée | 5 secondes |
| Corps de réponse d'erreur locale | 8 Ko |

### Erreurs HTTP

Les échecs locaux utilisent JSON `{"error":{"code":"...","message":"..."}}` avec
`Cache-Control: no-store`, `Content-Type: application/json; charset=utf-8`, et un
exact `Content-Length`. Les échecs de méthode incluent également `Allow`. Les correspondances stables sont :

| Statut | Code |
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
| Chromium `400..499` | `upstream_error`, en préservant le statut |

Les redirections Chromium, les erreurs de serveur, les réponses mal formées et les échecs de transport sont
normalisé au lieu d'exposer les corps de réponse Chromium. Un rejet généré par le pont
avant que la distribution en amont n'ait aucun effet secondaire Chromium. Une requête de découverte en lecture seule peut
être réessayé après correction de la condition. Pour les échecs de changement d'état ambigus,
relire `/json/list` et concilier l'état de l'application ; ne pas supposer `Retry-After` ou
idempotence automatique

### WebSocket Ferme

Les clôtures générées localement utilisent des paires expurgées fixes. Les clôtures valides des pairs sont relayées.

| Code | Raison | Utiliser |
| --- | --- | --- |
| `1001` | `going_away` | Fermeture de session, de génération ou de proxy |
| `1002` | `protocol_error` | Entrée du protocole WebSocket malformée |
| `1009` | `message_too_big` | Le message dépasse la limite configurée |
| `1011` | `internal_error` | Déconnexion en amont inattendue ou défaillance du relais |
| `1013` | `try_again_later` | Limite de file d'attente non envoyée par direction dépassée |

## Frontière de confiance

Le serveur externe prend en charge stdio et Streamable HTTP. Il démarre upstream Playwright MCP comme processus enfant et transmet les appels d'outils. L'automatisation navigateur, la sortie de fichiers, l'accès réseau et les comportements d'évaluation non sûrs sont régis par upstream Playwright MCP.

N'exposez pas le serveur stdio via une enveloppe réseau non authentifiée. Tout client capable d'appeler des outils peut piloter le navigateur, lire les données de page observables par le navigateur et demander des artefacts.

Streamable HTTP se lie par défaut à `127.0.0.1` en HTTP pour les clients locaux. Si vous le liez à `0.0.0.0` ou le publiez hors loopback, exigez `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` ou une authentification équivalente par proxy inverse, utilisez HTTPS direct avec `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` et des fichiers TLS ou terminez TLS à une bordure réseau de confiance, et limitez l'accès aux clients de confiance.

## Outils non sûrs

Upstream Playwright MCP inclut des outils comme `browser_evaluate` et `browser_run_code_unsafe`. Ils peuvent exécuter du JavaScript dans le contexte du navigateur ou du serveur Playwright. Ne connectez ce serveur qu'à des clients MCP auxquels vous faites confiance.

Les outils `webmcp_*` sont définis par la page courante. Considérez leur nom, description, schéma, annotations et output comme des données non fiables ; le bridge les transmet sans modification. Définissez `PLAYWRIGHT_MCP_WEBMCP=false` lorsque la collecte n'est pas nécessaire.

## Token Playwright Extension

Fournissez `PLAYWRIGHT_MCP_EXTENSION_TOKEN` uniquement via l'environnement du processus ou un gestionnaire de secrets. Le bridge n'accepte pas le token dans les métadonnées HTTP et ne l'écrit pas dans la config, les métadonnées du bridge, les logs, les erreurs ou les diagnostic snapshots. Protégez le persistent profile et ne réutilisez pas un `userDataDir` actif entre plusieurs sessions.

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

Docker est recommandé pour l'isolation et des dépendances de navigateur reproductibles. Ne montez que le répertoire d'artefacts nécessaire ; l'image inclut déjà Tini, qui récupère correctement les processus enfants du navigateur. Dans un conteneur renforcé en lecture seule, gardez `/data` monté et fournissez des montages temporaires accessibles en écriture pour `/tmp` et `/tmp/.X11-unix` si des sessions avec interface graphique sont possibles.


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
