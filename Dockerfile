# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE_REF=node:22-bookworm-slim@sha256:7af03b14a13c8cdd38e45058fd957bf00a72bbe17feac43b1c15a689c029c732
ARG PLAYWRIGHT_MCP_IMAGE=mcr.microsoft.com/playwright/mcp:v0.0.76@sha256:3108dac789720d5236ee1869ad65c8f32fbbfe9d7eea8a5eb89920ab35a665d6

FROM ${NODE_IMAGE_REF} AS deps
WORKDIR /src
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund --ignore-scripts

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts/copy-runtime-assets.mjs ./scripts/copy-runtime-assets.mjs
RUN npm run build

FROM deps AS prod-deps
RUN npm prune --omit=dev --ignore-scripts \
 && npm cache clean --force

FROM ${PLAYWRIGHT_MCP_IMAGE} AS runtime
ARG PLAYWRIGHT_MCP_IMAGE=mcr.microsoft.com/playwright/mcp:v0.0.76@sha256:3108dac789720d5236ee1869ad65c8f32fbbfe9d7eea8a5eb89920ab35a665d6
ARG PLAYWRIGHT_MCP_IMAGE_DIGEST=unknown
ARG RELEASE_VERSION=0.0.0
ARG RELEASE_VERSION_TAG=v0.0.0
ARG VCS_REF=unknown
USER root
WORKDIR /opt/cloakbrowser-mcp

LABEL io.modelcontextprotocol.server.name="io.github.swimmwatch/cloakbrowser-mcp"
LABEL org.opencontainers.image.title="CloakBrowser MCP"
LABEL org.opencontainers.image.description="Playwright MCP bridge that runs upstream browser tools with CloakBrowser."
LABEL org.opencontainers.image.url="https://swimmwatch.github.io/cloakbrowser-mcp/"
LABEL org.opencontainers.image.documentation="https://swimmwatch.github.io/cloakbrowser-mcp/"
LABEL org.opencontainers.image.source="https://github.com/swimmwatch/cloakbrowser-mcp"
LABEL org.opencontainers.image.version="${RELEASE_VERSION}"
LABEL org.opencontainers.image.ref.name="${RELEASE_VERSION_TAG}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.authors="swimmwatch"
LABEL org.opencontainers.image.vendor="swimmwatch"
LABEL org.opencontainers.image.base.name="${PLAYWRIGHT_MCP_IMAGE}"
LABEL org.opencontainers.image.base.digest="${PLAYWRIGHT_MCP_IMAGE_DIGEST}"

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
 && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps --chown=node:node /src/node_modules ./node_modules
COPY --from=build --chown=node:node /src/dist ./dist
COPY --from=build --chown=node:node /src/package.json ./package.json

RUN mkdir -p /data /home/node/.cloakbrowser \
 && chown -R node:node /opt/cloakbrowser-mcp /data /home/node/.cloakbrowser

USER node
ENV HOME=/home/node
ENV CLOAKBROWSER_CACHE_DIR=/home/node/.cloakbrowser
ENV CLOAKBROWSER_AUTO_UPDATE=false
ENV PLAYWRIGHT_MCP_CLI_PATH=/app/cli.js
ENV PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak
ENV PLAYWRIGHT_MCP_HEADLESS=true
ENV PLAYWRIGHT_MCP_OUTPUT_DIR=/data
ENV PLAYWRIGHT_MCP_OUTPUT_MODE=stdout
ENV MCP_SERVER_VERSION=${RELEASE_VERSION}
ENV MCP_SERVER_VERSION_TAG=${RELEASE_VERSION_TAG}
ENV MCP_SERVER_REVISION=${VCS_REF}
ENV CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=true
ENV CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS=true
ENV CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true

RUN --mount=type=cache,target=/home/node/.cache/cloakbrowser-build,uid=1000,gid=1000,sharing=locked \
    CLOAKBROWSER_CACHE_DIR=/home/node/.cache/cloakbrowser-build node node_modules/cloakbrowser/dist/cli.js install \
 && rm -f /home/node/.cache/cloakbrowser-build/_download_*.tar.gz \
 && cp -a /home/node/.cache/cloakbrowser-build/. /home/node/.cloakbrowser/ \
 && rm -f /home/node/.cloakbrowser/_download_*.tar.gz

VOLUME ["/data"]
ENTRYPOINT ["node", "/opt/cloakbrowser-mcp/dist/cli.js"]
