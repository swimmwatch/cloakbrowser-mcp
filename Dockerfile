# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE_TAG=22-bookworm-slim
ARG PLAYWRIGHT_MCP_IMAGE=mcr.microsoft.com/playwright/mcp:v0.0.75

FROM node:${NODE_IMAGE_TAG} AS deps
WORKDIR /src
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund --ignore-scripts

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM deps AS prod-deps
RUN npm prune --omit=dev --ignore-scripts \
 && npm cache clean --force

FROM ${PLAYWRIGHT_MCP_IMAGE} AS runtime
USER root
WORKDIR /opt/cloakbrowser-mcp

LABEL io.modelcontextprotocol.server.name="io.github.swimmwatch/cloakbrowser-mcp"
LABEL org.opencontainers.image.title="CloakBrowser MCP"
LABEL org.opencontainers.image.description="Playwright MCP bridge that runs upstream browser tools with CloakBrowser."
LABEL org.opencontainers.image.source="https://github.com/swimmwatch/cloakbrowser-mcp"
LABEL org.opencontainers.image.licenses="MIT"

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
ENV CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=true
ENV CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS=true
ENV CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true

RUN --mount=type=cache,target=/home/node/.cache/cloakbrowser-build,uid=1000,gid=1000,sharing=locked \
    CLOAKBROWSER_CACHE_DIR=/home/node/.cache/cloakbrowser-build node node_modules/cloakbrowser/dist/cli.js install \
 && cp -a /home/node/.cache/cloakbrowser-build/. /home/node/.cloakbrowser/

VOLUME ["/data"]
ENTRYPOINT ["node", "/opt/cloakbrowser-mcp/dist/cli.js"]
