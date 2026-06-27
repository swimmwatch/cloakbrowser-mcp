---
description: Playwright MCP ब्रिज के लिए रनटाइम कॉन्फ़िगरेशन, जिसमें स्ट्रीमएबल HTTP सत्र, GeoIP-अवेयर प्रॉक्सी मिलान, और मानवीकृत इनपुट व्यवहार शामिल हैं।
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# विन्यास

Playwright MCP व्यवहार के लिए अपस्ट्रीम `PLAYWRIGHT_MCP_*` चर का उपयोग करें। `CLOAK_PLAYWRIGHT_MCP_*` का उपयोग केवल क्लोक-विशिष्ट ब्रिज व्यवहार के लिए करें।

पुराने `CLOAKBROWSER_MCP_*` चर समर्थित नहीं हैं।
उत्पन्न [CLI संदर्भ](generated/cli.md) ब्रिज CLI फ़्लैग्स और उनके मिलान वाले पर्यावरण चरों की आधिकारिक सूची है।

## ब्रिज विकल्प

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## GeoIP प्रॉक्सी मिलान

`CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` को `PLAYWRIGHT_MCP_PROXY_SERVER` के साथ सेट करें
प्रॉक्सी स्थान से CloakBrowser टाइमज़ोन, भाषा और लोकेल फिंगरप्रिंट फ़्लैग प्राप्त करने के लिए। ब्रिज प्रॉक्सी राउटिंग को अपस्ट्रीम Playwright को सौंपे रखता है
MCP और केवल रिज़ॉल्व किए गए `--fingerprint-timezone`, `--lang`, और
`--fingerprint-locale` लॉन्च फ़्लैग्स।

सेटअप उदाहरणों, रनटाइम स्ट्रीमएबल HTTP प्रॉक्सी मेटाडेटा, उपयोग के मामलों, प्राथमिकता नियमों, और सीमाओं के लिए [GeoIP Proxy Matching](geoip-proxy-matching.md) देखें।

मानवीकृत इनपुट व्यवहार

पेज इंटरैक्शन के लिए CloakBrowser के मानव-सदृश माउस, कीबोर्ड, और स्क्रॉल लेयर को सक्षम करने के लिए `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` सेट करें। ब्रिज इसे Playwright MCP के पेज इनिशियलाइज़ेशन हुक के माध्यम से लागू करता है, ताकि अपस्ट्रीम ब्राउज़र टूल स्कीमा अपरिवर्तित रहें।

सेटअप उदाहरणों, रनटाइम स्ट्रीमएबल HTTP मेटाडेटा, उपयोग के मामलों और सीमाओं के लिए [Humanized Input Behavior](humanized-input-behavior.md) देखें।

## स्ट्रीम करने योग्य HTTP रनटाइम मेटाडेटा

स्ट्रीमएबल HTTP क्लाइंट `initialize` अनुरोध में ब्रिज-विशिष्ट मेटाडेटा जोड़कर प्रति MCP सत्र के लिए चयनित रनटाइम विकल्प चुन सकते हैं:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`proxyServer` उस HTTP सत्र के लिए `PLAYWRIGHT_MCP_PROXY_SERVER` को ओवरराइड करता है।
`proxyBypass` ओवरराइड करता है `PLAYWRIGHT_MCP_PROXY_BYPASS` केवल तभी `proxyServer` मौजूद है। `geoipProxyMatch` MCP सर्वर को फिर से शुरू किए बिना उस सत्र के लिए GeoIP मिलान को सक्षम या अक्षम कर सकता है। मौजूदा सत्र अपनी स्टार्टअप प्रॉक्सी बनाए रखते हैं; स्थान बदलने के लिए एक नया HTTP सत्र बनाएँ।

`humanize` उस सत्र के लिए मानवीकृत इनपुट व्यवहार को सक्षम या अक्षम कर सकता है।
अन्य सत्रों को बदले बिना। `humanPreset` चुन सकता है `default` या `careful`
उस सत्र के लिए, लेकिन यह अपने आप मानवीकृत व्यवहार को सक्षम नहीं करता। मौजूदा
सत्र `initialize` के दौरान कैप्चर किए गए व्यवहार को बनाए रखते हैं।

`headless` उस सत्र के लिए हेडलेस ब्राउज़र मोड को सक्षम या अक्षम कर सकता है। `headless` को `false` पर सेट करने के लिए एक उपयोग योग्य डिस्प्ले वातावरण की आवश्यकता होती है, विशेष रूप से
Docker या Linux सर्वर डिप्लॉयमेंट्स में।

प्रमाणित HTTP प्रॉक्सी क्रेडेंशियल को `proxyServer` में एम्बेड किया जा सकता है, उदाहरण के लिए `http://user:pass@proxy.example:8080`. प्रतिशत-एनकोड क्रेडेंशियल
अक्षरों को जो URL का अर्थ रखते हैं, जैसे कि `@`, `:`, `/`, `?`, `#`, और `%`.

मल्टी-लोकेशन QA पैटर्न के लिए, देखें [GeoIP Proxy Matching](geoip-proxy-matching.md).
अंतरक्रिया यथार्थवाद पैटर्न के लिए, [मानवीकृत इनपुट व्यवहार](humanized-input-behavior.md) देखें।

## अपस्ट्रीम विकल्प

ब्रिज `PLAYWRIGHT_MCP_*` सेटिंग्स को अपस्ट्रीम Playwright MCP में फॉरवर्ड करता है। इसमें अपस्ट्रीम विकल्प जैसे शामिल हैं:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_USER_DATA_DIR`

पूर्ण अपस्ट्रीम विकल्पों की जानकारी के लिए अपस्ट्रीम Playwright MCP दस्तावेज़ीकरण देखें।

## लॉगिंग

Streamable HTTP मोड मानवीय रूप से पठनीय स्टार्टअप और अनुरोध लॉग्स को stdout पर लिखता है। Stdio मोड नियमित परिचालन लॉग्स उत्सर्जित नहीं करता, इसलिए MCP JSON-RPC stdout प्रोटोकॉल-स्वच्छ रहता है। घातक CLI स्टार्टअप विफलताएँ अभी भी stderr पर लिखी जाती हैं।

## एचटीटीपीएस

Streamable HTTP uses local HTTP by default. Select direct TLS with `--http-protocol https` or `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, then provide either a certificate/key pair or a PFX file:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

बाहरी या नॉन-लूपबैक एक्सपोज़र के लिए HTTPS के साथ `--http-auth-token` का उपयोग करें, या एक विश्वसनीय रिवर्स प्रॉक्सी पर TLS को टर्मिनेट करें जो प्रमाणीकरण और नेटवर्क एक्सेस नियंत्रण भी लागू करती है।

## स्ट्रीम करने योग्य HTTP सत्र

प्रत्येक Streamable HTTP MCP सत्र का अपना स्वयं का ब्रिज रनटाइम और अपस्ट्रीम Playwright MCP चाइल्ड प्रोसेस होता है। HTTP सत्र एक पृथक ब्राउज़र प्रोफ़ाइल के साथ अपस्ट्रीम Playwright MCP को चलाते हैं ताकि एक साथ उपयोगकर्ता एक ही स्थायी Chromium प्रोफ़ाइल के लिए प्रतिस्पर्धा न करें। बिल्ट-इन `memory` सेशन बैकएंड केवल मेटाडेटा जैसे सेशन आईडी, टाइमस्टैम्प, समाप्ति, और स्थिति को संग्रहीत करता है। ब्राउज़र की स्थिति लाइव अपस्ट्रीम चाइल्ड प्रोसेस में बनी रहती है, और आर्टिफैक्ट्स अभी भी `PLAYWRIGHT_MCP_OUTPUT_DIR` द्वारा नियंत्रित किए जाते हैं।

क्षैतिज स्केलिंग के लिए, `mcp-session-id` हेडर द्वारा कुंजीबद्ध स्टिकी सेशंस के साथ लोड बैलेंसर के पीछे कई सर्वर प्रतिकृतियों को चलाएँ। भविष्य के Redis, Postgres, या SQLite बैकएंड मेटाडेटा और लॉक का समन्वय कर सकते हैं, लेकिन वे उस प्रक्रिया के बाहर निकलने के बाद लाइव ब्राउज़र सत्र को पुनर्स्थापित नहीं कर सकते हैं जो उस सत्र की मालिक है।

## स्ट्रीम करने योग्य HTTP प्रोब्स

जब ब्रिज `--transport streamable-http` के साथ चलता है, तो यह MCP एंडपॉइंट के समान होस्ट और पोर्ट पर स्थिर प्रोब एंडपॉइंट्स उजागर करता है:

- `GET /healthz` प्रक्रिया स्वास्थ्य मेटाडेटा लौटाता है: `status`, `version`, `transport`, और `uptimeMs`.
- `GET /readyz` तत्परता मेटाडेटा और सत्र क्षमता लौटाता है: `sessions.active`, `sessions.pending`, `sessions.max`, और `sessions.available`.

रेडीनेस HTTP `200` लौटाता है जब तक सत्र क्षमता उपलब्ध है और HTTP `503` जब `active + pending >= max`.
यदि `--http-auth-token` या `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` कॉन्फ़िगर किया गया है, तो दोनों प्रोब्स को MCP अनुरोधों की तरह ही एक ही `Authorization: Bearer ...` हेडर की आवश्यकता होती है। एक auth टोकन के बिना, प्रोब्स कॉन्फ़िगर किए गए HTTP बाइंड एड्रेस पर खुले रहते हैं।
