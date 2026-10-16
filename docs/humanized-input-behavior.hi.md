---
title: मानवीकृत इनपुट व्यवहार
description: इंटरैक्शन-संवेदनशील QA और स्ट्रीमएबल HTTP सत्रों के लिए क्लोकब्राउज़र के मानवीय-जैसे माउस, कीबोर्ड, और स्क्रॉल व्यवहार को सक्षम करें।
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# मानवीकृत इनपुट व्यवहार

ह्यूमनाइज़्ड इनपुट बिहेवियर, पेज इंटरैक्शन को क्लोकब्राउज़र के मानव-सदृश माउस, कीबोर्ड और स्क्रॉल लेयर के माध्यम से राउट करता है। यह तब उपयोगी होता है जब QA को मानक ऑटोमेशन की तुलना में अधिक यथार्थवादी गति, पॉइंटर की गति, टाइपिंग की लय और स्क्रॉल व्यवहार की आवश्यकता होती है।

ब्रिज नए ब्राउज़र टूल्स नहीं जोड़ता है या अपस्ट्रीम Playwright MCP स्कीमा को नहीं बदलता है। यह Playwright MCP पेज इनिशियलाइज़ेशन के दौरान CloakBrowser के पेज इंटरैक्शन पैच को लागू करता है, ताकि मौजूदा टूल्स उसी इनपुट के साथ काम करते रहें।

## यह क्या बदलता है

जब `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, क्लोकब्राउज़र सामान्य पेज क्रियाओं को मानवीय बना सकता है, जिनमें शामिल हैं:

- माउस की मूवमेंट और क्लिक;
- कीबोर्ड टाइपिंग और की प्रेस;
- फॉर्म भरना और फ़ील्ड स्विचिंग;
- स्क्रॉलिंग और स्क्रॉल-टू-एलिमेंट व्यवहार।

इससे इंटरैक्शन टाइमिंग और मूवमेंट पैटर्न प्रभावित होते हैं। यह पेज की सामग्री, नेटवर्क राउटिंग, प्रॉक्सी सेटिंग्स, या ब्राउज़र जियोलोकेशन को नहीं बदलता है।

## वैश्विक सेटअप

जब हर stdio सत्र या डिफ़ॉल्ट Streamable HTTP सत्र को मानवीय व्यवहार का उपयोग करना चाहिए, तब पर्यावरण चर का उपयोग करें:

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

उसी सेटिंग स्पष्ट CLI फ़्लैग के साथ भी काम करती है:

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## डॉकर सेटअप

कंटेनर को वही पर्यावरण चर पास करें:

```bash
docker run --rm -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker में स्ट्रीमएबल HTTP के लिए, एनवायरनमेंट वेरिएबल नए HTTP सत्रों के लिए डिफ़ॉल्ट बन जाता है:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## प्रति-सत्र Streamable HTTP सेटअप

स्ट्रीमएबल HTTP क्लाइंट MCP सत्र आरंभिकीकरण समय पर मानवीकृत व्यवहार चुन सकते हैं। यह एक सर्वर को बिना पुनः आरंभ किए मानक और मानवीकृत इंटरैक्शन व्यवहार की तुलना करने की अनुमति देता है।

`initialize` अनुरोध में ब्रिज मेटाडेटा भेजें:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`humanize` उस HTTP सत्र के लिए प्रक्रिया-स्तर की सेटिंग को ओवरराइड करता है। मानवीकृत व्यवहार को सक्षम करने के लिए `true` या `false` का उपयोग इसे अक्षम करने के लिए करें, भले ही सर्वर को `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` के साथ शुरू किया गया हो।

`humanPreset` स्वीकार करता है `default` या `careful` स्वीकार करता है और सत्र के लिए क्लोकब्राउज़र मानवीय व्यवहार प्रीसेट चुनता है। यह अपने आप मानवीकृत व्यवहार को सक्षम नहीं करता है; `humanize: true` सेट करें या `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` सक्षम करें।
`careful` प्रीसेट, `default` की तुलना में धीमा और अधिक सतर्क है।

मौजूदा HTTP सत्र अपरिवर्तनीय हैं। मानक और मानवीकृत व्यवहार के बीच स्विच करने के लिए एक और स्ट्रीमएबल HTTP सत्र बनाएँ।

## उपयोग के मामले

<div class="grid cards" markdown>

- :material-form-textbox: **फ़ॉर्म QA**

  अधिक realistic keyboard cadence के साथ typing, filling, focus changes और validation flows test करें।

- :material-cart-check: **Checkout फ़्लो**

  Interaction-heavy purchase paths test करें जहां typing, clicking और field switching timing client-side validation को प्रभावित कर सकती है।

- :material-shield-search: **Interaction-sensitive UI जांच**

  जब page बहुत तेज या perfectly linear inputs पर अलग प्रतिक्रिया देता है, तो standard automation की humanized interaction से तुलना करें।

- :material-mouse-scroll-wheel: **अधिक scroll वाली pages**

  Smoother scroll behavior के साथ long pages, feeds, product lists और lazy-loading content validate करें।

- :material-presentation-play: **Demos और recordings**

  Product demos, walkthroughs या recorded QA evidence के दौरान कम mechanical दिखने वाले browser sessions बनाएं।

</div>

## प्राथमिकता और सीमाएँ

| क्षेत्र | व्यवहार |
| --- | --- |
| Stdio | केवल process-level environment variables और CLI flags उपयोग करता है। |
| Streamable HTTP default | Runtime metadata न दिए जाने पर process-level environment variables और CLI flags उपयोग करता है। |
| Streamable HTTP metadata | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` एक session के लिए humanized behavior override कर सकता है। `humanPreset` `default` या `careful` चुन सकता है। |
| Existing sessions | `initialize` के दौरान capture किए गए humanize setting को रखते हैं। |
| Browser engine | केवल `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak` होने पर लागू होता है। |
| Tool schemas | Upstream Playwright MCP browser tool schemas unchanged रहते हैं। |
| Custom config | `humanConfig` अभी intentionally accepted नहीं है; structured config को explicit validation schema चाहिए। |

यह सुविधा वैध QA, इंटरैक्शन यथार्थवाद, और संगति परीक्षण के लिए है।
इसे एक्सेस नियंत्रण या नीति जांचों को बायपास करने के तरीके के रूप में नहीं
माना जाना चाहिए।

## संबंधित कॉन्फ़िगरेशन

- [कॉन्फ़िगरेशन](configuration.md) सभी ब्रिज और अपस्ट्रीम पर्यावरण चरों को सूचीबद्ध करता है।
- [GeoIP प्रॉक्सी मिलान](geoip-proxy-matching.md) क्षेत्र-संगत प्रॉक्सी प्रोफाइल को समझाता है।
- [टूल्स](tools.md) यह समझाता है कि अपस्ट्रीम प्लेराइट MCP ब्राउज़र टूल्स को बिना बदले क्यों अग्रेषित किया जाता है।

## अतिरिक्त व्यावहारिक रास्ते

upstream Playwright MCP और इस package में चुनने के लिए [तुलना](comparison.md) देखें। तेज tasks के लिए [रेसिपी](recipes/index.md) उपयोग करें: persistent profile, extensions, reverse proxy, regional QA, Claude Desktop, Codex CLI और CI smoke test.

## CloakBrowser

वर्तमान CloakBrowser निर्भरता `{{ project.cloakbrowser_dependency }}` है। मानवीय टाइपिंग में कुंजियों को दबाए रखने का समय ओवरलैप होता है और कुंजियों के बीच अंतराल बदलते हैं। माउस की गति का समय दूरी पर निर्भर करता है। स्क्रॉलिंग अनुकरण किए गए प्लेटफ़ॉर्म के पूरे व्हील चरणों का उपयोग करती है, इसलिए छोटे अनुरोधित विस्थापन पूर्णांक चरणों में बदले जा सकते हैं। इंटरैक्शन स्थिर स्थान वाले मोडल और पूर्वज स्क्रॉल कंटेनरों के बाहर पूर्ण स्थान वाले एलिमेंट का समर्थन करते हैं। पेज नेविगेशन कराने वाले विकल्प को चुनने पर पुराने एलिमेंट की त्रुटि के बजाय चुने गए मान लौटते हैं।

CloakBrowser 0.6.2/0.6.3 के लिए, ब्रिज मूल दिनांक या समय संपादक में टाइप करने से पहले `ArrowLeft` से पहले खंड पर जाता है। इससे पहले क्लिक के बाद सभी अंक वर्ष वाले खंड में दर्ज होने से बचते हैं। मान कीबोर्ड से दर्ज किए जाते हैं, प्रोग्राम के ज़रिए सीधे नहीं दिए जाते।

CloakBrowser 0.6.2, Playwright 1.64 के साथ humanize क्रियाओं की दृश्यता जाँच ठीक करता है। ब्रिज upstream के बिना शर्त `true` के बजाय, एलिमेंट की स्थिति जाँचने वाले दोनों पथों को मूल iframe की वास्तविक दृश्यता देता है।

मानवीय क्रियाएँ strict mode सहित Playwright चयनकर्ता नियमों का पालन करती हैं। अस्पष्ट locators और असमर्थित क्रियाएँ सामान्य क्रियाओं पर चुपचाप लौटने के बजाय त्रुटियाँ देती हैं। उदाहरण के लिए, मानवीय `fill()` से `input[type=color]` नियंत्रित नहीं किया जा सकता; इस क्रिया की आवश्यकता वाली सत्र में humanize अक्षम करें।

humanize सक्षम होने पर ब्रिज केवल सत्यापित निर्भरता संस्करण और स्रोत हैश स्वीकार करता है। यह पूर्वज iframe की दृश्यता जाँचता है और मिले हुए DOM एलिमेंट के कमजोर संदर्भ रखता है, ताकि हटाए गए एलिमेंट मुक्त किए जा सकें। असमर्थित संस्करण या बदला हुआ स्रोत अस्वीकार किया जाता है; समर्थन जुड़ने तक `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=false` का उपयोग करें।

CloakBrowser 0.6.1, `Page`, `Frame`, `Locator` और `ElementHandle` के लिए humanize के अलग किए गए संदर्भ में `inputValue()`, `textContent()`, `innerText()`, `innerHTML()`, `getAttribute()` और `dispatchEvent()` चलाता है। छिपे या एक-दूसरे के ऊपर स्थित `ElementHandle` तत्वों और `JSHandle` वाले इवेंट तर्कों के लिए, अपस्ट्रीम पढ़ने और इवेंट भेजने हेतु humanize के बिना मूल Playwright का उपयोग करता है।

ड्रॉपडाउन चयन टाइप किए गए उपसर्ग से खोज करता है और बार-बार चयन का समर्थन करता है। macOS पर emoji से शुरू होने वाला लेबल मानवीय इनपुट से नहीं चुना जा सकता है; त्रुटि MCP के माध्यम से भेजी जाती है। यदि प्रोग्राम द्वारा चयन स्वीकार्य है, तो अपस्ट्रीम विधि `page._original.selectOption()` का स्पष्ट रूप से उपयोग करें।
