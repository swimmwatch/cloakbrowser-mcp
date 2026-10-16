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

docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Container अंदर 0.0.0.0 सुनता है, लेकिन Docker port को host loopback पर ही publish करता है।

## endpoint proxy करें

अपने रिवर्स प्रॉक्सी को इस पते पर प्रमाणीकृत HTTPS ट्रैफ़िक अग्रेषित करने के लिए कॉन्फ़िगर करें:

```text
http://127.0.0.1:3000/mcp
```

`Authorization` और `mcp-session-id` हेडर बिना बदलाव आगे भेजें। `/healthz` और `/readyz` तक पहुंच केवल विश्वसनीय स्थिति जांचों को दें या वही Bearer टोकन आवश्यक करें।

## सत्यापन

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

फिर MCP क्लाइंट में सार्वजनिक HTTPS URL कॉन्फ़िगर करें, उदाहरण के लिए:

```text
https://mcp.example.com/mcp
```

## संबंधित

- [डॉकर](../docker.md#streamable-http)
- [विन्यास](../configuration.md#https)
- [सुरक्षा](../security.md)
