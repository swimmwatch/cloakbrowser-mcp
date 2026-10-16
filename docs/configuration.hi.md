---
description: Playwright MCP ब्रिज के लिए runtime configuration, जिसमें Streamable HTTP sessions, persistent profiles, validated context options, extension paths, GeoIP प्रॉक्सी मिलान, और humanized input शामिल हैं।
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

| चर | डिफ़ॉल्ट | विवरण |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | ब्रिज की संचार विधि: `stdio` या `streamable-http`। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP लिसनर का प्रोटोकॉल: `http` या `https`। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | होस्ट पता जिससे Streamable HTTP लिसनर जुड़ता है। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | पोर्ट जिस पर Streamable HTTP लिसनर सुनता है। परीक्षणों में अस्थायी पोर्ट के लिए `0` उपयोग करें। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP एंडपॉइंट का पथ। `/healthz` और `/readyz` जांच के लिए आरक्षित हैं। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | वैकल्पिक Bearer टोकन। इसे सेट करने पर Streamable HTTP अनुरोधों में यह टोकन देना आवश्यक है। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | सत्र मेटाडेटा का बैकएंड। इस रिलीज़ में केवल `memory` लागू किया गया है। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | निष्क्रिय Streamable HTTP सत्रों की वैधता अवधि। सत्र समाप्त होने पर उसके ब्रिज के संसाधन मुक्त होते हैं और upstream चाइल्ड प्रोसेस बंद होता है। |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | एक प्रोसेस में सक्रिय Streamable HTTP सत्रों की अधिकतम संख्या। |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | Streamable HTTP में HTTPS के लिए PEM प्रारूप वाली TLS प्रमाणपत्र फ़ाइल का पथ। |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | Streamable HTTP में HTTPS के लिए PEM प्रारूप वाली TLS निजी कुंजी का पथ। |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | Streamable HTTP में HTTPS के लिए PFX/PKCS12 प्रारूप वाली TLS फ़ाइल का पथ। |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | एन्क्रिप्ट की गई HTTPS कुंजी या PFX फ़ाइल की पासफ़्रेज़। |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP संचालन लॉग का स्तर: `trace`, `debug`, `info`, `warn`, `error`, `fatal` या `silent`। |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | मूल Playwright MCP का प्रॉक्सी सर्वर। मिलान सक्षम होने पर इसका उपयोग GeoIP जानकारी प्राप्त करने के लिए होता है। |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | मूल प्रॉक्सी की उन होस्ट की सूची जिन्हें `PLAYWRIGHT_MCP_PROXY_SERVER` उपयोग नहीं करना चाहिए। |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | `PLAYWRIGHT_MCP_PROXY_SERVER` की GeoIP जानकारी प्राप्त करता है और CloakBrowser के टाइमज़ोन तथा लोकेल फ़िंगरप्रिंट आर्ग्यूमेंट को उस प्रॉक्सी के स्थान से मिलाता है। |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | CloakBrowser के मानव-सदृश माउस, कीबोर्ड और स्क्रॉल व्यवहार को सक्षम करता है। |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser के मानव-सदृश व्यवहार का प्रीसेट: `default` या `careful`। केवल humanize सक्षम होने पर उपयोग किया जाता है। |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | CloakBrowser बाइनरी रिलीज़ चैनल: `stable` या केवल Pro के लिए `preview`। |
| `CLOAKBROWSER_BINARY_PATH` | unset | कस्टम CloakBrowser निष्पादन योग्य फ़ाइल का पथ। CLI विकल्प `--binary-path` को प्राथमिकता मिलती है। |
| `CLOAKBROWSER_VERSION` | unset | कस्टम निष्पादन योग्य फ़ाइल न चुने जाने पर CloakBrowser के कैश रिज़ॉल्वर को दिया गया पिन किया हुआ संस्करण। मुफ़्त योजना की वैध लाइसेंस कुंजी पिन को अनदेखा करती है; CloakBrowser कैश की गई बाइनरी फिर उपयोग कर सकता है। |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` CloakBrowser बाइनरी उपयोग करता है। `playwright` निष्पादन योग्य फ़ाइल का Cloak-विशिष्ट प्रतिस्थापन छोड़ देता है। |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Chromium को headless मोड में चलाता है। |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | npm के लिए आर्टिफैक्ट डायरेक्टरी। Docker इसे `/data` पर सेट करता है। |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | कोड जनरेशन की लक्ष्य भाषा: `typescript`, `python`, `java`, `csharp` या `none`। ब्रिज मान की जाँच करता है और अपनी जनरेट की गई Playwright MCP कॉन्फ़िगरेशन में `codegen` लिखता है। |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` या `false`; स्नैपशॉट में प्रत्येक तत्व का बाउंडिंग बॉक्स `[box=x,y,width,height]` के रूप में शामिल करता है। ब्रिज मान की जाँच करता है और अपनी जनरेट की गई Playwright MCP कॉन्फ़िगरेशन में `snapshot.boxes` लिखता है। |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | कार्रवाई के बाद ट्रिगर किए गए कार्य के स्थिर होने की अपस्ट्रीम प्रतीक्षा अवधि (मिलीसेकंड)। सीधे Playwright MCP को अग्रेषित की जाती है। |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | क्रियाओं की डिफ़ॉल्ट समय-सीमा, मिलीसेकंड में। |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | नेविगेशन की डिफ़ॉल्ट समय-सीमा, मिलीसेकंड में। |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | `WIDTHxHEIGHT` प्रारूप में ब्राउज़र व्यूपोर्ट का आकार। |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | स्थायी Chromium प्रोफ़ाइल निर्देशिका। ब्रिज इसे पूर्ण पथ में बदलता है, अनुपस्थित होने पर बनाता है, लिखने योग्य होने की पुष्टि करता है, और जेनरेट किए गए `browser.userDataDir` में लिखता है। |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | सत्यापित संदर्भ विकल्पों वाला JSON ऑब्जेक्ट। समर्थित फ़ील्ड नीचे सूचीबद्ध हैं। |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | मौजूदा Chrome एक्सटेंशन निर्देशिकाओं की JSON ऐरे या कॉमा-सेपरेटेड सूची। `PLAYWRIGHT_MCP_USER_DATA_DIR` आवश्यक है। Windows पथों या कॉमा वाले पथों के लिए JSON ऐरे का उपयोग करें। |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | कंसोल संदेशों की संगतता का पैच सक्षम करता है। |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | CloakBrowser के डिफ़ॉल्ट stealth लॉन्च आर्ग्यूमेंट जोड़ता है। |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | अतिरिक्त Chromium आर्ग्यूमेंट, कॉमा से अलग की गई सूची या JSON ऐरे के रूप में। |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | `--no-sandbox` जोड़ता है और Chromium सैंडबॉक्स अक्षम करता है। |

## मैनेज्ड CDP { #managed-cdp }

प्रबंधित क्रोम डेवलपर टूल्स प्रोटोकॉल (CDP) तक पहुँच एक स्पष्ट ऑप्ट-इन है। यह प्रकट करता है
उसी Chromium ब्राउज़र जेनरेशन को MCP के माध्यम से क्षमता-धारी द्वारा नियंत्रित किया गया
discovery URL। केवल एक पोर्ट पूल कॉन्फ़िगर करना CDP को सक्षम नहीं करता।

| CLI विकल्प | पर्यावरण चर | डिफ़ॉल्ट | उद्देश्य |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | stdio मान और Streamable HTTP सत्र डिफ़ॉल्ट सेट करें। |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | असंपादित | प्रक्रिया-स्थानीय बाहरी प्रॉक्सी पोर्ट पूल को कॉन्फ़िगर करें। एक सक्षम सत्र एक पोर्ट लीज़ पर लेता है। |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | संचालित CDP प्रॉक्सी को बाइंड करें। |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | नॉन-लूपबैक बाइंड की अनुमति दें या अस्वीकार करें। |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | असंपादित | डिस्कवरी URL में एक ठोस बाहरी रूप से पहुंच योग्य होस्ट डालें। वाइल्डकार्ड बाइंड्स के लिए आवश्यक। |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | `http`/`ws` या `https`/`wss` URL प्रकाशित करें। यह TLS को सक्षम नहीं करता। |

प्रत्येक CLI मान केवल उसके मेल खाने वाले पर्यावरण चर को ओवरराइड करता है। विशेष रूप से,
`--no-cdp-enabled`, `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true` को अतिक्रमित करता है, और
`--no-cdp-allow-remote`, `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true` को ओवरराइड करता है।
एक सक्षम सत्र बिना पोर्ट पूल के उसके अपस्ट्रीम चाइल्ड शुरू होने से पहले अस्वीकृत कर दिया जाता है।
एक प्रभावी झूठा मान कोई श्रोता, पोर्ट पट्टा, या क्षमता नहीं बनाता।

स्ट्डियो के लिए, प्रक्रिया मान सीधे लागू होता है:

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

Streamable HTTP के लिए, प्रमाणीकरण में फ्लैट `cdpEnabled` बूलियन
`initialize` मेटाडेटा उस सत्र के लिए प्रक्रिया डिफ़ॉल्ट को ओवरराइड करता है। छोड़ना
फील्ड प्रक्रिया मान को वारिस करता है। ये उदाहरण स्पष्ट रूप से एक सत्र को चुनते हैं और
एक और बाहर:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": true
      }
    }
  }
}
```

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": false
      }
    }
  }
}
```

एक CDP-सक्षम HTTP सत्र एक बाहरी पोर्ट पट्टे का स्वामी होता है। अक्षम सत्र नहीं होते।
पूल का उपभोग करें। आवंटन процесс-स्थानीय है, सबसे कम अप्रवर्तित उम्मीदवार का चयन करता है,
और यदि चयनित बाहरी पोर्ट पहले से ही व्यस्त है तो उस सत्र को तुरंत असफल कर देता है।
पोर्ट मुक्त करने के लिए सत्र बंद करें या जब पूल समाप्त हो जाए तो बड़ी सीमा कॉन्फ़िगर करें।

`cloakbrowser_bridge_info` से वर्तमान URL प्राप्त करें, फिर इसे पास करें
`structuredContent.cdp.discoveryUrl` को Playwright के जैसे CDP क्लाइंट को
`chromium.connectOverCDP()`। उस URL को एक क्रेडेंशियल के रूप में मानें: इसमें एक रैंडम शामिल है
प्रति-पीढ़ी क्षमता और ब्राउज़र बदलने के बाद पुराना हो जाता है। प्रबंधित CDP है
Playwright सर्वर एंडपॉइंट नहीं। `chromium.connect()` और वर्तमान Open WebUI
`PLAYWRIGHT_WS_URL` फ्लो का समर्थन नहीं किया जाता है।

`--cdp-advertised-scheme https` ने `https` की खोज और `wss` WebSocket यूआरएल प्रकाशित किए
केवल। पुल प्रबंधित CDP के लिए TLS प्रदान नहीं करता: इसका बाहरी श्रोता और
Chromium होप रहना प्लेनटेक्स्ट HTTP/WebSocket। एक ऑपरेटर-स्वामित्व वाला TLS टर्मिनेटर होना चाहिए
समान विज्ञापित लीज़्ड पोर्ट पर सुनें, विज्ञापित `Host` और `Origin` को संरक्षित करें
प्राधिकरण, और उस सत्र के प्लेनटेक्स्ट श्रेता को सीधे वन-टू-वन अग्रेषित करें।

CDP सक्षम करना Chromium के दौरान MCP आरंभिकरण ताकि स्वामित्व और बाहरी
तैयारी की पुष्टि की जा सकती है। MCP क्लाइंट इनिशियलाइज़ टाइमआउट को कम से कम 60 पर कॉन्फ़िगर करें
सेकंड। जब प्रबंधित CDP सक्षम होता है, उपयोगकर्ता-प्रदान किया गया
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` में `--remote-debugging-port` नहीं होना चाहिए,
`--remote-debugging-address`, या `--remote-debugging-pipe` (`=` रूपों सहित)।
Playwright का अपना आंतरिक `--remote-debugging-pipe` सक्रिय रहता है साथ ही
ब्रिज-प्रबंधित लूपबैक TCP एंडपॉइंट।

देखें [साधन](tools.md#cloakbrowser_bridge_info), [डॉकर](docker.md#managed-cdp),
[सुरक्षा](security.md#managed-cdp-security), और
[वास्तुकला](architecture.md#managed-cdp-ownership) खोज स्थिति, परिनियोजन के लिए,
सीमाएँ, और पुनरारंभ व्यवहार।

## CloakBrowser लाइसेंस और GitHub साइन-इन

लाइसेंस सेटअप अपस्ट्रीम CloakBrowser CLI का उपयोग करता है; `cloakbrowser-mcp`
लॉगिन या लॉगआउट कमांड नहीं जोड़ता:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

`login` सशुल्क कुंजी स्वीकार करता है या मुफ़्त स्तर की कुंजी के लिए GitHub
साइन-इन शुरू करता है। सत्यापित कुंजी `~/.cloakbrowser/license.key` में संग्रहीत
होती है; `logout` उस फ़ाइल को हटा देता है। `info` सक्रिय लाइसेंस स्तर और Pro
लाइसेंस के लिए सक्रिय सत्रों की संख्या बताता है।

इसके बजाय आप MCP सर्वर परिवेश में `CLOAKBROWSER_LICENSE_KEY` सेट कर सकते हैं।
ब्रिज उस मान को लॉग किए बिना अपस्ट्रीम/ब्राउज़र चाइल्ड प्रक्रिया में भेजता है।
जब `CLOAKBROWSER_CACHE_DIR`, `license.key` वाले कस्टम कैश को इंगित करता है, तो
CloakBrowser कुंजी को रिज़ॉल्व करता है और ब्रिज जेनरेट किए गए ब्राउज़र परिवेश
से केवल उसी रिज़ॉल्व की गई कुंजी को भेजता है। अन्य जेनरेट की गई परिवेश
प्रविष्टियाँ कॉपी नहीं की जातीं।

यदि CloakBrowser दी गई लाइसेंस कुंजी को अस्वीकार करता है या लाइसेंस सर्वर और कैश किए गए सत्यापन में से किसी से भी उसे सत्यापित नहीं कर पाता, तो स्टार्टअप स्पष्ट CloakBrowser त्रुटि के साथ विफल होता है। ब्रिज इस त्रुटि को बनाए रखता है; इसे छिपाता नहीं है और चुपचाप दूसरे ब्राउज़र या लाइसेंस स्तर पर नहीं जाता।

लाइसेंस सर्वर अनुपलब्ध होने पर CloakBrowser कैश किए गए सत्यापन का दोबारा उपयोग कर सकता है। इससे ऑफलाइन स्टार्टअप की गारंटी नहीं मिलती: बाइनरी डाउनलोड या ब्राउज़र शुरू करना अब भी विफल हो सकता है।

## CloakBrowser रिलीज़ चैनल

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` CloakBrowser बाइनरी का रिलीज़ चैनल चुनता है। डिफ़ॉल्ट `stable` है। `preview` Pro ब्राउज़र की Preview बिल्ड मांगता है और केवल Pro लाइसेंस के साथ उपलब्ध है। बिना कुंजी या सशुल्क कुंजी वाले डाउनलोड में स्पष्ट `CLOAKBROWSER_VERSION` पिन को प्राथमिकता मिलती है। मुफ़्त योजना की वैध लाइसेंस कुंजी पिन को अनदेखा करती है और कैश की गई बाइनरी फिर उपयोग कर सकती है। प्लेटफ़ॉर्म पर Preview उपलब्ध न होने पर CloakBrowser Stable पर लौटता है।

रिलीज़ चैनल ब्रिज प्रक्रिया शुरू होने पर चुना जाता है। यह सभी Streamable HTTP सत्रों पर लागू होता है और initialize मेटाडेटा में इसे सेट या ओवरराइड नहीं किया जा सकता। इसे बदलने के लिए ब्रिज को पुनः आरंभ करें।

## कस्टम CloakBrowser बाइनरी

`--binary-path <path>` वर्तमान ब्रिज प्रक्रिया के लिए कस्टम CloakBrowser निष्पादन
योग्य फ़ाइल चुनता है। `CLOAKBROWSER_BINARY_PATH` पर्यावरण-आधारित परिनियोजन के लिए
वही सेटिंग देता है; CLI विकल्प को प्राथमिकता मिलती है। ब्रिज पथ को हल करता है,
पढ़ने योग्य नियमित फ़ाइल की अपेक्षा करता है और उसे बनाई गई Playwright MCP
कॉन्फ़िगरेशन के `browser.launchOptions.executablePath` में लिखता है।

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

ब्रिज कस्टम निष्पादन योग्य फ़ाइल को डाउनलोड या अपडेट नहीं करता। कोई कस्टम पथ न चुने
जाने पर `CLOAKBROWSER_VERSION` CloakBrowser द्वारा प्रबंधित बाइनरी संस्करण को पिन कर
सकता है।

Streamable HTTP में चुनी गई बाइनरी ब्रिज प्रक्रिया की होती है और उसकी सभी MCP
सत्रों में उपयोग होती है। `initialize` मेटाडेटा निष्पादन योग्य पथ को चुन या बदल
नहीं सकता; अलग बाइनरी के लिए अलग ब्रिज प्रक्रियाएँ चलाएँ।

यदि चुनी गई बिल्ड `getTools()` विधि वाला `document.modelContext` या `navigator.modelContext` देती है, तो upstream Playwright MCP पेज स्नैपशॉट के बाद `webmcp_<page-tool>` टूल जोड़ सकता है। वह `tools/list_changed` भेजता है; ब्रिज सूचना और नई टूल सूची आगे भेजता है। हर डायनेमिक टूल का नाम और स्कीमा पेज तय करता है।

## GeoIP प्रॉक्सी मिलान

प्रॉक्सी निकास स्थान से CloakBrowser टाइमज़ोन, भाषा और लोकेल फिंगरप्रिंट फ़्लैग
प्राप्त करने के लिए `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` को
`PLAYWRIGHT_MCP_PROXY_SERVER` के साथ सेट करें। समर्थित बाइनरी के लिए CloakBrowser
नेटिव URL-इनलाइन प्रमाणीकरण चुनता है और पुरानी बाइनरी के लिए Playwright प्रॉक्सी
ऑब्जेक्ट को फ़ॉलबैक के रूप में बनाए रखता है।

सेटअप उदाहरणों, रनटाइम स्ट्रीमएबल HTTP प्रॉक्सी मेटाडेटा, उपयोग के मामलों, प्राथमिकता नियमों, और सीमाओं के लिए [GeoIP प्रॉक्सी मिलान](geoip-proxy-matching.md) देखें।

संक्षिप्त प्रक्रिया के लिए [प्रॉक्सी से क्षेत्रीय QA](recipes/regional-qa-through-proxy.md) देखें।

## मानवीकृत इनपुट व्यवहार

पेज इंटरैक्शन के लिए CloakBrowser के मानव-सदृश माउस, कीबोर्ड, और स्क्रॉल लेयर को सक्षम करने के लिए `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` सेट करें। ब्रिज इसे Playwright MCP के पेज इनिशियलाइज़ेशन हुक के माध्यम से लागू करता है, ताकि अपस्ट्रीम ब्राउज़र टूल स्कीमा अपरिवर्तित रहें।

सेटअप उदाहरणों, रनटाइम स्ट्रीमएबल HTTP मेटाडेटा, उपयोग के मामलों और सीमाओं के लिए [मानवीकृत इनपुट व्यवहार](humanized-input-behavior.md) देखें।

## Chrome एक्सटेंशन { #chrome-extensions }

Chrome एक्सटेंशन ब्राउज़र शुरू होने पर लोड होते हैं, इसलिए ब्रिज शुरू करने से
पहले या Streamable HTTP सत्र बनाने से पहले उन्हें कॉन्फ़िगर करें। एक्सटेंशन
अनपैक की गई निर्देशिकाएँ होने चाहिए और इनके लिए स्थायी प्रोफ़ाइल आवश्यक है:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Streamable HTTP के लिए, `initialize` मेटाडेटा में प्रोफ़ाइल और एक्सटेंशन
निर्देशिकाएँ पास करें:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "userDataDir": "/absolute/path/to/profile",
        "extensionPaths": ["/absolute/path/to/my-extension"]
      }
    }
  }
}
```

एक्सटेंशन फ़ाइलें या एक्सटेंशन पथ बदलने के बाद ब्रिज फिर से शुरू करें या नया
HTTP सत्र बनाएँ। जब पथों में कॉमा हों, कई एक्सटेंशन पास करने हों, या Windows
ड्राइव-लेटर पथों का उपयोग करना हो, तो
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` के लिए JSON ऐरे का उपयोग करें।

कॉपी करने योग्य संक्षिप्त सेटअप के लिए [Chrome एक्सटेंशन लोड करना](recipes/load-chrome-extension.md) देखें।

## Playwright Extension कनेक्शन मोड { #playwright-extension-connection-mode }

Playwright Extension कनेक्शन मोड, `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` से अनपैक किया गया एक्सटेंशन लोड करने से अलग है। यह Chrome या Edge प्रोफ़ाइल में पहले से इंस्टॉल आधिकारिक Playwright Extension के माध्यम से जुड़ता है; ब्रिज उस एक्सटेंशन को इंस्टॉल नहीं करता।

stdio के लिए प्रोसेस का पर्यावरण कॉन्फ़िगर करें:

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

Streamable HTTP में `initialize` मेटाडेटा के `extensionMode` और `profileDirName` संबंधित प्रोसेस-स्तरीय मानों को ओवरराइड करते हैं। `userDataDir` भी हर सत्र के लिए अलग है। टोकन अब भी केवल प्रोसेस के पर्यावरण से स्वीकार किया जाता है:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "extensionMode": true,
        "profileDirName": "Profile 1",
        "userDataDir": "/absolute/path/to/profile"
      }
    }
  }
}
```

एक्सटेंशन मोड के लिए गैर-खाली टोकन और स्थायी प्रोफ़ाइल आवश्यक हैं। एक साथ चलने वाले HTTP एक्सटेंशन सत्रों को अलग-अलग `userDataDir` उपयोग करना चाहिए। upstream चाइल्ड प्रोसेस शुरू करने से पहले ब्रिज प्रबंधित या बाहरी CDP एंडपॉइंट, दूरस्थ ब्राउज़र एंडपॉइंट, headless या अलग-थलग लॉन्च कॉन्फ़िगरेशन, प्रॉक्सी और GeoIP विकल्प, मानव-सदृश व्यवहार, कॉन्टेक्स्ट में बदलाव, अनपैक किए गए एक्सटेंशन के `extensionPaths` और स्पष्ट रूप से दिए गए CloakBrowser लॉन्च विकल्प अस्वीकार करता है। सफल कनेक्शन का शुरू से अंत तक सत्यापन मैनुअल है, क्योंकि चुनी गई ब्राउज़र प्रोफ़ाइल में आधिकारिक Playwright Extension पहले से इंस्टॉल होना चाहिए।

## स्ट्रीम करने योग्य HTTP रनटाइम मेटाडेटा { #streamable-http-runtime-metadata }

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
        "extensionMode": false,
        "profileDirName": "Profile 1",
        "humanize": true,
        "humanPreset": "careful",
        "userDataDir": "/absolute/path/to/profile",
        "contextOptions": {
          "viewport": { "width": 1280, "height": 720 },
          "locale": "en-US",
          "timezoneId": "America/New_York"
        },
        "extensionPaths": ["/absolute/path/to/extension"]
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

`headless` उस सत्र के लिए headless ब्राउज़र मोड सक्षम या अक्षम कर सकता है। Docker इमेज में `headless` को `false` पर सेट करने से जरूरत पर कंटेनर का निजी वर्चुअल डिस्प्ले शुरू होता है। इस इमेज के बाहर इंटरफ़ेस वाले सत्र को अब भी उपयोग योग्य डिस्प्ले परिवेश चाहिए।

`extensionMode` और `profileDirName` उस सत्र के `PLAYWRIGHT_MCP_EXTENSION` और `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` मानों को ओवरराइड करते हैं। मेटाडेटा में `PLAYWRIGHT_MCP_EXTENSION_TOKEN` कभी स्वीकार नहीं किया जाता।

`userDataDir` उस सत्र के लिए स्थायी Chromium प्रोफ़ाइल सक्षम करता है और
`PLAYWRIGHT_MCP_USER_DATA_DIR` को ओवरराइड करता है। ब्रिज निर्देशिका को
प्लेटफ़ॉर्म-नेटिव पूर्ण पथ में बदलता है, अनुपस्थित होने पर बनाता है, लिखने
योग्य होने की पुष्टि करता है, और जेनरेट किए गए `browser.userDataDir` में
लिखता है। स्थायी प्रोफ़ाइल उस सत्र की डिफ़ॉल्ट Streamable HTTP पृथक प्रोफ़ाइल
को अक्षम करती है। ब्रिज एक ही प्रक्रिया में डुप्लिकेट सक्रिय प्रोफ़ाइल
निर्देशिकाओं को अस्वीकार करता है; क्रॉस-प्रोसेस प्रोफ़ाइल टकराव
Chromium/Playwright त्रुटियाँ ही रहते हैं।

`contextOptions` सत्यापित किए जाते हैं और
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` पर शैलो-मर्ज किए जाते हैं; नेस्टेड
ऑब्जेक्ट पूरे मानों को बदलते हैं। समर्थित फ़ील्ड हैं `userAgent`, `viewport`,
`locale`, `timezoneId`, `colorScheme`, `permissions`, `geolocation`,
`extraHTTPHeaders`, `httpCredentials`, `ignoreHTTPSErrors`, `offline`,
`deviceScaleFactor`, `isMobile`, और `hasTouch`। इस रिलीज़ में मनमाना
`BrowserContextOptions` पासथ्रू समर्थित नहीं है।

`extensionPaths` मौजूदा निर्देशिकाओं की ओर इशारा करने चाहिए और इनके लिए
स्थायी `userDataDir` आवश्यक है। ब्रिज एक्सटेंशन पथों को प्लेटफ़ॉर्म-नेटिव
पूर्ण पथों में बदलता है, उन्हें CloakBrowser को पास करता है, और जेनरेट किए गए
Chromium आर्ग्युमेंट `--load-extension` और `--disable-extensions-except` को
जेनरेट की गई Playwright MCP कॉन्फ़िग में लिखता है।

प्रमाणित HTTP प्रॉक्सी क्रेडेंशियल को `proxyServer` में एम्बेड किया जा सकता है, उदाहरण के लिए `http://user:pass@proxy.example:8080`. प्रतिशत-एनकोड क्रेडेंशियल
अक्षरों को जो URL का अर्थ रखते हैं, जैसे कि `@`, `:`, `/`, `?`, `#`, और `%`.

समर्थित CloakBrowser बाइनरी में प्रमाणित HTTP प्रॉक्सी नेटिव URL-इनलाइन
प्रमाणीकरण का उपयोग करती हैं और ब्रिज डुप्लिकेट Playwright प्रॉक्सी ऑब्जेक्ट
हटा देता है। पुरानी बाइनरी संगतता फ़ॉलबैक के रूप में Playwright प्रॉक्सी
ऑब्जेक्ट बनाए रखती हैं।

मल्टी-लोकेशन QA पैटर्न के लिए, देखें [GeoIP प्रॉक्सी मिलान](geoip-proxy-matching.md).
अंतरक्रिया यथार्थवाद पैटर्न के लिए, [मानवीकृत इनपुट व्यवहार](humanized-input-behavior.md) देखें।

लॉगिन स्थिति दोबारा उपयोग करने और एक्सटेंशन सेटअप के लिए [स्थायी लॉगिन प्रोफ़ाइल](recipes/persistent-login-profile.md) तथा [Chrome एक्सटेंशन लोड करना](recipes/load-chrome-extension.md) देखें।

## अपस्ट्रीम विकल्प

ब्रिज `PLAYWRIGHT_MCP_*` सेटिंग्स को अपस्ट्रीम Playwright MCP में फॉरवर्ड करता है। इसमें अपस्ट्रीम विकल्प जैसे शामिल हैं:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_FILE_PATHS`
- `PLAYWRIGHT_MCP_IDLE_TIMEOUT`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_PROFILE_DIR_NAME`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_WEBMCP`

पूर्ण अपस्ट्रीम विकल्पों की जानकारी के लिए अपस्ट्रीम Playwright MCP दस्तावेज़ीकरण देखें।

`PLAYWRIGHT_MCP_CAPS=devtools` upstream चाइल्ड प्रोसेस को विरासत में मिलता है और
ब्रिज-विशिष्ट `--caps` फ़्लैग के बिना इस क्षमता द्वारा नियंत्रित tools को सक्षम करता है।

## लॉगिंग

Streamable HTTP मोड मानवीय रूप से पठनीय स्टार्टअप और अनुरोध लॉग्स को stdout पर लिखता है। Stdio मोड नियमित परिचालन लॉग्स उत्सर्जित नहीं करता, इसलिए MCP JSON-RPC stdout प्रोटोकॉल-स्वच्छ रहता है। घातक CLI स्टार्टअप विफलताएँ अभी भी stderr पर लिखी जाती हैं।

## एचटीटीपीएस { #https }

Streamable HTTP uses local HTTP by default. Select direct TLS with `--http-protocol https` or `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, then provide either a certificate/key pair or a PFX file:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

बाहरी या नॉन-लूपबैक एक्सपोज़र के लिए HTTPS के साथ `--http-auth-token` का उपयोग करें, या एक विश्वसनीय रिवर्स प्रॉक्सी पर TLS को टर्मिनेट करें जो प्रमाणीकरण और नेटवर्क एक्सेस नियंत्रण भी लागू करती है।

## स्ट्रीम करने योग्य HTTP सत्र

हर Streamable HTTP MCP सत्र का अपना ब्रिज रनटाइम और upstream Playwright MCP चाइल्ड प्रोसेस होता है। स्थायी प्रोफ़ाइल कॉन्फ़िगर न होने पर HTTP सत्र डिफ़ॉल्ट रूप से अलग ब्राउज़र प्रोफ़ाइल उपयोग करते हैं। स्पष्ट स्थायी प्रोफ़ाइल लॉक होती है; समानांतर सत्रों के लिए अलग प्रोफ़ाइल डायरेक्टरी चाहिए। बिल्ट-इन `memory` बैकएंड केवल सत्र आईडी, टाइमस्टैम्प, समाप्ति और स्थिति जैसे मेटाडेटा रखता है। ब्राउज़र की स्थिति सक्रिय upstream चाइल्ड प्रोसेस में रहती है और आर्टिफैक्ट `PLAYWRIGHT_MCP_OUTPUT_DIR` से नियंत्रित होते हैं।

क्षैतिज स्केलिंग के लिए, `mcp-session-id` हेडर द्वारा कुंजीबद्ध स्टिकी सेशंस के साथ लोड बैलेंसर के पीछे कई सर्वर प्रतिकृतियों को चलाएँ। भविष्य के Redis, Postgres, या SQLite बैकएंड मेटाडेटा और लॉक का समन्वय कर सकते हैं, लेकिन वे उस प्रक्रिया के बाहर निकलने के बाद लाइव ब्राउज़र सत्र को पुनर्स्थापित नहीं कर सकते हैं जो उस सत्र की मालिक है।

## स्ट्रीम करने योग्य HTTP प्रोब्स

जब ब्रिज `--transport streamable-http` के साथ चलता है, तो यह MCP एंडपॉइंट के समान होस्ट और पोर्ट पर स्थिर प्रोब एंडपॉइंट्स उजागर करता है:

- `GET /healthz` प्रक्रिया स्वास्थ्य मेटाडेटा लौटाता है: `status`, `version`, `transport`, और `uptimeMs`.
- `GET /readyz` तत्परता मेटाडेटा और सत्र क्षमता लौटाता है: `sessions.active`, `sessions.pending`, `sessions.max`, और `sessions.available`.

रेडीनेस HTTP `200` लौटाता है जब तक सत्र क्षमता उपलब्ध है और HTTP `503` जब `active + pending >= max`.
यदि `--http-auth-token` या `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` कॉन्फ़िगर किया गया है, तो दोनों प्रोब्स को MCP अनुरोधों की तरह ही एक ही `Authorization: Bearer ...` हेडर की आवश्यकता होती है। एक auth टोकन के बिना, प्रोब्स कॉन्फ़िगर किए गए HTTP बाइंड एड्रेस पर खुले रहते हैं।

## अतिरिक्त व्यावहारिक रास्ते

upstream Playwright MCP और इस package में चुनने के लिए [तुलना](comparison.md) देखें। तेज tasks के लिए [रेसिपी](recipes/index.md) उपयोग करें: persistent profile, extensions, reverse proxy, regional QA, Claude Desktop, Codex CLI और CI smoke test.
