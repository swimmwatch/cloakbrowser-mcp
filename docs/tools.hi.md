---
description: CloakBrowser MCP द्वारा उपलब्ध कराई गई tool surface.
icon: material/tools
tags:
  - टूल
  - उपयोगकर्ता गाइड
---

# टूल

`cloakbrowser-mcp` upstream Playwright MCP tools को बिना बदले expose करता है। Tool names, descriptions, schemas, annotations और responses `@playwright/mcp` से आते हैं।

## Upstream tools

Default upstream browser tool surface को pinned Playwright MCP dependency से मेल खाना चाहिए। इसमें navigation, snapshot, click, typing, screenshots, tabs, console messages, network inspection, file upload, dialogs और unsafe evaluation tools जैसे core browser tools शामिल हैं।

Playwright MCP `@playwright/mcp@0.0.83` का स्थिर संदर्भ उस पैकेज के कमिट पर पिन किया गया क्षमता परीक्षण है: [डिफ़ॉल्ट और क्षमता के अनुसार उपलब्ध टूल](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74)। इंस्टॉल की गई निर्भरता वर्तमान टूल सूची तय करती है।

यह project upstream Playwright MCP को authoritative मानता है और copied schema reference maintain नहीं करता।

डिफ़ॉल्ट सेट में `browser_emulate_media` सहित 25 upstream tools हैं। `PLAYWRIGHT_MCP_CAPS=devtools`
bridge-विशिष्ट `--caps` विकल्प के बिना `devtools` क्षमता को child process तक
पहुंचाता है; परिणामस्वरूप upstream tools और schemas बिना बदलाव के आगे भेजे जाते हैं,
जिनमें `browser_start_recording` और `browser_stop_recording` शामिल हैं।

!!! warning "सार्वजनिक CloakBrowser v146 बाइनरी के साथ रिकॉर्डिंग की सीमा"
    रिकॉर्डिंग टूल उपलब्ध हैं, लेकिन बिना कुंजी वाली सार्वजनिक Chromium 146 बाइनरी stealth बनाए रखने के लिए Playwright का page-to-host binding जानबूझकर अक्षम करती है। इसलिए `browser_stop_recording` अधूरा कोड दे सकता है: नेविगेशन रिकॉर्ड होता है, लेकिन सफल इनपुट और क्लिक छूट जाते हैं। दोबारा उपयोग से पहले जेनरेट की गई रिकॉर्डिंग जांचें।

    स्पष्ट रूप से सक्षम की जाने वाली compatibility को [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532) में ट्रैक किया गया है।
    मूल binding संबंधी निर्णय पर
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) और
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176) में चर्चा की गई है।

### डायनामिक WebMCP tools

WebMCP समर्थन चुनी गई ब्राउज़र बिल्ड और सक्षम सुविधाओं पर निर्भर है। इंस्टॉल किया गया Playwright MCP `getTools()` विधि वाला `document.modelContext` या `navigator.modelContext` अपेक्षित करता है। WebMCP चाहिए तो संगत CloakBrowser बिल्ड या `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright` उपयोग करें।

[Chrome का WebMCP दस्तावेज़](https://developer.chrome.com/docs/ai/webmcp) Chrome 149 से origin trial, स्थानीय परीक्षण का फ्लैग और headless सीमाएं बताता है। केवल Chromium संस्करण संख्या से Playwright MCP की अपेक्षित API के साथ संगतता की गारंटी नहीं मिलती।

Chromium को `--enable-features=WebMCP` के साथ शुरू करने पर Playwright MCP, पेज खुला रहने के दौरान उसके दिए हुए `webmcp_*` टूल जोड़ सकता है। ये टूल गतिशील हैं: ब्रिज `tools.listChanged` के समर्थन की घोषणा करता है, upstream से `notifications/tools/list_changed` मिलने पर पृष्ठों में विभाजित पूरी टूल सूची का कैश अमान्य करता है और संबंधित MCP क्लाइंट को सूचना भेजता है। क्लाइंट को इस सूचना के लिए सुनना चाहिए और फिर `tools/list` दोबारा कॉल करना चाहिए। Streamable HTTP क्लाइंट को सूचना केवल तभी मिलती है जब उसके सत्र की सूचना स्ट्रीम खुली हो; स्ट्रीम खुली न होने पर भी अगला `tools/list` नवीनतम सूची देता है।

गतिशील टूल केवल उस MCP सत्र और प्रबंधित CDP की मौजूदा ब्राउज़र पीढ़ी से संबंधित हैं जिसने उन्हें खोजा था। उनके नाम, विवरण, स्कीमा, एनोटेशन और आउटपुट अविश्वसनीय पेज सामग्री हैं, जिन्हें ब्रिज बिना बदलाव के आगे भेजता है। टूल कॉल करने से पहले इन्हें जाँचें। संग्रह बंद करने के लिए `PLAYWRIGHT_MCP_WEBMCP=false` सेट करें। ब्रिज कभी Chromium WebMCP अपने आप सक्षम नहीं करता।

## स्थानीय tools

### `cloakbrowser_binary_info`

CloakBrowser package, current platform, cache directory, expected binary path, install status और bridge द्वारा उपयोग किए गए resolved executable path की structured जानकारी लौटाता है।

### `cloakbrowser_bridge_info`

संरचित ब्रिज मेटाडेटा लौटाता है:

- MCP सर्वर का नाम और संस्करण;
- रनटाइम मोड;
- मूल Playwright MCP पैकेज और संस्करण;
- मूल टूल की संख्या;
- स्थानीय Cloak-विशिष्ट टूल के नाम।

अतिरिक्त `structuredContent.cdp` ऑब्जेक्ट कॉल करने वाले सत्र के प्रबंधित CDP की स्थिति बताता है:

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

ब्राउज़र बदलने पर `generation` बढ़ता है और `discoveryUrl` बदलता है।
`activeConnections` स्वीकार किए गए प्रॉक्सी WebSocket कनेक्शन की संख्या बताता है, लेकिन क्लाइंट की पहचान, लक्ष्य ID या प्रोटोकॉल सामग्री उजागर नहीं करता। हर गैर-null खोज URL को पहुंच के क्रेडेंशियल की तरह सुरक्षित रखें।

खोज URL को CDP समर्थित क्लाइंट के साथ उपयोग करें:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

प्रबंधित CDP, Playwright Server प्रोटोकॉल नहीं है। Playwright का `chromium.connect()` और Open WebUI का वर्तमान `PLAYWRIGHT_WS_URL` एकीकरण Playwright Server एंडपॉइंट की अपेक्षा करते हैं और इस URL के साथ संगत नहीं हैं।

पिन किए गए Playwright क्लाइंट के साथ सत्यापित किया गया है कि `connectOverCDP()` से मिले ब्राउज़र पर `browser.close()` केवल उस क्लाइंट का कनेक्शन बंद करता है; Chromium और मौजूदा ब्राउज़र पीढ़ी तैयार रहते हैं। यह उसी क्लाइंट पर देखा गया व्यवहार है और अन्य CDP लाइब्रेरी के लिए गारंटी नहीं है। CDP `Browser.close` सीधे भेजना विनाशकारी है: यह साझा Chromium की मौजूदा पीढ़ी समाप्त करता है, पहुंच की अनुमति देने वाले क्रेडेंशियल को अमान्य करता है और MCP कॉल करने वालों को प्रभावित करता है। MCP और CDP की क्रियाओं में समन्वय करें, क्योंकि ब्रिज परस्पर विरोधी नेविगेशन, पेज बंद करने, इनपुट या स्टोरेज बदलावों को क्रमबद्ध नहीं करता।

स्थानीय टूल सूची केवल इन दो निदान टूल तक सीमित है। `SessionSeats` और `getSessionSeats` MCP टूल के रूप में उपलब्ध नहीं हैं, क्योंकि CloakBrowser का समर्थित सार्वजनिक प्रवेश बिंदु यह API export नहीं करता।

## Parity

CI Docker इमेज build करता है और `npm run bridge:compare` चलाता है। यह script official Playwright MCP image और CloakBrowser bridge image को parallel शुरू करता है, upstream tool list की तुलना करता है और same fixture page पर default upstream browser tools चलाता है।

Machine-readable JSON parity report लिखने के लिए `--report` उपयोग करें:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI इस report को Docker builds और release builds के लिए artifact के रूप में upload करता है।
