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
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

आर्टिफैक्ट्स कंटेनर में `/data` पर लिखे जाते हैं। स्क्रीनशॉट, स्नैपशॉट, डाउनलोड और नेटवर्क आउटपुट रखने के लिए उस पथ को माउंट करें।

इमेज Tini को PID 1 और subreaper के रूप में चलाती है, इसलिए सामान्य कमांड के लिए अतिरिक्त Docker init प्रक्रिया की आवश्यकता नहीं है।

## Headed सत्र, health check और प्रतिबंधित runtime

headless: false पर कंटेनर आवश्यकता होने पर निजी Xvfb शुरू करता है और कंटेनर समाप्त होने तक उसे बनाए रखता है। यह न तो दिखने वाला डेस्कटॉप है और न VNC, noVNC, RDP, host X11 या स्क्रीन कैप्चर सेवा। Playwright context, page, profile और artifact अलग रहते हैं, लेकिन native X11 focus, clipboard और स्क्रीन कैप्चर tenant isolation boundaries नहीं हैं। Docker health check निजी Unix socket से MCP CLI event loop और, यदि Xvfb शुरू हुआ है, उसकी उपलब्धता जांचता है; यह MCP stdio से traffic नहीं भेजता और /healthz या /readyz का विकल्प नहीं है। read-only root filesystem के लिए /data mount करें और headed सत्र संभव हों तो /tmp तथा /tmp/.X11-unix के लिए writable tmpfs दें।

उसी रिलीज़ टैग्स को Docker Hub पर `swimmwatch/cloakbrowser-mcp` और GHCR पर `ghcr.io/swimmwatch/cloakbrowser-mcp` के रूप में प्रकाशित किए जाते हैं।

## स्थायी प्रोफ़ाइलें

Docker डिफ़ॉल्ट रूप से स्थायी ब्राउज़र प्रोफ़ाइल सक्षम नहीं करता। जब आप चाहते
हैं कि cookies, local storage, cache या एक्सटेंशन स्थिति कंटेनर रीस्टार्ट के
बाद भी बनी रहे, तो मौजूदा `/data` वॉल्यूम को स्थायीकरण रूट के रूप में उपयोग
करें:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker के अंदर पर्यावरण चर को `/data/profiles/default` जैसे कंटेनर पथों का
उपयोग करना चाहिए, होस्ट पथों का नहीं। ब्रिज प्रोफ़ाइल निर्देशिका अनुपस्थित
होने पर बनाता है, लिखने योग्य होने की पुष्टि करता है, कंटेनर पथ को जेनरेट की
गई Playwright MCP कॉन्फ़िग में लिखता है, और एक ही सर्वर प्रक्रिया में
डुप्लिकेट सक्रिय प्रोफ़ाइल निर्देशिकाओं को अस्वीकार करता है।

## CloakBrowser लाइसेंस कैश

इमेज CloakBrowser बाइनरी, लाइसेंस स्थिति और सत्यापन कैश को
`/home/node/.cloakbrowser` में संग्रहीत करती है। कंटेनर बदलने पर भी GitHub
मुफ़्त स्तर या Pro लॉगिन बनाए रखने के लिए वहाँ एक नामित वॉल्यूम माउंट करें:

```bash
docker volume create cloakbrowser-cache

docker run --rm -it \
  --entrypoint node \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  swimmwatch/cloakbrowser-mcp:latest \
  /opt/cloakbrowser-mcp/node_modules/cloakbrowser/dist/cli.js login

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

सहेजे गए लॉगिन को जाँचने या हटाने के लिए उसी वॉल्यूम के साथ अपस्ट्रीम `info`
या `logout` कमांड का उपयोग करें। विकल्प के रूप में, कंटेनर के सीक्रेट प्रबंधन
से `CLOAKBROWSER_LICENSE_KEY` इंजेक्ट करें। लाइसेंस कुंजी को इमेज लेयर, वर्शन
कंट्रोल में कमिट की गई Compose फ़ाइल या बिल्ड प्रमाण के रूप में कैप्चर किए गए
कमांड आउटपुट में न रखें।

## कस्टम CloakBrowser बाइनरी

संगत ब्राउज़र निष्पादन योग्य फ़ाइल को कंटेनर में माउंट करें और उसका कंटेनर पथ
`--binary-path` (या `CLOAKBROWSER_BINARY_PATH`) से दें:

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/custom-chrome:/browser/chrome:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --binary-path /browser/chrome
```

फ़ाइल इमेज की CPU आर्किटेक्चर के अनुकूल पढ़ने योग्य Linux निष्पादन योग्य होनी चाहिए
और इसकी आवश्यक लाइब्रेरी कंटेनर में उपलब्ध होनी चाहिए। यह पथ कंटेनर की सभी
Streamable HTTP सत्रों पर लागू होता है; अलग ब्राउज़र बाइनरी के लिए अलग कंटेनर चलाएँ।

## Chrome एक्सटेंशन

Chrome एक्सटेंशन के लिए स्थायी प्रोफ़ाइल आवश्यक है और उन्हें अलग से माउंट करना
चाहिए। पर्यावरण चर में होस्ट पथों के बजाय कंटेनर पथों का उपयोग करें।
एक्सटेंशन माउंट read-only हो सकता है:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

जब किसी पथ में कॉमा हों या कई एक्सटेंशन निर्देशिकाएँ पास करनी हों, तो
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` के लिए JSON ऐरे का उपयोग करें।
एक्सटेंशन फ़ाइलें या एक्सटेंशन पथ बदलने के बाद कंटेनर फिर से शुरू करें।

Playwright Extension connection mode ऊपर दिखाए unpacked extension mount से अलग है। इसके लिए persistent Chrome/Edge profile में आधिकारिक extension और `PLAYWRIGHT_MCP_EXTENSION_TOKEN` चाहिए। हर profile को अलग writable path पर mount करें, token को secret manager से inject करें और `PLAYWRIGHT_MCP_EXTENSION=true` को `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` के साथ न मिलाएँ।

## स्ट्रीम करने योग्य HTTP

स्थानीय Streamable HTTP उपयोग के लिए, कंटेनर पोर्ट को लूपबैक पर प्रकाशित करें:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

कंटेनर से सीधे HTTPS के लिए, अपने प्रमाणपत्र फ़ाइलें माउंट करें और HTTPS चुनें:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

होस्ट-साइड `127.0.0.1:3000` बाइंड एंडपॉइंट को लोकल रखता है। यदि आप किसी नॉन-लूपबैक इंटरफ़ेस पर स्ट्रीमएबल HTTP प्रकाशित करते हैं, तो HTTPS के साथ प्रमाणीकरण का उपयोग करें, या सर्वर को प्रमाणीकरण और नेटवर्क नियंत्रणों के साथ एक विश्वसनीय TLS-टर्मिनेटिंग रिवर्स प्रॉक्सी के पीछे रखें।
स्ट्रीमएबल HTTP निश्चित `GET /healthz` और `GET /readyz` एक ही होस्ट और पोर्ट पर प्रोब करते हैं। यदि `--http-auth-token` या `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` कॉन्फ़िगर किया गया है, तो प्रोब्स को MCP अनुरोधों के समान ही `Authorization: Bearer ...` हेडर की आवश्यकता होती है।
सभी HTTP ट्रांसपोर्ट फ़्लैग और पर्यावरण चर के लिए उत्पन्न [CLI संदर्भ](generated/cli.md) देखें।

## मैनेज्ड CDP { #managed-cdp }

कॉन्फ़िगर किए गए प्रबंधित-CDP रेंज को एक-से-एक प्रकाशित करें। यह stdio उदाहरण किसी एक को सक्षम करता है
सत्र और हर होस्ट पोर्ट को लूपबैक से बाँध कर रखता है:

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

Docker पोर्ट फॉरवर्डिंग के लिए `--cdp-host 0.0.0.0` आवश्यक है, इसलिए स्पष्ट
`--cdp-allow-remote` ऑप्ट-इन और ठोस `--cdp-advertised-host` भी आवश्यक हैं।
रेंज को अलग होस्ट पोर्ट नंबरों में रीमैप न करें: खोज URLs में शामिल हैं
लीज किया गया पोर्ट और प्रत्येक प्रकाशित पोर्ट को अपने स्वामित्व वाली सत्र के साथ एक-से-एक मार्गित करना चाहिए।

बहु-सत्र Streamable HTTP के लिए, पूल को कॉन्फ़िगर करें और प्रकाशित करें
यदि क्लाइंट्स को व्यक्तिगत रूप से विकल्प चुनना चाहिए तो डिफ़ॉल्ट प्रक्रिया:

```bash
docker run --rm \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http \
  --http-host 0.0.0.0 \
  --http-port 3000 \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

एक प्रमाणित `initialize` अनुरोध `cdpEnabled: true` पट्टों के साथ एक प्रकाशित को लीज़ करता है
पोर्ट। एक छोड़ा गया मान प्रक्रिया डिफ़ॉल्ट को प्राप्त करता है, जबकि `cdpEnabled: false`
स्पष्ट रूप से विकल्प छोड़ता है और कोई CDP पोर्ट का उपयोग नहीं करता। पूल की समाप्ति केवल नए को अस्वीकार करती है
CDP-सक्रिय सत्र; यह अक्षम सत्रों की क्षमता को कम नहीं करता है।

`cloakbrowser_bridge_info` से क्षमता-धारक URL पढ़ें। इसे न डालें
कंटेनर लॉग या स्वास्थ्य जांच। ऐसे CDP API से कनेक्ट करें जैसे
`chromium.connectOverCDP()`; URL, Playwright के साथ संगत नहीं है
`chromium.connect()` या वर्तमान Open WebUI प्रवाह।

`--cdp-advertised-scheme https` प्रकाशित URLs को `https`/`wss` में बदलता है, लेकिन
ब्रिज प्रबंधित CDP के लिए TLS प्रदान नहीं करता है। एक ऑपरेटर-स्वामित्व वाले TLS टर्मिनेटर का उपयोग करें जो
बाहरी नेटवर्क नेमस्पेस में उसी विज्ञापित पोर्ट पर कब्जा करता है, सुरक्षित रखता है
`Host`/`Origin`, और सीधे एक-से-एक प्लेनटेक्स्ट ब्रिज लिस्नर को फॉरवर्ड करता है।
ब्रिज-टू-Chromium हॉप भी प्लेनटेक्स्ट लूपबैक ट्रैफ़िक रहता है।

## GeoIP प्रॉक्सी मिलान

Docker, npm की तरह ही वही प्रॉक्सी और GeoIP एनवायरनमेंट वेरिएबल्स का उपयोग करता है। जब क्षेत्रीय QA को कॉन्फ़िगर की गई प्रॉक्सी लोकेशन का पालन करने के लिए CloakBrowser टाइमज़ोन, भाषा और लोकेल फिंगरप्रिंट्स की आवश्यकता हो, तो GeoIP प्रॉक्सी मैचिंग को सक्षम करें:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

प्रमाणित प्रॉक्सी के लिए, प्रॉक्सी URL में क्रेडेंशियल एम्बेड करें और उपयोगकर्ता नाम या पासवर्ड में विशेष वर्णों को प्रतिशत-एन्कोड करें।

समर्थित CloakBrowser बाइनरी नेटिव URL-इनलाइन प्रॉक्सी प्रमाणीकरण का उपयोग करती
हैं; पुरानी बाइनरी Playwright प्रॉक्सी ऑब्जेक्ट पर फ़ॉलबैक करती हैं।

जब कंटेनर स्ट्रीमएबल HTTP चलाता है, तो क्लाइंट `initialize` मेटाडेटा के माध्यम से प्रति MCP सत्र विभिन्न प्रॉक्सी भी चुन सकते हैं। देखें
रनटाइम प्रॉक्सी मेटाडेटा, बहु-क्षेत्र उपयोग के मामलों, और सीमाओं के लिए [GeoIP Proxy Matching](geoip-proxy-matching.md) देखें।

## पूर्वनिर्धारित मान

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
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

## अतिरिक्त व्यावहारिक रास्ते

upstream Playwright MCP और इस package में चुनने के लिए [तुलना](comparison.md) देखें। तेज tasks के लिए [रेसिपी](recipes/index.md) उपयोग करें: persistent profile, extensions, reverse proxy, regional QA, Claude Desktop, Codex CLI और CI smoke test.
