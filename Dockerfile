# syntax=docker/dockerfile:1.7

# --- dependency stage ---------------------------------------------------------
ARG NODE_IMAGE_TAG=22-bookworm-slim
FROM node:${NODE_IMAGE_TAG} AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund --ignore-scripts

# --- build stage --------------------------------------------------------------
FROM deps AS build

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- production dependency stage ---------------------------------------------
FROM deps AS prod-deps

RUN npm prune --omit=dev --ignore-scripts \
 && npm cache clean --force

# --- runtime stage ------------------------------------------------------------
FROM node:${NODE_IMAGE_TAG} AS runtime

LABEL io.modelcontextprotocol.server.name="io.github.swimmwatch/cloakbrowser-mcp"

# CloakBrowser bundles its own Chromium build; we still need the standard
# headless-Chromium runtime libs so the binary loads.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates \
      gosu \
      fonts-liberation \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
      libcairo2 libasound2 libdrm2 libxshmfence1

# Non-root user.
RUN groupadd -r app && useradd -r -g app -m -d /home/app app

WORKDIR /app
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=prod-deps --chown=app:app /app/package.json ./package.json
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Artifacts/output volume and CloakBrowser runtime cache. The browser binary is
# downloaded at build time so the first MCP browser action does not block on a
# large runtime download.
ENV HOME=/home/app
ENV CLOAKBROWSER_CACHE_DIR=/home/app/.cloakbrowser
ENV CLOAKBROWSER_AUTO_UPDATE=false
RUN --mount=type=cache,target=/tmp/cloakbrowser-cache,sharing=locked \
    install -d -o app -g app /data "$CLOAKBROWSER_CACHE_DIR" /tmp/cloakbrowser-cache \
 && CLOAKBROWSER_CACHE_DIR=/tmp/cloakbrowser-cache gosu app node node_modules/cloakbrowser/dist/cli.js install \
 && cp -a /tmp/cloakbrowser-cache/. "$CLOAKBROWSER_CACHE_DIR"/ \
 && chown -R app:app /data "$CLOAKBROWSER_CACHE_DIR"
VOLUME ["/data"]
ENV CLOAKBROWSER_MCP_OUTPUT_DIR=/data
ENV CLOAKBROWSER_MCP_LOG_LEVEL=info

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
