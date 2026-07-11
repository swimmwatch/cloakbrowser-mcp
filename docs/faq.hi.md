---
description: क्लोकब्राउज़र MCP इंस्टॉलेशन, डॉकर उपयोग, प्लेराइट MCP पेरिटी, और सुरक्षा के बारे में अक्सर पूछे जाने वाले प्रश्न।
icon: material/help-circle
tags:
  - User Guide
---

# अक्सर पूछे जाने वाले प्रश्न

## क्लोकब्राउज़र MCP क्या है?

CloakBrowser MCP एक [Model Context Protocol](https://modelcontextprotocol.io/) सर्वर है जो stdio या Streamable HTTP पर ब्राउज़र ऑटोमेशन के लिए है। यह अपस्ट्रीम [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) और Playwright MCP ब्राउज़र लॉन्च कॉन्फ़िगरेशन को [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) क्रोमियम बाइनरी पर पॉइंट करता है।

## यह अपस्ट्रीम Playwright MCP से कैसे अलग है?

अपस्ट्रीम Playwright MCP सर्वर ब्राउज़र टूल के स्कीमा, विवरण और प्रतिक्रियाओं का मालिक है। CloakBrowser MCP उन टूल्स को अपरिवर्तित रखता है और केवल दो स्थानीय आत्मनिरीक्षण टूल्स जोड़ता है: `cloakbrowser_binary_info` और `cloakbrowser_bridge_info`.

क्या मुझे इसे npm से इंस्टॉल करना चाहिए या Docker से?

जब आपका MCP क्लाइंट पहले से ही आपकी मशीन पर चल रहा हो और 22.x श्रृंखला में Node.js 22.13+ या Node.js 24+ उपलब्ध हो, तो npm का उपयोग करें। जब आप एक दोहराई जा सकने वाली Playwright MCP-आधारित इमेज चाहते हैं और कंटेनर के अंदर CloakBrowser कैश तैयार होना चाहिए, तो Docker का उपयोग करें।

## कौन से MCP क्लाइंट इसका उपयोग कर सकते हैं?

कोई भी MCP क्लाइंट जो stdio या Streamable HTTP सर्वर को सपोर्ट करता है, वह CloakBrowser MCP का उपयोग कर सकता है। [Getting Started](getting-started.md) गाइड में Codex, Claude Desktop, Claude Code, Cursor, VS Code/Cline-style क्लाइंट्स, Continue, Windsurf, Goose, और Warp-style कॉन्फ़िगरेशनों के लिए stdio JSON उदाहरण शामिल हैं।

क्या यह Playwright MCP की तरह ही ब्राउज़र टूल्स का समर्थन करता है?

हाँ। अपस्ट्रीम Playwright MCP ब्राउज़र टूल्स बिना किसी बदलाव के अग्रेषित किए जाते हैं। यह प्रोजेक्ट CI में समानता तुलना भी चलाता है ताकि ब्रिज में किए गए बदलावों को आधिकारिक Playwright MCP व्यवहार से जांचा जा सके।

क्या डॉकर सुरक्षा में सुधार करता है?

Docker आपको अधिक पुनरावृत्ति योग्य और पृथक रनटाइम प्रदान करता है, लेकिन यह ब्राउज़र ऑटोमेशन को जोखिम-मुक्त नहीं बनाता। स्वचालित ब्राउज़िंग को अविश्वसनीय निष्पादन के रूप में मानें: अज्ञात पृष्ठों के साथ रहस्य साझा करने से बचें, आर्टिफैक्ट्स और स्क्रीनशॉट्स को नियंत्रित निर्देशिकाओं में रखें, और सर्वर को अन्य सिस्टमों के सामने उजागर करने से पहले [Security](security.md) गाइड की समीक्षा करें।

क्या यह प्रोजेक्ट एनालिटिक्स या ट्रैकिंग का उपयोग करता है?

नहीं। दस्तावेज़ीकरण साइट डिफ़ॉल्ट रूप से एनालिटिक्स सक्षम नहीं करती है। सर्च-इंजन खोज मानक मेटाडेटा, `robots.txt`, साइटमैप निर्माण, वैकल्पिक वेबमास्टर सत्यापन टैग, और वैकल्पिक IndexNow सूचनाओं के माध्यम से संभाली जाती है।

## अतिरिक्त व्यावहारिक रास्ते

upstream Playwright MCP और इस package में चुनने के लिए [तुलना](comparison.md) देखें। तेज tasks के लिए [रेसिपी](recipes/index.md) उपयोग करें: persistent profile, extensions, reverse proxy, regional QA, Claude Desktop, Codex CLI और CI smoke test.
