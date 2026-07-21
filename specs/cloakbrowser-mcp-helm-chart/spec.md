# CloakBrowser MCP Helm Chart Specification

Status: approved implementation contract  
Chart source version: `0.1.0`  
Source `appVersion`: `1.8.0`  
Target path: `charts/cloakbrowser-mcp`

## 1. Purpose

This specification defines a production-oriented Helm chart for running
`cloakbrowser-mcp` on Kubernetes. The chart exposes only the native MCP
Streamable HTTP transport and supplies the runtime isolation, distributed
session ownership, artifact handling, observability, and network controls
needed to operate CloakBrowser safely in a cluster.

The primary users are Kubernetes operators who install the server and MCP
clients that connect through an authenticated Streamable HTTP endpoint. The
initial acceptance environment is a Linux/AMD64 kubeadm cluster in a Proxmox
homelab.

The desired outcome is a chart that:

- installs with secure single-replica defaults;
- scales horizontally when an external Redis- or Valkey-compatible backend is
  configured;
- keeps browser processes and artifacts isolated by MCP session;
- denies browser network access until an operator explicitly allows it;
- provides authenticated health, readiness, and Prometheus metrics;
- can publish the same chart archive through common Helm distribution
  channels; and
- can be verified objectively in the repository and in the homelab.

## 2. Current State And Required Change

The application already supports native stdio and Streamable HTTP transports.
Streamable HTTP currently exposes `/mcp`, `/healthz`, and `/readyz`, accepts an
optional static bearer token, creates one upstream Playwright MCP child process
per session, and stores session metadata in process memory. Browser state is
process-local. Upstream Playwright MCP browser tool schemas are forwarded
unchanged, and the bridge adds only `cloakbrowser_binary_info` and
`cloakbrowser_bridge_info`.

The chart requires new application behavior that is not part of the established
runtime contract yet:

- mandatory bearer authentication in chart mode and an authenticated exec
  probe command;
- owner-aware Redis/Valkey session metadata and internal peer routing;
- native low-cardinality Prometheus metrics on a separate listener;
- JSON logging with mandatory sensitive-field redaction;
- isolated per-session artifact directories and bounded cleanup;
- a native S3-compatible artifact upload provider; and
- a restricted chart mode that rejects unsafe per-session overrides.

These are requirements of this specification, not statements that the behavior
already exists.

## 3. Scope

### 3.1 In Scope

- A Helm application chart at `charts/cloakbrowser-mcp`.
- Kubernetes `1.30` and newer.
- The latest supported Helm 3 and Helm 4 releases.
- Single-replica in-memory sessions.
- Redis/Valkey-backed owner metadata and routing for multiple replicas and HPA.
- ClusterIP, `kubectl port-forward`, and ingress-nginx connection methods.
- `emptyDir` and chart-created PVC artifact storage.
- Optional S3-compatible artifact upload.
- Portable Kubernetes NetworkPolicy and optional Cilium FQDN policy.
- Native Prometheus metrics, optional ServiceMonitor, and optional
  PrometheusRule.
- GHCR OCI, Docker Hub OCI, GitHub Pages, GitHub Release, and Artifact Hub
  distribution.
- English and all repository-supported localized documentation.

### 3.2 Non-Goals

- Exposing or configuring stdio through Helm.
- `HTTPRoute`, Gateway API, `LoadBalancer`, or `NodePort` support.
- Direct application TLS inside the Pod. TLS terminates at ingress-nginx.
- OAuth, OIDC, per-user authorization, or a chart-managed identity provider.
- Bundling a production Redis, Valkey, MinIO, or other S3 service.
- Persisting, serializing, or migrating live browser processes.
- Cross-version live-session continuity during chart upgrade or rollback.
- Hostile multi-tenancy within one release or namespace.
- Existing-PVC attachment, `hostPath`, persistent browser profiles, extension
  mounts, arbitrary volume mounts, extra environment variables, extra command
  arguments, init containers, or sidecars.
- An artifact download HTTP API or additional MCP artifact tools.
- PodMonitor, Grafana dashboard, OpenTelemetry, chart provenance files, chart
  signing, or a chart-specific SBOM.
- Helm unit-test plugins, kubeconform, kind, or local live Redis/MinIO tests in
  the initial verification contract.

## 4. Architecture And Trust Boundaries

### ARC-001: Release boundary

One Helm release in one namespace is one tenant security boundary. Mutually
untrusted tenants require separate namespaces, releases, Secrets, artifact
roots, S3 prefixes, and Redis key prefixes. Kubernetes RBAC and cluster
administration remain operator responsibilities.

### ARC-002: Process-local browser ownership

Each Streamable HTTP session owns exactly one local bridge runtime, one upstream
Playwright MCP child process, and one isolated browser context/profile. Redis
coordinates metadata, leases, and routing only. A browser process cannot move
between Pods and is lost when its owner Pod is lost.

### ARC-003: Public and internal listeners

- The application listener binds `0.0.0.0:3000` and exposes `/mcp`, `/healthz`,
  and `/readyz`.
- The metrics listener binds `0.0.0.0:9090` and exposes only `/metrics`.
- Redis-backed replicas bind an internal peer listener to `0.0.0.0:3001`.
- The public Service exposes only port `3000`.
- A metrics Service exposes only port `9090` when metrics are enabled.
- Port `3001` is addressable only by release Pods and is never exposed by a
  Service or Ingress.
- ingress-nginx exposes only `/mcp`; probe and metrics paths remain private.

### ARC-004: Configuration direction

The ConfigMap contains non-secret operational settings such as limits,
timeouts, tool names, browser settings, origin policy, and proxy bypass rules.
Kubernetes Secrets contain tokens, credentials, authenticated URLs,
certificates, private keys, and other secret material. The chart never creates
a Secret and never accepts secret material inline in `values.yaml`.

### ARC-005: Dependency boundaries

Redis/Valkey and S3-compatible services are operator-managed external
dependencies. The application must use explicit provider interfaces so future
session or artifact providers can be added without changing the public Helm
shape for existing providers. Provider-specific values stay nested below the
provider they configure.

## 5. Chart Package Contract

### CHART-001: Required chart files

The chart contains `Chart.yaml`, `values.yaml`, `values.schema.json`, a chart
README, `templates/NOTES.txt`, and templates for the resources selected by this
specification. `Chart.yaml` declares an application chart, chart version
`0.1.0`, source `appVersion: 1.8.0`, repository/source links, maintainers,
license metadata, and Artifact Hub annotations.

No npm package or application version is changed merely by adding the chart.
The first authorized chart publication updates `appVersion` to the application
release being published while retaining chart version `0.1.0`.

### CHART-002: Resource set

The chart can render:

- ConfigMap;
- Deployment;
- application and metrics Services;
- ServiceAccount without RBAC;
- chart-created PersistentVolumeClaim;
- HorizontalPodAutoscaler using `autoscaling/v2`;
- PodDisruptionBudget;
- ingress-nginx-compatible Ingress;
- Kubernetes NetworkPolicy;
- optional CiliumNetworkPolicy;
- optional ServiceMonitor;
- optional PrometheusRule; and
- an authenticated Helm test Pod.

Resources that are disabled by values are not rendered. Secret resources,
Roles, RoleBindings, ClusterRoles, and ClusterRoleBindings are never rendered.

### CHART-003: Naming and metadata

Resource names derive from the Helm release and chart name. The chart does not
offer `nameOverride` or `fullnameOverride`. It supports additional safe labels
and annotations for Pods and supported resources. User-provided metadata cannot
replace chart identity labels, selectors, Helm hook annotations, security
annotations, or checksum annotations.

### CHART-004: Image selection

The default application image repository is
`ghcr.io/swimmwatch/cloakbrowser-mcp`. Image values expose `repository`, `tag`,
`digest`, and `pullPolicy`, plus image pull Secret references. An explicit
digest takes precedence over the tag and renders `repository@digest`; otherwise
an empty tag derives from `Chart.appVersion`. Documentation includes
`swimmwatch/cloakbrowser-mcp` as the Docker Hub override.

### CHART-005: Configuration rollout

The Deployment Pod template contains a deterministic checksum of the rendered
ConfigMap. Any effective ConfigMap change triggers a rollout. Referenced Secret
content is not read by Helm and is not part of this checksum; Secret rotation
follows the explicit rollout contract in RUN-006.

## 6. Helm Values Contract

The names below are the public values API. `values.schema.json` validates local
types, enums, formats, ranges, and required fields. Templates perform
cross-field validation that JSON Schema cannot express clearly. The same
invalid configuration must fail `helm lint`, `helm template`, installation, and
upgrade with a field-specific message.

Value names and their documented semantics are public API. Breaking changes use
Helm chart Semantic Versioning.

### VAL-001: Top-level workload values

| Value | Default | Contract |
| --- | --- | --- |
| `replicaCount` | `1` | Static replica count when HPA is disabled. |
| `image.repository` | `ghcr.io/swimmwatch/cloakbrowser-mcp` | Application image repository. |
| `image.tag` | `""` | Empty derives from `appVersion`. |
| `image.digest` | `""` | Optional `sha256:` digest; overrides tag. |
| `image.pullPolicy` | `IfNotPresent` | Kubernetes image pull policy. |
| `imagePullSecrets` | `[]` | Existing image pull Secret references. |
| `podLabels` | `{}` | Additional safe Pod labels. |
| `podAnnotations` | `{}` | Additional safe Pod annotations. |
| `topologySpreadConstraints` | `[]` | Operator-supplied topology spread constraints only. |
| `terminationGracePeriodSeconds` | `330` | Must be at least the session drain timeout plus 30 seconds. |

The chart does not expose node selectors, affinity, tolerations, PriorityClass,
RuntimeClass, host aliases, host networking, host PID/IPC, Pod DNS policy, or
container command overrides.

### VAL-002: MCP and probe values

| Value | Default | Contract |
| --- | --- | --- |
| `mcp.transport` | `streamable-http` | Constant; every other value is rejected. |
| `mcp.port` | `3000` | Constant application container port. |
| `mcp.endpoint` | `/mcp` | Constant MCP endpoint. |
| `mcp.bodyLimitBytes` | `1048576` | Constant 1 MiB application request-body limit. |
| `mcp.auth.existingSecret` | `""` | Empty derives `<fullname>-auth`; the Secret must already exist. |
| `mcp.auth.tokenKey` | `token` | Secret key containing the external bearer token. |
| `probes.startup.enabled` | `true` | Uses the authenticated exec probe command. |
| `probes.liveness.enabled` | `true` | Checks `/healthz` through the exec probe command. |
| `probes.readiness.enabled` | `true` | Checks `/readyz` through the exec probe command. |

The balanced default probe profile allows startup for up to 120 seconds, runs
liveness every 10 seconds, readiness every 5 seconds, and uses a 3-second
timeout. Exact threshold fields may be configurable, but schemas reject zero or
negative timings and settings that allow startup for less than 30 seconds.

### VAL-003: Session values

| Value | Default | Contract |
| --- | --- | --- |
| `sessions.provider` | `memory` | Enum: `memory` or `redis`. |
| `sessions.idleTtlSeconds` | `3600` | Sliding idle expiry. |
| `sessions.maxPerReplica` | `2` | Maximum active plus pending initialization slots per Pod. |
| `sessions.drainTimeoutSeconds` | `300` | Graceful browser/session drain deadline. |
| `sessions.ownerLeaseSeconds` | `30` | Unreachable Redis owner grace window. |
| `sessions.peer.port` | `3001` | Constant internal peer port. |
| `sessions.peer.auth.existingSecret` | `""` | Empty derives `<fullname>-routing`. |
| `sessions.peer.auth.tokenKey` | `token` | Internal routing token key. |
| `sessions.redis.mode` | `standalone` | Enum: `standalone`, `sentinel`, or `cluster`. |
| `sessions.redis.existingSecret` | `""` | Empty derives `<fullname>-redis`; required for Redis. |
| `sessions.redis.keyPrefix` | `""` | Empty derives `cloakbrowser-mcp:<namespace>:<release>:`. |
| `sessions.redis.connectTimeoutMilliseconds` | `5000` | Connection timeout. |
| `sessions.redis.operationTimeoutMilliseconds` | `2000` | Per-operation timeout. |

One existing Redis Secret holds all selected connection material. Conventional
key defaults are `url`, `username`, `password`, `ca.crt`, `tls.crt`, `tls.key`,
`sentinel-master`, and `cluster-nodes`; each key name is configurable. Only the
keys required by the selected Redis mode are mounted or injected. Direct
`redis://` and `rediss://`, client certificates, Sentinel, and Redis Cluster are
supported. Redis URLs, endpoints, credentials, and TLS files never appear in a
ConfigMap or non-Secret rendered resource.

### VAL-004: Browser values

| Value | Default | Contract |
| --- | --- | --- |
| `browser.engine` | `cloak` | Constant; other browser engines are rejected. |
| `browser.headless` | `true` | Non-secret ConfigMap setting. |
| `browser.actionTimeoutMilliseconds` | `30000` | Positive action timeout. |
| `browser.navigationTimeoutMilliseconds` | `60000` | Positive navigation timeout. |
| `browser.viewport.width` | `1280` | Positive integer. |
| `browser.viewport.height` | `720` | Positive integer. |
| `browser.allowedOrigins` | `[]` | Upstream origin allow rules; empty means no additional allowlist. |
| `browser.blockedOrigins` | `[]` | Upstream origin deny rules; empty means no additional denylist. |
| `browser.tools.allow` | `[]` | Empty exposes every upstream browser tool. Non-empty is an exact-name allowlist. |

The two local introspection tools are always retained and are not controlled by
the browser-tool allowlist. Unknown allowlist names fail application startup and
readiness with a configuration error. Tool schemas and the authoritative
upstream tool list are never copied, rewritten, or extended.

Chromium sandboxing is enabled and is not a chart toggle. Startup fails clearly
if the container runtime or node cannot support the sandbox. Documentation
explains the user-namespace/runtime prerequisites instead of silently adding
`--no-sandbox`.

### VAL-005: Proxy values

| Value | Default | Contract |
| --- | --- | --- |
| `proxy.enabled` | `false` | Enables one chart-wide upstream proxy. |
| `proxy.existingSecret` | `""` | Empty derives `<fullname>-proxy`; required when enabled. |
| `proxy.urlKey` | `url` | Secret key containing the complete authenticated or unauthenticated proxy URL. |
| `proxy.bypass` | `[]` | Non-secret bypass hosts rendered through the ConfigMap. |

The chart rejects inline proxy URLs. In chart mode, clients cannot supply or
override proxy metadata per session.

### VAL-006: Artifact values

| Value | Default | Contract |
| --- | --- | --- |
| `artifacts.storage.type` | `emptyDir` | Enum: `emptyDir` or `pvc`. |
| `artifacts.storage.emptyDir.sizeLimit` | `5Gi` | Ephemeral artifact volume limit. |
| `artifacts.storage.pvc.storageClassName` | `""` | Empty uses the default StorageClass. |
| `artifacts.storage.pvc.accessModes` | `[ReadWriteOnce]` | Chart-created claim access modes. |
| `artifacts.storage.pvc.size` | `5Gi` | Chart-created claim request. |
| `artifacts.perSession.maxBytes` | `1Gi` | Soft per-session completed-file bound. |
| `artifacts.perSession.maxFiles` | `1000` | Soft per-session completed-file count bound. |
| `artifacts.localRetentionHours` | `24` | Used when S3 upload is disabled. |
| `artifacts.cleanupIntervalSeconds` | `300` | Background local cleanup scan. |
| `artifacts.stableFileSeconds` | `5` | File must remain unchanged across two observations before upload or eviction. |
| `artifacts.s3.enabled` | `false` | Enables native S3-compatible upload. |
| `artifacts.s3.endpoint` | `""` | Empty selects the provider's standard AWS endpoint. |
| `artifacts.s3.region` | `""` | Required when S3 is enabled. |
| `artifacts.s3.bucket` | `""` | Required when S3 is enabled. |
| `artifacts.s3.prefix` | `""` | Optional operator prefix. |
| `artifacts.s3.forcePathStyle` | `false` | Supports MinIO and other path-style providers. |
| `artifacts.s3.tls.verify` | `true` | TLS verification is on by default. |
| `artifacts.s3.existingSecret` | `""` | Empty derives `<fullname>-s3`; required when S3 is enabled. |

The S3 Secret uses configurable keys with defaults `access-key-id`,
`secret-access-key`, `session-token`, and `ca.crt`. The session token and custom
CA are optional. Disabling S3 TLS verification requires an explicit value and
produces a prominent NOTES and documentation warning.

The non-secret endpoint must be an absolute HTTP(S) URL without userinfo,
credential-bearing query parameters, or a fragment. A custom CA is mounted from
the existing Secret as a read-only file and never copied into the ConfigMap.

The fixed writable artifact mount is `/data`, with session output below
`/data/artifacts`. Existing claims and arbitrary mount paths are not accepted.

### VAL-007: Resource and writable-memory values

| Value | Default | Contract |
| --- | --- | --- |
| `resources.requests.cpu` | `1` | Default CPU request. |
| `resources.requests.memory` | `2Gi` | Default memory request. |
| `resources.limits.cpu` | `2` | Default CPU limit. |
| `resources.limits.memory` | `4Gi` | Default memory limit. |
| `sharedMemory.sizeLimit` | `1Gi` | Memory-backed `emptyDir` mounted at `/dev/shm`. |
| `temporaryStorage.sizeLimit` | `1Gi` | Size-limited writable `emptyDir` mounted at `/tmp`. |

Resource and volume quantities must parse as positive Kubernetes quantities.
The chart documentation relates memory sizing to `sessions.maxPerReplica` and
warns that raising concurrency without measuring CloakBrowser memory is unsafe.

### VAL-008: Autoscaling and disruption values

| Value | Default | Contract |
| --- | --- | --- |
| `autoscaling.enabled` | `false` | Renders `autoscaling/v2` HPA when true. |
| `autoscaling.minReplicas` | `1` | Minimum replicas. |
| `autoscaling.maxReplicas` | `5` | Maximum replicas. |
| `autoscaling.targetCPUUtilizationPercentage` | `70` | Resource CPU target. |
| `autoscaling.targetMemoryUtilizationPercentage` | `75` | Resource memory target. |
| `autoscaling.scaleDownStabilizationSeconds` | `300` | HPA scale-down stabilization. |
| `podDisruptionBudget.enabled` | `false` | Optional PDB. |
| `podDisruptionBudget.minAvailable` | `1` | Default policy when enabled. |

HPA uses standard Kubernetes scale-up behavior. `minReplicas` cannot exceed
`maxReplicas`. The PDB schema prevents simultaneous `minAvailable` and
`maxUnavailable` policies.

### VAL-009: Service and Ingress values

| Value | Default | Contract |
| --- | --- | --- |
| `service.type` | `ClusterIP` | Constant; other Service types are rejected. |
| `service.port` | `3000` | Constant application Service port. |
| `service.annotations` | `{}` | Additional safe Service annotations. |
| `ingress.enabled` | `false` | Optional ingress-nginx Ingress. |
| `ingress.className` | `nginx` | Primary supported controller. |
| `ingress.host` | `""` | Required when Ingress is enabled. |
| `ingress.path` | `/mcp` | Constant public path. |
| `ingress.annotations` | `{}` | Merged with required streaming annotations; cannot override required values unsafely. |
| `ingress.tls.enabled` | `false` | TLS is optional. |
| `ingress.tls.secretName` | `""` | Existing TLS Secret; required only when TLS is enabled. |

The application Service port is named `http`; the metrics Service port is named
`metrics`. Required ingress-nginx annotations set proxy buffering and proxy
request buffering to `off`, proxy body size to `1m`, read/send timeouts to
`3600` seconds, and connect timeout to `60` seconds. The timeout values are
configurable as positive integers, but user annotations cannot re-enable
buffering or raise the body size above the application's 1 MiB limit. Ingress
rate limits and stricter body controls may be configured through safe
annotations and are not application responsibilities. The chart does not
require TLS merely to render an Ingress, but documentation strongly recommends
it outside an isolated test network.

### VAL-010: Metrics values

| Value | Default | Contract |
| --- | --- | --- |
| `metrics.enabled` | `true` | Enables the native listener and metrics Service. |
| `metrics.port` | `9090` | Constant metrics port. |
| `metrics.path` | `/metrics` | Constant metrics path. |
| `metrics.auth.existingSecret` | `""` | Empty derives `<fullname>-metrics`. |
| `metrics.auth.tokenKey` | `token` | Separate metrics bearer token. |
| `metrics.service.annotations` | `{}` | Additional safe metrics Service annotations. |
| `metrics.serviceMonitor.enabled` | `false` | Optional same-namespace ServiceMonitor. |
| `metrics.serviceMonitor.interval` | `30s` | Positive Prometheus scrape interval. |
| `metrics.serviceMonitor.labels` | `{}` | Prometheus Operator discovery labels. |
| `metrics.prometheusRule.enabled` | `false` | Optional PrometheusRule. |
| `metrics.prometheusRule.labels` | `{}` | Prometheus Operator discovery labels. |

The ServiceMonitor is created only in the release namespace and reads the
existing metrics token Secret there. Cross-namespace ServiceMonitor creation is
not supported.

### VAL-011: Logging values

| Value | Default | Contract |
| --- | --- | --- |
| `logging.format` | `pretty` | Enum: `pretty` or `json`. |
| `logging.level` | `info` | Enum: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |

Redaction is mandatory and is not a value that can be disabled.

### VAL-012: Network-policy values

`networkPolicy.enabled` defaults to `true` and renders default-deny ingress and
egress for application Pods. Its public subtrees accept Kubernetes
namespace/Pod selectors, `ipBlock` CIDRs with exceptions, and explicit ports for
these destinations:

- MCP clients;
- ingress-nginx;
- Prometheus scrapers;
- Redis/Valkey;
- S3-compatible storage; and
- browser destinations.

No client is allowed by default. When Ingress is enabled, configurable ingress
namespace and Pod selectors default to the standard ingress-nginx labels. The
chart's own labeled Helm test Pod receives a dedicated port-3000 ingress rule.
Peer ingress/egress on port `3001` is allowed only between Pods selected by the
same release identity.

DNS egress permits TCP and UDP port `53` only to configurable kube-system DNS
namespace and Pod selectors, with kube-dns-compatible defaults. Redis, S3, and
browser egress remain denied until their corresponding selectors, CIDRs, and
ports are configured. Enabling a provider does not silently create broad
`0.0.0.0/0` egress.

`ciliumNetworkPolicy.enabled` defaults to `false`. When enabled, it adds
operator-supplied browser `toFQDNs` match names/patterns and allowed ports while
retaining portable infrastructure controls. The schema rejects FQDN entries
that are empty or malformed. The documentation explains that hostname policy
requires Cilium and does not replace application origin rules or tenant
isolation.

### VAL-013: Cross-field validation

The following configurations are invalid:

- any transport other than `streamable-http`;
- a missing referenced auth or metrics Secret name after default derivation;
- `replicaCount > 1` with `sessions.provider=memory`;
- HPA with `sessions.provider=memory`;
- Redis sessions without the Redis and routing Secret references;
- Redis configuration that supplies zero or more than one connection mode;
- PVC artifacts with more than one replica or HPA enabled;
- HPA without `artifacts.storage.type=emptyDir` and S3 upload enabled;
- S3 upload without bucket, region, and credential Secret references;
- an enabled proxy without a proxy Secret reference;
- an enabled Ingress without a host;
- enabled Ingress TLS without an existing TLS Secret name;
- ServiceMonitor or PrometheusRule with metrics disabled;
- a termination grace period shorter than drain timeout plus 30 seconds;
- unknown browser-tool names at application startup;
- inline tokens, passwords, authenticated URLs, certificates, or private keys;
- existing claims, `hostPath`, arbitrary volumes, or unsupported Pod extension
  points; and
- settings that disable the fixed Pod/container security controls.

## 7. Runtime Contract Required By The Chart

### RUN-001: Chart mode

The chart starts the existing CLI with Streamable HTTP explicitly enabled and
sets a chart-mode flag or bridge-specific environment value. Outside chart
mode, existing stdio behavior and general CLI defaults remain backward
compatible. In chart mode:

- the bind address is `0.0.0.0`;
- external and metrics authentication are mandatory;
- session capacity defaults to two rather than the general CLI default;
- metrics are enabled;
- artifact output uses a unique per-session directory;
- read-only-root-compatible paths are used;
- unsafe client initialize metadata is rejected; and
- structured logging follows the chart-selected format.

New bridge behavior uses `CLOAK_PLAYWRIGHT_MCP_*` names. Existing upstream
browser behavior continues to use `PLAYWRIGHT_MCP_*`. No
`CLOAKBROWSER_MCP_*` aliases are introduced.

### RUN-002: External authentication

Every request to `/mcp`, `/healthz`, and `/readyz` requires
`Authorization: Bearer <token>` using the external token. Missing, malformed,
or invalid credentials return `401` with an appropriate `WWW-Authenticate`
header and no sensitive detail. Comparison is timing-safe. Authentication is
performed before parsing or forwarding a request body.

The metrics listener validates its separate token with the same rules. The
external token is not accepted by the metrics listener, and the metrics token
is not accepted by the MCP listener.

### RUN-003: Authenticated exec probes

The CLI provides `cloakbrowser-mcp probe --kind health|ready`. It reads the
existing external auth token environment variable, calls the matching loopback
endpoint, prints neither the token nor response body, and exits nonzero on any
authentication, transport, timeout, status, or malformed-response failure.
Kubernetes startup, liveness, and readiness probes invoke this command. Tokens
never appear in rendered probe headers or command arguments.

### RUN-004: Health and readiness

`/healthz` reports process/listener health. `/readyz` returns `503` while the
Pod is draining, while a required listener is unavailable, or while the
selected Redis provider is unhealthy. Session capacity does not affect
readiness. At capacity, only a new MCP initialization is rejected with `503`;
existing session requests remain eligible.

### RUN-005: Safe session metadata overrides

Chart mode allows per-session overrides only for:

- headless mode;
- humanized behavior and its preset;
- viewport;
- locale and timezone;
- color scheme;
- geolocation;
- device scale, mobile, and touch flags; and
- user agent.

It rejects proxy server/bypass, persistent profile paths, extension paths,
filesystem paths, HTTP credentials, extra HTTP headers containing credentials,
storage state, arbitrary Chromium arguments, unrestricted file access, and
other credential-bearing or filesystem-expanding overrides. Rejection is a
configuration error before a browser child process starts.

### RUN-006: Secret rotation

Existing Secret content is not copied into the ConfigMap or Pod-template
checksum. Operators rotate a referenced Secret and explicitly roll out the
Deployment for the new value to take effect. Documentation gives a safe rollout
procedure that does not display secret values.

## 8. Session Ownership, Routing, And Drain

### SES-001: Memory provider

The memory provider owns metadata and browser runtimes in one process. It is
valid only for one replica with HPA disabled. Session expiry and closure dispose
only the relevant bridge and child process. Shutdown does not use global
cross-owner clear semantics.

### SES-002: Redis record

Redis stores a versioned record containing at least schema version, opaque
session ID, owner instance ID, owner Pod name, owner Pod IP/address, creation
time, last-seen time, expiry, and status. Records use native TTLs under the
release-specific prefix. Unknown schema versions fail closed and make the
request non-routable; they are never silently rewritten.

### SES-003: Atomic ownership

Create-if-absent, owner-checked touch, status transition, deletion, expiry
handling, and lease operations are atomic. Closing or terminating one replica
cannot delete or clear records owned by another replica. Duplicate
initialization cannot result in two owners for one session ID.

### SES-004: Owner routing

A request that reaches its owner is handled locally. A request that reaches a
healthy non-owner is streamed to the recorded owner Pod on port `3001` using
native HTTP streaming. Forwarding preserves the HTTP method, MCP headers,
content type, status, response headers, body streaming, backpressure, and client
cancellation. Hop-by-hop headers are stripped.

The peer listener validates both the external bearer token and the independent
routing token. A one-hop marker prevents forwarding loops, and the owner record
is revalidated before dispatch. Raw session IDs, tokens, and owner URLs are not
written to logs. Peer traffic is plain HTTP inside the cluster; the routing
token and NetworkPolicy are mandatory, while CNI-level wire encryption is an
optional operator control.

### SES-005: Failure semantics

- Redis connection or operation failure makes Redis-backed replicas unready.
- New and routed requests fail closed with `503` while Redis is unavailable.
- A locally owned in-flight operation may finish during a Redis outage.
- An unreachable owner returns `503` during the 30-second owner lease.
- After that lease expires, the session is treated as lost and returns the MCP
  `SessionNotFound` error so the client can initialize a new session.
- Routing timeout, cancellation, malformed owner address, loop detection, and
  invalid peer authentication fail without retrying another arbitrary Pod.

### SES-006: Graceful termination

On `SIGTERM`, a replica becomes unready and rejects new initialization, while
remaining reachable for peer-routed existing sessions. It drains local
sessions and pending artifact uploads concurrently for up to 300 seconds. At
the deadline it closes remaining browser processes, performs best-effort final
artifact handling, and deletes only its own Redis records. Kubernetes provides
330 seconds before forced termination.

### SES-007: Upgrade and rollback

Deployment strategy defaults to RollingUpdate with `maxUnavailable: 0` and
`maxSurge: 1`. Operators drain active sessions before upgrade or rollback. No
cross-version peer protocol or live-session compatibility guarantee is made.
Rollback restores chart resources and configuration but cannot restore browser
processes already terminated.

## 9. Filesystem And Artifact Contract

### ART-001: Session isolation

Every session receives a private directory below
`/data/artifacts/<session-id>`, passed as that session's upstream output
directory. Directory creation uses server-generated opaque IDs and canonical
containment checks. Client values cannot select output, profile, extension, or
other host/container paths. Traversal, absolute-path escape, and symlink escape
are rejected before use.

### ART-002: Local cleanup

The artifact tracker observes regular files without following symlinks. A file
is stable only when size and modification time are unchanged for at least five
seconds across two observations. Retention and quota cleanup evict the oldest
stable completed files first and never remove a changing file.

If a bound is exceeded while no stable file can be evicted, the MCP session
continues, one bounded warning and counter event are emitted, and cleanup is
retried. The Kubernetes volume size is the hard storage limit. Errors do not
include artifact names or content.

### ART-003: S3 upload

The S3 provider uploads stable completed files in the background and flushes
for up to five minutes during close/drain. Retries use exponential backoff
capped at 60 seconds. Upload failure does not fail the MCP request or close the
session; the local file is retained, retried while possible, and represented in
metrics.

Object keys use:

`<operator-prefix>/<release>/<pod>/<session-id>/<relative-artifact-path>`

After a successful, checksum-verified upload, the local file is deleted. S3
retention, versioning, backup, and lifecycle deletion are operator-managed. The
application does not return presigned URLs or expose a retrieval API.

### ART-004: Storage modes

`emptyDir` is the secure default. A chart-created PVC is supported only for one
replica without HPA. PVC data survives Pod replacement according to the
StorageClass and reclaim policy. HPA requires per-Pod `emptyDir` plus S3 so
artifacts are not tied solely to an autoscaled Pod.

## 10. Container And Browser Security

### SEC-001: Fixed Pod security

The workload uses UID `1000`, GID `1000`, and fsGroup `1000`; runs non-root;
uses a read-only root filesystem; disables privilege escalation; drops every
Linux capability; and uses `RuntimeDefault` seccomp. Privileged mode, host
networking, host PID/IPC, `hostPath`, and ServiceAccount token automounting are
disabled. No Kubernetes API permissions are granted.

The only writable mounts are the fixed artifact volume, the 1 GiB memory-backed
`/dev/shm`, and the 1 GiB `/tmp` volume. Browser temporary profiles and files
must remain inside these roots.

### SEC-002: Browser sandbox

CloakBrowser runs with Chromium sandboxing enabled. The application does not
fall back to `--no-sandbox`. Nodes must support the required unprivileged user
namespace/runtime behavior; otherwise startup fails and the Pod remains
unready. This limitation and remediation are documented.

### SEC-003: Network isolation

The default-deny policy blocks all MCP clients and all browser destinations
until explicitly configured. Portable rules allow only selected Pods,
namespaces, CIDRs, and ports. Cilium hostname rules are the supported
hostname-level browser allowlist. Unapproved RFC1918, loopback, link-local, and
cloud metadata destinations remain unreachable unless an operator explicitly
adds them.

Application `allowedOrigins` and `blockedOrigins` provide defense in depth but
do not replace network enforcement. Proxy use does not create a direct-browser
egress exception beyond DNS and the configured proxy destination.

### SEC-004: Supply chain

All external GitHub Actions are pinned by full commit SHA with a human-readable
version comment. Workflow and test container images use immutable digests.
Chart verification checks that no Secret value is rendered into ConfigMaps,
Pod annotations, probes, NOTES, test output, or command arguments.

## 11. Observability Contract

### OBS-001: Logs

The runtime supports `pretty` and `json` log formats; `pretty` is the chart
default. Both formats redact tokens, authorization headers, credentials,
certificate/key content, authenticated URLs, proxy addresses, request bodies,
artifact names, and raw session IDs. Session correlation uses only a
process-local keyed hash that cannot be reversed or correlated across restarts.

Operational HTTP logs go to stdout in Streamable HTTP mode. MCP bodies and
upstream protocol payloads are never logged.

### OBS-002: Metrics

The application uses an isolated Prometheus registry and registers standard
Node.js process metrics. Required metric families, using a
`cloakbrowser_mcp_` prefix, cover:

- HTTP requests and duration by bounded route, method, and status code;
- active and pending sessions plus created, expired, closed, and rejected
  totals;
- active browser child processes, starts, and bounded failure reasons;
- forwarded peer requests and bounded routing failure reasons;
- Redis availability, bounded operation failures, and reconnects;
- local artifact bytes/files, cleanup pressure, upload queue depth, upload
  results, retries, and duration;
- application build/version information; and
- standard Node.js process CPU, memory, event-loop, and garbage-collection
  metrics.

The public application metric names are:

| Metric | Type | Allowed application labels |
| --- | --- | --- |
| `cloakbrowser_mcp_http_requests_total` | Counter | `route`, `method`, `status_code` |
| `cloakbrowser_mcp_http_request_duration_seconds` | Histogram | `route`, `method`, `status_code` |
| `cloakbrowser_mcp_sessions_active` | Gauge | `provider` |
| `cloakbrowser_mcp_sessions_pending` | Gauge | `provider` |
| `cloakbrowser_mcp_sessions_created_total` | Counter | `provider` |
| `cloakbrowser_mcp_sessions_expired_total` | Counter | `provider` |
| `cloakbrowser_mcp_sessions_closed_total` | Counter | `provider`, `reason` |
| `cloakbrowser_mcp_sessions_rejected_total` | Counter | `provider`, `reason` |
| `cloakbrowser_mcp_browser_processes_active` | Gauge | none |
| `cloakbrowser_mcp_browser_process_starts_total` | Counter | none |
| `cloakbrowser_mcp_browser_process_failures_total` | Counter | `reason` |
| `cloakbrowser_mcp_peer_forwarded_requests_total` | Counter | `outcome` |
| `cloakbrowser_mcp_peer_routing_failures_total` | Counter | `reason` |
| `cloakbrowser_mcp_redis_up` | Gauge | none |
| `cloakbrowser_mcp_redis_operation_failures_total` | Counter | `operation` |
| `cloakbrowser_mcp_redis_reconnects_total` | Counter | none |
| `cloakbrowser_mcp_artifact_local_bytes` | Gauge | none |
| `cloakbrowser_mcp_artifact_local_files` | Gauge | none |
| `cloakbrowser_mcp_artifact_cleanup_pressure_total` | Counter | `reason` |
| `cloakbrowser_mcp_artifact_upload_queue` | Gauge | none |
| `cloakbrowser_mcp_artifact_uploads_total` | Counter | `outcome` |
| `cloakbrowser_mcp_artifact_upload_retries_total` | Counter | none |
| `cloakbrowser_mcp_artifact_upload_duration_seconds` | Histogram | `outcome` |
| `cloakbrowser_mcp_build_info` | Gauge fixed at 1 | `version` |

Finite label values are fixed as follows: `route` is `mcp`, `healthz`,
`readyz`, or `other`; `method` is `GET`, `POST`, `DELETE`, or `OTHER`;
`provider` is `memory` or `redis`; session close/rejection reasons come from
`client`, `expired`, `drain`, `browser_exit`, `capacity`,
`backend_unavailable`, `invalid_request`, or `error` as applicable; browser
failure reasons are `spawn`, `exit`, or `timeout`; routing outcomes/reasons come
from `success`, `failure`, `cancelled`, `auth`, `owner_missing`,
`owner_unreachable`, `backend_unavailable`, `loop`, `timeout`, or
`invalid_owner`; Redis operations are `connect`, `create`, `load`, `touch`,
`transition`, `delete`, or `lease`; artifact pressure reasons are `bytes`,
`files`, or `volume`; and upload outcomes are `success`, `failure`, or
`cancelled`. `status_code` is one of `200`, `202`, `204`, `400`, `401`, `404`,
`405`, `413`, `415`, `500`, `503`, or `other`, never arbitrary text.

Metrics never contain arbitrary URLs, hostnames, session IDs, credentials,
proxy values, request bodies, artifact names, object keys, or user-provided
error text. Every label has a documented finite value set.

### OBS-003: Alerts

When PrometheusRule is enabled, it contains configurable rules with these
defaults:

- target absent or unready for five minutes;
- Redis unavailable for five minutes;
- peer-routing failures above zero for five minutes;
- S3 upload failures above zero for ten minutes;
- session-capacity rejections above zero for ten minutes; and
- container memory above 90% of its limit for ten minutes.

No Prometheus stack is required by the chart or the homelab acceptance run.

## 12. Connection And Operator Experience

### UX-001: NOTES

`NOTES.txt` prints commands or URLs for every enabled connection method:

- ClusterIP access from another Pod;
- an exact `kubectl port-forward` command;
- the configured Ingress URL; and
- the authenticated metrics port-forward command.

NOTES states the required Secret names and keys but never reads or displays
their values. It does not print stdio, HTTPRoute, NodePort, or LoadBalancer
instructions.

### UX-002: Errors

Configuration errors name the invalid value path and violated constraint
without echoing secret content. Runtime failures distinguish authentication
`401`, capacity/backend/owner availability `503`, malformed client input `4xx`,
and MCP `SessionNotFound`. Errors do not reveal Pod IPs, Redis/S3 endpoints, or
filesystem paths beyond documented fixed roots.

## 13. Distribution And Release Contract

### REL-001: Destinations

The canonical destinations are:

- GHCR OCI: `oci://ghcr.io/swimmwatch/charts/cloakbrowser-mcp`;
- Docker Hub OCI: `oci://registry-1.docker.io/swimmwatch/charts-cloakbrowser-mcp`;
- classic repository: `https://swimmwatch.github.io/cloakbrowser-mcp/charts`;
- a `.tgz` asset on the matching GitHub Release; and
- an Artifact Hub listing for the classic repository.

### REL-002: Unified release

Chart publication is integrated with the existing authorized application `v*`
release flow. A chart archive is published only when its `Chart.yaml` version
has not been published before. The workflow requires `Chart.appVersion` to
equal the application release version and does not automatically bump the chart
version.

The chart is packaged exactly once. The identical archive bytes are used for
the GitHub Release and Pages repository and as the OCI chart layer for GHCR and
Docker Hub. The workflow records and verifies the archive SHA-256 and OCI layer
digests.

The Pages publication merges the complete classic chart repository with the
existing MkDocs site. It cannot delete project documentation or previously
published chart versions.

### REL-003: Partial publication failure

If one destination fails after another accepted the archive, the unified
release fails. Already published immutable artifacts are not deleted. A retry
detects matching already-published digests and completes only missing
destinations; a digest mismatch is a hard failure requiring maintainer
investigation.

### REL-004: Publication authorization

No chart package, Artifact Hub registration, GitHub Release, registry artifact,
or Pages index is published merely because this specification or its repository
implementation is complete.

`MANUAL GATE — PUBLICATION`: before any release/publication action, the agent
must stop, show the exact release tag, chart/app versions, archive checksum,
destinations, and intended commands/actions, and request explicit operator
authorization through the available user-input tool. Secret values are never
requested or displayed.

Publication is the only unconditional manual gate. A separately requested
homelab acceptance run authorizes its scoped cluster setup, tests, disruption,
and namespaced cleanup without additional pauses.

## 14. Documentation Contract

### DOC-001: Required documentation

The repository contains:

- a chart README;
- an English MkDocs Helm guide and all ten repository-supported localized
  counterparts;
- Artifact Hub repository metadata and chart annotations; and
- working example values for memory, Redis/HPA, ingress-nginx, S3, Cilium, and
  PVC deployments.

### DOC-002: Required subjects

Documentation covers:

- installation from GHCR, Docker Hub, GitHub Pages, GitHub Release, and
  Artifact Hub;
- ClusterIP, port-forward, and ingress-nginx connection methods;
- Streamable HTTP configuration examples for Visual Studio Code, Claude Code,
  OpenAI Codex, generic MCP JSON, and `curl` diagnostics;
- existing Secret templates containing placeholders but no real credentials;
- token/credential rotation followed by an explicit Pod rollout;
- memory versus Redis ownership, HPA constraints, owner loss, and stale-session
  recovery;
- Redis standalone, TLS, Sentinel, Cluster, and Valkey compatibility;
- ingress-nginx TLS and streaming behavior;
- NetworkPolicy, DNS, Cilium FQDN rules, proxy routing, and internal-network
  isolation;
- artifact lifecycle, local/PVC storage, S3 object layout, retrieval, retry,
  cleanup, and pressure recovery;
- CloakBrowser CPU, memory, `/dev/shm`, `/tmp`, and sandbox requirements;
- metrics authentication, ServiceMonitor, PrometheusRule, alert semantics, and
  log redaction;
- browser crash, Redis outage, drain-first upgrade, and rollback procedures;
- one-tenant-per-release security boundaries; and
- troubleshooting for authentication, readiness, routing, storage, DNS,
  egress, and sandbox failures.

English is authoritative. Localized prose follows repository translation policy
without changing code blocks, identifiers, environment variables, chart value
paths, or commands. Navigation and the translation manifest remain consistent.

## 15. Verification And Acceptance

### ACC-001: Repository chart verification

Automated repository checks prove:

- `helm lint` succeeds with the latest supported Helm 3 and Helm 4;
- default memory, Redis/HPA, ingress/TLS, S3, Cilium, ServiceMonitor,
  PrometheusRule, and PVC scenarios render deterministically;
- positive and negative `values.schema.json` fixtures exercise every enum,
  required field, secret boundary, and cross-field rule;
- kube-linter reports no unresolved security findings;
- the authenticated Helm test initializes Streamable HTTP using an existing
  auth Secret and an immutable test image;
- checksum annotations roll Pods for ConfigMap changes;
- image digest rendering takes precedence over tag;
- ConfigMap, Secret references, probes, Services, and Ingress expose only the
  intended data and paths; and
- unsupported HTTPRoute, Service types, Pod customization, storage, and secret
  values are rejected.

### ACC-002: Runtime verification

Focused unit, property, and integration tests use fake Redis, S3, and upstream
boundaries to verify:

- chart-mode validation and flag/environment precedence;
- external, metrics, and peer authentication separation;
- probe exit behavior without token/body output;
- capacity rejection without readiness failure;
- atomic owner creation, owner-only touch/delete, expiry, and schema rejection;
- non-owner streaming, headers/status preservation, backpressure,
  cancellation, loop prevention, and stale-owner behavior;
- Redis outage and reconnect behavior;
- graceful drain and owner-scoped cleanup;
- safe metadata allow/reject lists;
- artifact containment, symlink escape rejection, stable-file detection,
  eviction, S3 retry/flush, and post-upload deletion;
- metric names, bounded label sets, authentication, and absence of sensitive
  values;
- JSON/pretty log redaction and hashed session correlation; and
- execution with a read-only root filesystem and the fixed writable mounts.

Existing project checks, Docker build/smoke tests, and upstream bridge parity
checks remain required. No test changes the upstream browser tool schemas or
the two local introspection tools.

### ACC-003: Documentation and workflow verification

Strict MkDocs build, SEO validation, compatibility generation checks,
translation checks, actionlint, and zizmor pass. Workflow permissions are
least-privilege, and every Action/image pin is immutable. Publication logic is
tested without pushing an artifact.

### ACC-004: Homelab prerequisites

The acceptance target is a Linux/AMD64 kubeadm cluster in Proxmox with a default
StorageClass. The run uses a dedicated `cloakbrowser-mcp-acceptance` namespace
and derives a reachable test hostname from discovered cluster/ingress context.
It records the exact context and targets before mutation.

The acceptance harness may install pinned versions of:

- ingress-nginx if it is absent;
- Cilium if required for FQDN enforcement;
- cert-manager with a namespaced self-signed Issuer;
- a disposable third-party Valkey chart; and
- a disposable MinIO chart.

The acceptance run generates random test-only auth, routing, metrics, Redis,
S3, and TLS material without printing it. The chart itself still consumes only
existing Secrets. Shared add-ons installed or found by the run are never
uninstalled automatically.

### ACC-005: Homelab scenarios

The homelab acceptance run verifies all of the following:

1. A single-replica memory deployment is reachable through authenticated HTTPS
   ingress; unauthorized `/mcp` and probe requests return `401`, while an
   authorized MCP initialization and subsequent request succeed.
2. Across two Redis-backed replicas, 100 sequential requests for one session
   all reach the owning browser with zero routing failures.
3. Redis outage makes Pods unready and rejects new/routed requests with `503`
   while an already-running local operation may finish.
4. Owner loss returns `503` during the 30-second lease and then
   `SessionNotFound`; session expiry and a 300-second graceful drain remove only
   owner-scoped records and processes.
5. Controlled load raises the HPA to at least two ready replicas within ten
   minutes and returns it to `minReplicas` after load ends and the 300-second
   stabilization window passes.
6. Default-deny prevents browsing until an explicit destination is allowed.
   Cilium FQDN policy permits fixed public test domains while unapproved
   internal, link-local, loopback, and metadata destinations remain
   unreachable.
7. Screenshots, downloads, traces, and videos remain inside their session root;
   traversal and symlink escape fail. A chart-created PVC preserves files
   through a single-replica Pod replacement.
8. With MinIO enabled, a stable artifact uploads under the documented object
   key, its checksum matches, and its local copy is deleted. An induced upload
   failure retains and later retries the local file without failing the MCP
   session.
9. Authenticated port-forwarding returns required native metrics; unauthorized
   scraping returns `401`. ServiceMonitor and PrometheusRule are rendered and
   validated but are not discovered by a live Prometheus stack.
10. The Pod is non-root, read-only-root, sandboxed, has no service-account token
    or RBAC, and can write only to `/data`, `/dev/shm`, and `/tmp`.

### ACC-006: Acceptance evidence and cleanup

The run retains a redacted evidence bundle containing:

- Kubernetes, CNI, Helm, chart, image, Valkey, MinIO, ingress-nginx, and
  cert-manager versions;
- redacted effective values and rendered manifests;
- a pass/fail matrix with timings, replica ownership, and scaling events;
- relevant redacted logs and metric samples;
- artifact object keys and checksums without artifact content or credentials;
  and
- a cleanup or retained-resource inventory.

After success, the acceptance namespace and disposable namespaced fixtures are
deleted automatically. After failure, they remain for diagnosis and the report
lists them. Shared cluster add-ons are preserved in both cases.

### ACC-007: Explicit rejection criteria

The feature is not accepted if any of these are true:

- stdio, a probe, metrics, or peer routing becomes publicly exposed through
  Ingress or the application Service;
- more than one memory-backed replica can render or install;
- HPA can run without Redis, routing authentication, ephemeral storage, and S3;
- browser egress is open by default;
- a raw secret, authenticated URL, raw session ID, artifact name, request body,
  or internal owner address appears in non-Secret manifests, logs, metrics,
  NOTES, or test output;
- a session can access another session's files or escape a fixed writable root;
- one Pod can delete another Pod's Redis records;
- Redis failure routes a request to an arbitrary Pod or silently starts a
  replacement browser for an existing session;
- S3 failure terminates an otherwise healthy MCP session;
- the chart weakens fixed container security settings;
- chart publication can overwrite project documentation or previously
  published chart versions; or
- any chart artifact is published without the publication manual gate.

## 16. Research Basis

The chart structure and validation model follow official Helm guidance for
`Chart.yaml`, `values.yaml`, `values.schema.json`, templates, NOTES, OCI
registries, and classic repositories. Kubernetes contracts follow official
guidance for `autoscaling/v2`, default-deny NetworkPolicy, Pod security,
ephemeral-storage limits, and memory-backed `emptyDir` volumes.

Representative MCP chart patterns considered for ConfigMap/Secret separation,
HPA, NetworkPolicy, monitoring, and session-aware routing include:

- [IBM MCP Context Forge](https://github.com/IBM/mcp-context-forge)
- [Stacklok ToolHive](https://github.com/stacklok/toolhive)
- [Kubernetes MCP Server](https://github.com/containers/kubernetes-mcp-server)
- [Microsoft MCP Gateway](https://github.com/microsoft/mcp-gateway)
- [Agentgateway](https://github.com/agentgateway/agentgateway)

These projects are design precedents only. This chart preserves
cloakbrowser-mcp's own public tool, transport, security, and release contracts.
