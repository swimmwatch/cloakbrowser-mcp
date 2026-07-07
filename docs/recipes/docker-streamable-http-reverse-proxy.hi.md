---
title: "रिवर्स प्रॉक्सी के पीछे Docker Streamable HTTP"
description: CloakBrowser MCP Docker container image को TLS reverse proxy के लिए local Streamable HTTP server की तरह चलाएँ।
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# रिवर्स प्रॉक्सी के पीछे Docker Streamable HTTP

जब reverse proxy TLS terminate करता है और access controls लागू करता है, यह pattern उपयोग करें।

## Server शुरू करें

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Container अंदर 0.0.0.0 सुनता है, लेकिन Docker port को host loopback पर ही publish करता है।

## endpoint proxy करें

```text
http://127.0.0.1:3000/mcp
```

Authorization और mcp-session-id unchanged forward करें। health probes को auth के पीछे या trusted network तक रखें।

## सत्यापन

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

## संबंधित

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
