---
description: क्लोकब्राउज़र MCP इंस्टॉलेशन, डॉकर उपयोग, प्लेराइट MCP पेरिटी, और सुरक्षा के बारे में अक्सर पूछे जाने वाले प्रश्न।
icon: material/help-circle
tags:
  - User Guide
---

# अक्सर पूछे जाने वाले प्रश्न

## CloakBrowser MCP क्या है?

CloakBrowser MCP, stdio या Streamable HTTP पर ब्राउज़र ऑटोमेशन के लिए एक [Model Context Protocol](https://modelcontextprotocol.io/) सर्वर है। यह मूल [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) चलाता है और उसकी ब्राउज़र लॉन्च कॉन्फ़िगरेशन में [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) की Chromium बाइनरी का उपयोग करता है।

## यह मूल Playwright MCP से कैसे अलग है?

ब्राउज़र टूल के स्कीमा, विवरण और उत्तर मूल Playwright MCP सर्वर तय करता है। CloakBrowser MCP इन टूल को अपरिवर्तित रखता है और केवल दो स्थानीय निदान टूल जोड़ता है: `cloakbrowser_binary_info` और `cloakbrowser_bridge_info`।

टूल की समानता, CloakBrowser के साथ निष्पादन, पैकेजिंग, Streamable HTTP, प्रोफ़ाइल, एक्सटेंशन, क्षेत्रीय QA और मानव-सदृश इनपुट की निष्पक्ष तुलना के लिए [`@playwright/mcp` बनाम `cloakbrowser-mcp`](comparison.md) देखें।

## क्या मुझे इसे npm या Docker से इंस्टॉल करना चाहिए?

यदि आपका MCP क्लाइंट पहले से आपकी मशीन पर चलता है और Node.js `{{ project.node_engine_range }}` उपलब्ध है, तो npm का उपयोग करें। यदि आपका MCP क्लाइंट पहले से आपकी मशीन पर चलता है और Node.js की 22.x शाखा में 22.13+ या Node.js 24+ उपलब्ध है, तो npm का उपयोग करें। यदि आप Playwright MCP पर आधारित एक दोहराने योग्य इमेज चाहते हैं, जिसमें CloakBrowser कैश कंटेनर के भीतर तैयार हो, तो Docker का उपयोग करें।

## कौन से MCP क्लाइंट इसका उपयोग कर सकते हैं?

stdio या Streamable HTTP सर्वर का समर्थन करने वाला कोई भी MCP क्लाइंट CloakBrowser MCP का उपयोग कर सकता है। [आरंभ करना](getting-started.md) गाइड में Codex, Claude Desktop, Claude Code, Cursor, VS Code/Cline शैली के क्लाइंट, Continue, Windsurf, Goose और Warp शैली की कॉन्फ़िगरेशन के लिए stdio JSON उदाहरण दिए गए हैं।

[Claude Desktop](recipes/connect-claude-desktop.md) और [Codex CLI](recipes/connect-codex-cli.md) के लिए संक्षिप्त सेटअप गाइड भी उपलब्ध हैं।

## व्यावहारिक सेटअप उदाहरण कहाँ मिलेंगे?

काम के अनुसार सेटअप गाइड के लिए [रेसिपी](recipes/index.md) अनुभाग देखें। इसमें लॉगिन बनाए रखने वाली स्थायी प्रोफ़ाइल, Chrome एक्सटेंशन, रिवर्स प्रॉक्सी के पीछे Docker Streamable HTTP, प्रॉक्सी के माध्यम से क्षेत्रीय QA, MCP क्लाइंट सेटअप और CI smoke परीक्षण शामिल हैं।

## क्या यह Playwright MCP जैसे ही ब्राउज़र टूल का समर्थन करता है?

हाँ। मूल Playwright MCP के ब्राउज़र टूल बिना बदलाव के अग्रेषित किए जाते हैं। प्रोजेक्ट CI में टूल की समानता की तुलना भी करता है, ताकि ब्रिज में बदलावों को आधिकारिक Playwright MCP के व्यवहार से मिलाकर जाँचा जा सके।

## क्या Docker सुरक्षा बेहतर करता है?

Docker अधिक दोहराने योग्य और अलग-थलग रनटाइम देता है, लेकिन ब्राउज़र ऑटोमेशन को जोखिम-मुक्त नहीं बनाता। स्वचालित ब्राउज़िंग को अविश्वसनीय निष्पादन मानें: अज्ञात पेजों के साथ गुप्त जानकारी साझा न करें, आर्टिफैक्ट और स्क्रीनशॉट नियंत्रित डायरेक्टरी में रखें, और सर्वर को अन्य सिस्टम के लिए उपलब्ध करने से पहले [सुरक्षा](security.md) गाइड पढ़ें।

## क्या यह प्रोजेक्ट एनालिटिक्स या ट्रैकिंग का उपयोग करता है?

नहीं। दस्तावेज़ वेबसाइट डिफ़ॉल्ट रूप से एनालिटिक्स सक्षम नहीं करती। सर्च इंजन में खोजे जाने के लिए मानक मेटाडेटा, `robots.txt`, साइटमैप निर्माण, वैकल्पिक वेबमास्टर सत्यापन टैग और वैकल्पिक IndexNow सूचनाओं का उपयोग किया जाता है।
