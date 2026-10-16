---
title: "Chrome एक्सटेंशन लोड करें"
description: Persistent profile के साथ unpacked Chrome extension को CloakBrowser MCP में load करें।
icon: material/puzzle
tags:
  - User Guide
---

# Chrome एक्सटेंशन लोड करें

Chrome extensions के लिए unpacked directory और persistent profile चाहिए।

यह recipe CloakBrowser के unpacked extension launch का उपयोग करती है। अलग से installed आधिकारिक Playwright Extension connection mode में `PLAYWRIGHT_MCP_EXTENSION=true`, process-level `PLAYWRIGHT_MCP_EXTENSION_TOKEN` और dedicated persistent profile चाहिए। दोनों mechanisms को न मिलाएँ।

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Multiple paths, commas या Windows drive-letter paths के लिए JSON array उपयोग करें।

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Extension files या paths बदलने के बाद server restart करें।

## सत्यापन

MCP क्लाइंट से वह पेज खोलने को कहें जहां एक्सटेंशन सक्रिय होना चाहिए, फिर व्यवहार जांचें या स्क्रीनशॉट लें। ब्रिज की अपेक्षित पैकेज संस्करण जांचने के लिए `cloakbrowser_bridge_info` भी बुला सकते हैं।

## संबंधित

- [विन्यास](../configuration.md#chrome-extensions)
- [डॉकर](../docker.md#chrome-extensions)
- [स्थायी लॉगिन प्रोफ़ाइल](persistent-login-profile.md)
