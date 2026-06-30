---
description: persistent /data profiles, extension mounts, और CloakBrowser के साथ repeatable Playwright MCP browser automation के लिए CloakBrowser MCP Docker इमेज चलाएँ।
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# डॉकर

प्रकाशित छवि दोहराए जाने योग्य MCP उपयोग के लिए अनुशंसित रनटाइम है।

## दौड़ो

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

आर्टिफैक्ट्स कंटेनर में `/data` पर लिखे जाते हैं। स्क्रीनशॉट, स्नैपशॉट, डाउनलोड और नेटवर्क आउटपुट रखने के लिए उस पथ को माउंट करें।

`--init` की अनुशंसा इसलिए की जाती है क्योंकि ब्राउज़र ऑटोमेशन अल्पकालिक चाइल्ड प्रक्रियाएँ उत्पन्न कर सकता है। Docker की init प्रक्रिया उन चाइल्ड प्रक्रियाओं को स्वच्छ रूप से समाप्त कर देती है।

उसी रिलीज़ टैग्स को Docker Hub पर `swimmwatch/cloakbrowser-mcp` और GHCR पर `ghcr.io/swimmwatch/cloakbrowser-mcp` के रूप में प्रकाशित किए जाते हैं।

## स्थायी प्रोफ़ाइलें

Docker डिफ़ॉल्ट रूप से स्थायी ब्राउज़र प्रोफ़ाइल सक्षम नहीं करता। जब आप चाहते
हैं कि cookies, local storage, cache या एक्सटेंशन स्थिति कंटेनर रीस्टार्ट के
बाद भी बनी रहे, तो मौजूदा `/data` वॉल्यूम को स्थायीकरण रूट के रूप में उपयोग
करें:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker के अंदर पर्यावरण चर को `/data/profiles/default` जैसे कंटेनर पथों का
उपयोग करना चाहिए, होस्ट पथों का नहीं। ब्रिज प्रोफ़ाइल निर्देशिका अनुपस्थित
होने पर बनाता है, लिखने योग्य होने की पुष्टि करता है, कंटेनर पथ को जेनरेट की
गई Playwright MCP कॉन्फ़िग में लिखता है, और एक ही सर्वर प्रक्रिया में
डुप्लिकेट सक्रिय प्रोफ़ाइल निर्देशिकाओं को अस्वीकार करता है।

Chrome एक्सटेंशन के लिए स्थायी प्रोफ़ाइल आवश्यक है और उन्हें अलग से माउंट करना
चाहिए। एक्सटेंशन माउंट read-only हो सकता है:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

जब किसी पथ में कॉमा हों, तो `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` के लिए JSON
ऐरे का उपयोग करें। Windows पर npm उपयोग के लिए, ड्राइव-लेटर पथ पास करने का
सबसे सुरक्षित तरीका भी JSON ऐरे है।

## स्ट्रीम करने योग्य HTTP

स्थानीय Streamable HTTP उपयोग के लिए, कंटेनर पोर्ट को लूपबैक पर प्रकाशित करें:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

कंटेनर से सीधे HTTPS के लिए, अपने प्रमाणपत्र फ़ाइलें माउंट करें और HTTPS चुनें:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

होस्ट-साइड `127.0.0.1:3000` बाइंड एंडपॉइंट को लोकल रखता है। यदि आप किसी नॉन-लूपबैक इंटरफ़ेस पर स्ट्रीमएबल HTTP प्रकाशित करते हैं, तो HTTPS के साथ प्रमाणीकरण का उपयोग करें, या सर्वर को प्रमाणीकरण और नेटवर्क नियंत्रणों के साथ एक विश्वसनीय TLS-टर्मिनेटिंग रिवर्स प्रॉक्सी के पीछे रखें।
स्ट्रीमएबल HTTP निश्चित `GET /healthz` और `GET /readyz` एक ही होस्ट और पोर्ट पर प्रोब करते हैं। यदि `--http-auth-token` या `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` कॉन्फ़िगर किया गया है, तो प्रोब्स को MCP अनुरोधों के समान ही `Authorization: Bearer ...` हेडर की आवश्यकता होती है।
सभी HTTP ट्रांसपोर्ट फ़्लैग और पर्यावरण चर के लिए उत्पन्न [CLI संदर्भ](generated/cli.md) देखें।

## GeoIP प्रॉक्सी मिलान

Docker, npm की तरह ही वही प्रॉक्सी और GeoIP एनवायरनमेंट वेरिएबल्स का उपयोग करता है। जब क्षेत्रीय QA को कॉन्फ़िगर की गई प्रॉक्सी लोकेशन का पालन करने के लिए CloakBrowser टाइमज़ोन, भाषा और लोकेल फिंगरप्रिंट्स की आवश्यकता हो, तो GeoIP प्रॉक्सी मैचिंग को सक्षम करें:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

प्रमाणित प्रॉक्सी के लिए, प्रॉक्सी URL में क्रेडेंशियल एम्बेड करें और उपयोगकर्ता नाम या पासवर्ड में विशेष वर्णों को प्रतिशत-एन्कोड करें।

जब कंटेनर स्ट्रीमएबल HTTP चलाता है, तो क्लाइंट `initialize` मेटाडेटा के माध्यम से प्रति MCP सत्र विभिन्न प्रॉक्सी भी चुन सकते हैं। देखें
रनटाइम प्रॉक्सी मेटाडेटा, बहु-क्षेत्र उपयोग के मामलों, और सीमाओं के लिए [GeoIP Proxy Matching](geoip-proxy-matching.md) देखें।

## पूर्वनिर्धारित मान

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## एमसीपी क्लाइंट कॉन्फ़िग

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "--init",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

स्थानीय रूप से बनाएँ

```bash
npm run docker:build
npm run docker:smoke
```

Dockerfile रनटाइम बेस के रूप में पिन किए गए आधिकारिक Playwright MCP इमेज का उपयोग करता है, बिल्ड के दौरान उपलब्ध Debian सुरक्षा अपडेट्स लागू करता है, रनटाइम इमेज से अनावश्यक ग्लोबल npm पेलोड को हटाता है, और `/opt/cloakbrowser-mcp`।

रिलीज़ वर्कफ़्लो SBOM और उत्पत्ति प्रमाणीकरण प्रकाशित करता है, स्रोत, संशोधन, संस्करण, लाइसेंस, बेस इमेज नाम और बेस इमेज डिजीस्ट के लिए OCI लेबल शामिल करता है, और प्रकाशित करने से पहले निर्मित इमेज को Trivy से स्कैन करता है।
