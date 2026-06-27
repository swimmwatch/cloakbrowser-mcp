---
description: CloakBrowser MCP की परीक्षण रणनीति, जिसमें यूनिट टेस्ट, नकली upstream इंटीग्रेशन टेस्ट, Docker smoke टेस्ट और Playwright MCP parity जांच शामिल हैं।
icon: material/test-tube
tags:
  - परीक्षण
  - प्रोजेक्ट आंतरिक
---

# परीक्षण

## यूनिट टेस्ट

```bash
npm run test:unit
```

यूनिट टेस्ट वातावरण पार्सिंग, ब्रिज कॉन्फ़िगरेशन जनरेशन, लॉन्च आर्ग्युमेंट हैंडलिंग और स्थानीय Cloak introspection टूल को कवर करते हैं।

## इंटीग्रेशन टेस्ट

```bash
npm run test:integration
```

इंटीग्रेशन टेस्ट नकली upstream MCP child process का उपयोग करते हैं और सत्यापित करते हैं कि ब्रिज स्थानीय टूल को मिलाता है और upstream कॉल को बिना बदले आगे भेजता है।

CI Node.js 22-26 पर Linux x64, Linux arm64, macOS arm64, macOS x64 और Windows x64 के लिए यूनिट, इंटीग्रेशन और packaged CLI E2E टेस्ट चलाता है।

## पैकेज सत्यापन

```bash
npm run package:verify
```

यह पैकेज बनाता है, `npm pack` चलाता है, tarball फ़ाइल सूची जांचता है, tarball को अस्थायी प्रोजेक्ट में इंस्टॉल करता है और CLI `--version` तथा `--help` सत्यापित करता है।

पैकेज सत्यापन प्रकाशित MCP server schema के विरुद्ध `server.json` को भी validate करता है।

## Docker smoke टेस्ट

```bash
npm run docker:build
npm run docker:smoke
```

Smoke टेस्ट सत्यापित करता है कि बनी हुई इमेज शुरू होती है और CLI help दिखाती है। CI `linux/amd64` और `linux/arm64` के लिए Docker इमेज पर smoke टेस्ट चलाता है।

## Upstream parity

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Parity script आधिकारिक Playwright MCP Docker इमेज और CloakBrowser bridge इमेज शुरू करता है, upstream tool names की तुलना करता है, एक ही fixture page पर default browser tool surface चलाता है और स्थानीय Cloak introspection tools सत्यापित करता है।

CI Docker build jobs और release jobs के लिए JSON parity report को artifact के रूप में upload करता है। Browser parity अभी `linux/amd64` पर चलती है; arm64 Docker jobs smoke tests और vulnerability checks का उपयोग करते हैं।

## सुरक्षा जांच

```bash
npm run audit:prod
npm run server:validate
```

CI CodeQL, Dependency Review, OpenSSF Scorecard, zizmor और Trivy भी चलाता है। ये tools public repositories के लिए मुफ्त हैं और external accounts की आवश्यकता नहीं होती।
