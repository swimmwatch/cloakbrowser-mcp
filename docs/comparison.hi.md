---
title: "@playwright/mcp बनाम cloakbrowser-mcp"
description: Playwright MCP upstream और CloakBrowser MCP की तुलना tool parity, CloakBrowser चलाने, packaging, Streamable HTTP, profiles, extensions, regional QA और मानवीय input पर करें।
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp बनाम cloakbrowser-mcp

मूल `@playwright/mcp` Playwright MCP के ब्राउज़र टूल का मानक सर्वर है। `cloakbrowser-mcp` उन टीमों के लिए है जिन्हें वही टूल CloakBrowser Chromium और पैकेज किए गए डिप्लॉयमेंट तरीकों के साथ चाहिए।

## सुविधाओं की तुलना

| सुविधा | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| मूल टूल अपरिवर्तित | ब्राउज़र टूल के मानक स्कीमा, विवरण और उत्तर तय करता है। | मूल ब्राउज़र टूल बिना बदलाव आगे भेजता है और CI में समानता जांचता है। |
| CloakBrowser बाइनरी | मूल Playwright MCP द्वारा चुना गया ब्राउज़र रनटाइम उपयोग करता है। | CloakBrowser Chromium को निष्पादन योग्य फ़ाइल बनाकर upstream कॉन्फ़िगरेशन बनाता है। |
| npm वितरण | मूल Playwright MCP पैकेज के रूप में प्रकाशित होता है। | `npx` और MCP क्लाइंट की stdio कॉन्फ़िगरेशन के लिए `cloakbrowser-mcp` के रूप में प्रकाशित होता है। |
| Docker इमेज | आधिकारिक Playwright MCP इमेज देता है। | आधिकारिक Playwright MCP इमेज पर आधारित है और CloakBrowser रनटाइम के डिफ़ॉल्ट तैयार करता है। |
| Streamable HTTP | मूल प्रोजेक्ट के ट्रांसपोर्ट व्यवहार का पालन करता है। | स्वास्थ्य, तत्परता, प्रमाणीकरण, HTTPS और सत्र मेटाडेटा विकल्पों के साथ stdio तथा Streamable HTTP देता है। |
| स्थायी प्रोफ़ाइल | upstream समर्थित ब्राउज़र स्थिति विकल्प उपयोग करता है। | `PLAYWRIGHT_MCP_USER_DATA_DIR` सत्यापन और कॉन्फ़िगरेशन बनाते समय प्रोफ़ाइल लॉक जोड़ता है। |
| एक्सटेंशन पथ | ब्राउज़र रनटाइम समर्थित होने पर उसी के द्वारा कॉन्फ़िगर होते हैं। | सत्यापित Chrome एक्सटेंशन डायरेक्टरी लोड करता है और स्थायी प्रोफ़ाइल आवश्यक बनाता है। |
| कॉन्टेक्स्ट सत्यापन | upstream कॉन्फ़िगरेशन के ढांचे पर निर्भर है। | Playwright MCP कॉन्फ़िगरेशन लिखने से पहले समर्थित कॉन्टेक्स्ट विकल्प सत्यापित करता है। |
| GeoIP क्षेत्रीय QA | प्रॉक्सी रूटिंग upstream की जिम्मेदारी रहती है। | CloakBrowser के टाइमज़ोन, भाषा और लोकेल fingerprint फ्लैग को कॉन्फ़िगर किए गए प्रॉक्सी स्थान से मिला सकता है। |
| मानव-सदृश इंटरैक्शन | Playwright MCP का सामान्य इंटरैक्शन व्यवहार उपयोग करता है। | समर्थित पेज इंटरैक्शन CloakBrowser के मानव-सदृश इनपुट व्यवहार से चला सकता है। |

## मूल Playwright MCP कब चुनें

- आपको सबसे छोटा Playwright MCP setup चाहिए;
- आपको CloakBrowser Chromium की ज़रूरत नहीं है;
- आप Playwright MCP upstream packaging को सीधे follow करना चाहते हैं।

## CloakBrowser MCP कब चुनें

- Playwright MCP tools को CloakBrowser Chromium के साथ चलना है;
- आपको npm, Docker या Streamable HTTP deployment paths चाहिए;
- आपको persistent profiles, extensions, context validation, regional QA या humanized input चाहिए।

## अगले कदम

- [आरंभ करना](getting-started.md)
- [रेसिपी](recipes/index.md)
- [टूल](tools.md)
