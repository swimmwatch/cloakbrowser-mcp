---
title: "स्थायी लॉगिन प्रोफ़ाइल"
description: Persistent profile directory के साथ CloakBrowser cookies, local storage, cache और extension state को reuse करें।
icon: material/account-key
tags:
  - User Guide
---

# स्थायी लॉगिन प्रोफ़ाइल

Persistent profile browser sessions के बीच login state बचाता है।

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

MCP client को उसी command से configure करें। एक profile directory को दो active servers में share न करें।

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Environment variables में container paths उपयोग करें; host path केवल volume mount में रहता है।

## सत्यापन

1. MCP क्लाइंट से लॉगिन पेज खोलने को कहें और लॉगिन करें।
2. सर्वर सही तरीके से बंद करें।
3. उसी `PLAYWRIGHT_MCP_USER_DATA_DIR` के साथ फिर शुरू करें।
4. क्लाइंट से साइट दोबारा खोलने को कहें और सुनिश्चित करें कि लॉगिन स्थिति बनी है।

## संबंधित

- [विन्यास](../configuration.md#streamable-http-runtime-metadata)
- [डॉकर](../docker.md#persistent-profiles)
- [Chrome एक्सटेंशन लोड करें](load-chrome-extension.md)

## CloakBrowser 0.6.0

CloakBrowser stealth सक्षम होने पर, स्पष्ट रूप से कॉन्फ़िगर किया गया स्थायी प्रोफ़ाइल अपना fingerprint seed `.cloakbrowser-seed` में रखता है। अपडेट के बाद पहली बार शुरू करने पर, फ़ाइल न होने की स्थिति में seed दिया जाता है। स्पष्ट `--fingerprint`, जिसमें `--fingerprint=off` भी शामिल है, को प्राथमिकता मिलती है और फ़ाइल नहीं बदलती। stealth अक्षम होने पर भी फ़ाइल नहीं बदलती। खराब फ़ाइल चेतावनी के साथ दोबारा बनाई जाती है; फ़ाइल तक पहुँच में त्रुटि होने पर स्टार्टअप रुक जाता है।
