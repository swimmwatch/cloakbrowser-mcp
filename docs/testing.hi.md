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

`npm run check` में स्थिर जाँच, unit/integration परीक्षण और नकली upstream MCP के साथ पैक किए गए CLI के परीक्षण शामिल हैं; Chromium नहीं चलता। PR CI हर प्लेटफ़ॉर्म/Node.js संयोजन पर unit/integration और CLI परीक्षण एक बार चलाता है: Linux x64/arm64, macOS x64/arm64 और Windows x64 पर Node.js {{ project.node_check_versions }}। Linux x64 इसी परीक्षण रन में Codecov के लिए कवरेज एकत्र करता है। स्थिर जाँच और पैकेज सत्यापन Linux x64/Node.js {{ project.node_minimum_version }} पर एक बार होते हैं।

CI मैट्रिक्स, अपेक्षित परिणामों की सूची और दस्तावेज़ Node.js संस्करण `.github/workflows/ci.yml` से पढ़ते हैं। परीक्षण की जाने वाली रिलीज़ शाखाएँ बदलने पर इस फ़ाइल को अपडेट करें।

## वास्तविक ब्राउज़र और वितरण परीक्षण

```bash
npm run test:e2e
npm run test:e2e:playwright-console
npm run test:e2e:cdp
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run test:e2e:cdp:docker
```

`test:e2e` नकली upstream वाली CLI जांचों और वास्तविक Playwright Chromium की console जांचों को जोड़ता है। `test:e2e:playwright-console` नए सत्रों में console विधियां जांचता है। `test:e2e:cdp` Free CloakBrowser तथा नियंत्रित Playwright Chromium से प्रबंधित Chrome DevTools Protocol (CDP) पहुंच जांचता है।

`test:e2e:npm-package` पैकेज बनाकर अस्थायी प्रोजेक्ट में इंस्टॉल करता है। फॉरवर्डिंग अनुबंध जांच नकली upstream उपयोग करती है; ब्राउज़र परिदृश्य वास्तविक CloakBrowser और स्थानीय पेजों से मानक टूल, स्थायी स्थिति तथा दोनों humanization presets जांचते हैं। अलग परीक्षण खाली कैश में समानांतर डाउनलोड तथा stdout में अतिरिक्त पाठ न होने की जांच करता है। केवल पैकेज सत्यापन ब्राउज़र स्वीकृति नहीं है।

PR ब्राउज़र मैट्रिक्स उन्हीं पाँच प्लेटफ़ॉर्म पर Node.js {{ project.node_current_version }} के साथ Playwright कंसोल और प्रबंधित CDP जाँचता है; CDP को Linux x64/Node.js {{ project.node_minimum_version }} पर भी जाँचा जाता है। समानांतर Node.js {{ project.node_primary_version }} मैट्रिक्स पाँचों प्लेटफ़ॉर्म पर npm पैकेज, proxy/GeoIP, एक्सटेंशन और जीवनचक्र परीक्षण चलाता है, जिसमें मानव-सदृश व्यवहार के दोनों प्रीसेट शामिल हैं। Docker वितरण और CDP स्वीकृति `linux/amd64` तथा `linux/arm64` पर दोनों इंजनों को जाँचते हैं।

`required-ci` मर्ज से पहले सभी परीक्षण समूह और पूर्ण संयुक्त रिपोर्ट की सफलता आवश्यक बनाता है। यही `CI` वर्कफ़्लो साप्ताहिक और मैनुअल रूप से भी चलता है। `Release` परीक्षण की गई कोड रिविज़न से आर्टिफ़ैक्ट बनाकर प्रकाशित करता है।

## परीक्षण रिपोर्ट

हर CI मैट्रिक्स सेल संवेदनशील जानकारी हटाए गए परिणाम और निदान संलग्नक अपलोड करता है। एग्रीगेशन जॉब सूट और परिवेश लेबल रखते हुए उन्हें एक Allure HTML रिपोर्ट में जोड़ता है। अपेक्षित परिणाम उत्पादक न मिलने या परीक्षण विफल होने पर एग्रीगेशन विफल होता है; मूल परिणाम और HTML Actions आर्टिफैक्ट में उपलब्ध रहते हैं।

योग्य PR रन कॉन्फ़िगर किए गए अलग रिपोर्ट रिपॉजिटरी से रिपोर्ट लिंक प्रकाशित कर सकते हैं। इसके लिए प्रकाशन सक्षम होना, रन के प्रमाण सत्यापित होना और Pages जांच सफल होना जरूरी है। दस्तावेज़ वेबसाइट अलग deploy होती है। सार्वजनिक रिपोर्ट में केवल नियंत्रित परीक्षण डेटा से अनुमत और संवेदनशील जानकारी हटाए गए निदान होते हैं।

```bash
npm run test:report -- --suite unit --run-id local
npm run test:report:generate -- --input artifacts/test-results --output artifacts/test-report/local
npm run test:report:open -- --report artifacts/test-report/local
```

जेनरेटर के इनपुट में कलेक्टर की वास्तविक आउटपुट डायरेक्टरी दें। प्रारूप, संलग्नक तथा CI डिलीवरी के लिए [योगदान](contributing.md) देखें।

## पैकेज सत्यापन

```bash
npm run package:verify
```

यह पैकेज बनाता है, `npm pack` चलाता है, tarball फ़ाइल सूची जांचता है, tarball को अस्थायी प्रोजेक्ट में इंस्टॉल करता है और CLI `--version` तथा `--help` सत्यापित करता है।

पैकेज सत्यापन प्रकाशित MCP server schema के विरुद्ध `server.json` को भी validate करता है।

रिलीज़ तैयार करने में `npm run package:pack` आर्काइव बनाता है और उसके मेटाडेटा तथा फ़ाइल सूची का सत्यापन करता है। पैकेज इंस्टॉलेशन और CLI निष्पादन मर्ज से पहले `package:verify` द्वारा सत्यापित होते हैं।

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

CI Docker jobs से समानता की JSON रिपोर्ट अपलोड करता है। ब्राउज़र समानता की जाँच `linux/amd64` पर चलती है; दोनों आर्किटेक्चर पर बुनियादी जाँच, सुरक्षा कमियों की स्कैनिंग, वितरण और CDP परीक्षण चलते हैं। समानता की जाँच पिन किए गए Docker MCP संस्करण को कवर करती है; npm परीक्षण समूह npm MCP को अलग से सत्यापित करता है।

## सुरक्षा जांच

```bash
npm run audit:prod
npm run server:validate
```

CI CodeQL, Dependency Review, OpenSSF Scorecard, zizmor और Trivy भी चलाता है। ये tools public repositories के लिए मुफ्त हैं और external accounts की आवश्यकता नहीं होती।
