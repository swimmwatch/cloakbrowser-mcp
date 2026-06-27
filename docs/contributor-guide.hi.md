---
description: क्लोकब्राउज़र MCP के लिए योगदानकर्ता प्रवेश बिंदु।
icon: material/source-branch
tags:
  - Project Internals
---

# योगदानकर्ता मार्गदर्शिका

उपयोगकर्ता दस्तावेज़ीकरण जानबूझकर MCP सर्वर को स्थापित करने और उपयोग करने पर केंद्रित है। विकास सामग्री यहाँ समूहित की गई है।

अनुभाग

- [विकास](development.md) स्थानीय सेटअप और पैकेज संरचना के लिए।
- [परीक्षण](testing.md) यूनिट, इंटीग्रेशन, डॉकर, npm पैकेज, और पैरिटी जांच के लिए।
- [आर्किटेक्चर](architecture.md) ब्रिज रनटाइम डिज़ाइन के लिए।
- [रिलीज़](release.md) रिपॉजिटरी सेटिंग्स और पब्लिश वर्कफ़्लो के लिए।
- [योगदान](contributing.md) प्रोजेक्ट वर्कफ़्लो के लिए।

## आवश्यक स्थानीय जाँच

```bash
npm run check
```

कमिट करने से पहले पूरी जाँच चलाएँ। Docker parity भारी है और इसे निम्नलिखित कमांड से चलाया जा सकता है:

```bash
npm run docker:build
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

मेटाडेटा और उत्पादन निर्भरता जाँच सीधे निम्नलिखित के साथ चलाई जा सकती हैं:

```bash
npm run server:validate
npm run audit:prod
```
