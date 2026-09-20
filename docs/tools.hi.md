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

स्थिर upstream reference के लिए exact package commit पर pinned Playwright MCP `{{ project.playwright_mcp_package_tag }}` capability test देखें: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77)।

यह project upstream Playwright MCP को authoritative मानता है और copied schema reference maintain नहीं करता।

डिफ़ॉल्ट सेट में 24 upstream tools हैं। `PLAYWRIGHT_MCP_CAPS=devtools`
bridge-विशिष्ट `--caps` विकल्प के बिना `devtools` क्षमता को child process तक
पहुंचाता है; परिणामस्वरूप upstream tools और schemas बिना बदलाव के आगे भेजे जाते हैं,
जिनमें `browser_start_recording` और `browser_stop_recording` शामिल हैं।

!!! warning "सार्वजनिक CloakBrowser v146 बाइनरी के साथ रिकॉर्डिंग की सीमा"
    रिकॉर्डिंग टूल उपलब्ध हैं, लेकिन CloakBrowser 0.5.10 द्वारा उपयोग की जाने वाली बिना कुंजी वाली
    सार्वजनिक Chromium 146 बाइनरी stealth बनाए रखने के लिए Playwright के page-to-host binding को
    जानबूझकर अक्षम करती है। परिणामस्वरूप, `browser_stop_recording` अधूरा कोड लौटा सकता है:
    नेविगेशन रिकॉर्ड होता है, लेकिन सफल टेक्स्ट इनपुट और क्लिक छूट जाते हैं। दोबारा उपयोग करने से
    पहले जनरेट की गई रिकॉर्डिंग की समीक्षा करें।

    स्पष्ट रूप से सक्षम की जाने वाली compatibility को [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532) में ट्रैक किया गया है।
    मूल binding संबंधी निर्णय पर
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) और
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176) में चर्चा की गई है।

## स्थानीय tools

### `cloakbrowser_binary_info`

CloakBrowser package, current platform, cache directory, expected binary path, install status और bridge द्वारा उपयोग किए गए resolved executable path की structured जानकारी लौटाता है।

### `cloakbrowser_bridge_info`

Structured bridge metadata लौटाता है:

एडीटिव `structuredContent.cdp` ऑब्जेक्ट कॉलिंग सेशन के प्रबंधित CDP की रिपोर्ट करता है
राज्य:

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

`generation` बढ़ता है और ब्राउज़र बदलने के बाद `discoveryUrl` घूमता है।
`activeConnections` एक्सेप्ट किए गए प्रॉक्सी किए गए WebSocket कनेक्शनों की गिनती करता है बिना एक्सपोज़ किए
क्लाइंट पहचान, लक्षित आईडी, या प्रोटोकॉल सामग्री। हर गैर-शून्य खोज URL से निपटें
एक प्रमाणपत्र के रूप में।

CDP-सक्षम क्लाइंट के साथ URL खोज का उपयोग करें:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

मैनेज्ड CDP Playwright सर्वर प्रोटोकॉल नहीं है। Playwright
`chromium.connect()` और वर्तमान Open WebUI `PLAYWRIGHT_WS_URL` एकीकरण अपेक्षा
एक Playwright सर्वर एंडपॉइंट और इस URL के साथ संगत नहीं हैं।

- MCP server name और version;
- runtime mode;
- upstream Playwright MCP package और version;
- upstream tool count;
- local Cloak-specific tool names.

स्थानीय tool surface इन्हीं दो निदान tools तक सीमित रहता है। `SessionSeats` और
`getSessionSeats` MCP tool के रूप में उपलब्ध नहीं हैं, क्योंकि CloakBrowser 0.5.10
इस API को अपने public entry point से export नहीं करता है।

## Parity

CI Docker इमेज build करता है और `npm run bridge:compare` चलाता है। यह script official Playwright MCP image और CloakBrowser bridge image को parallel शुरू करता है, upstream tool list की तुलना करता है और same fixture page पर default upstream browser tools चलाता है।

Machine-readable JSON parity report लिखने के लिए `--report` उपयोग करें:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI इस report को Docker builds और release builds के लिए artifact के रूप में upload करता है।
