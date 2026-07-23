---
title: GeoIP प्रॉक्सी मिलान
description: Match CloakBrowser timezone, language, and locale fingerprints to a configured proxy location for regional QA and Streamable HTTP sessions.
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# GeoIP प्रॉक्सी मिलान

GeoIP प्रॉक्सी मैचिंग, ब्राउज़र फिंगरप्रिंट सेटिंग्स को अपस्ट्रीम Playwright MCP द्वारा उपयोग की जाने वाली प्रॉक्सी के स्थान के साथ संरेखित रखती है। यह तब उपयोगी होता है जब क्षेत्रीय QA एक सुसंगत प्रॉक्सी, टाइमज़ोन, भाषा और लोकेल प्रोफ़ाइल पर निर्भर करता है।

ब्रिज स्वयं प्रॉक्सी ट्रैफ़िक नहीं बनाता या रूट नहीं करता। वह
`PLAYWRIGHT_MCP_PROXY_SERVER` को CloakBrowser की लॉन्च तैयारी में भेजता है।
मैचिंग सक्षम होने पर CloakBrowser कॉन्फ़िगर किए गए प्रॉक्सी के निकास स्थान को
रिज़ॉल्व करता है और टाइमज़ोन, ब्राउज़र भाषा, फ़िंगरप्रिंट लोकेल तथा WebRTC IP
के लिए मिलान करने वाले लॉन्च फ़्लैग जोड़ता है।

## यह क्या बदलता है

जब `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true`, तो ब्रिज इन लॉन्च फ़्लैग्स को CloakBrowser के लिए जोड़ सकता है:

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`
- `--fingerprint-webrtc-ip`

यह ब्राउज़र प्रोफ़ाइल को प्रॉक्सी क्षेत्र के साथ आंतरिक रूप से सुसंगत बनाने में मदद करता है।
अपस्ट्रीम Playwright MCP टूल स्कीमा और ब्राउज़र टूल अभी भी बिना बदले अग्रेषित किए जाते हैं।

## वैश्विक सेटअप

stdio क्लाइंट्स और स्ट्रीमएबल HTTP सेशंस के लिए डिफ़ॉल्ट के रूप में प्रक्रिया-स्तर के पर्यावरण चर का उपयोग करें:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

जब कुछ होस्ट्स को प्रॉक्सी से बचना चाहिए, तो एक बाईपास सूची जोड़ें:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

प्रमाणित HTTP प्रॉक्सी का समर्थन क्रेडेंशियल्स को एम्बेड करके किया जाता है।
`PLAYWRIGHT_MCP_PROXY_SERVER`. क्रेडेंशियल्स में विशेष वर्णों का प्रतिशत-एन्कोड करें,
उदाहरण के लिए `p%40ssword` का उपयोग `p@ssword` के लिए करें।

समर्थित CloakBrowser बाइनरी नेटिव URL-इनलाइन प्रमाणीकरण का उपयोग करती हैं और
प्रॉक्सी द्वारा सख़्त प्रमाणित CONNECT अनुरोध की आवश्यकता होने पर भी उसका
वास्तविक निकास IP बताती हैं। पुरानी बाइनरी संगतता फ़ॉलबैक के रूप में
Playwright प्रॉक्सी ऑब्जेक्ट बनाए रखती हैं।

## डॉकर सेटअप

कंटेनर को वही वेरिएबल पास करें। जहाँ संभव हो, प्रॉक्सी क्रेडेंशियल को अपने सीक्रेट मैनेजर या MCP क्लाइंट वातावरण में रखें।

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker में स्ट्रीमएबल HTTP के लिए, HTTP पोर्ट को सामान्य रूप से पब्लिश करें और प्रॉक्सी वेरिएबल्स को कंटेनर एन्वायरनमेंट डिफ़ॉल्ट्स के रूप में रखें:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## प्रति-सत्र स्ट्रीम करने योग्य HTTP प्रॉक्सी

स्ट्रीमएबल HTTP क्लाइंट MCP सत्र आरंभिक समय पर एक प्रॉक्सी चुन सकते हैं। यह एक लंबे समय तक चलने वाले MCP सर्वर को बिना फिर से शुरू किए विभिन्न क्षेत्रीय परिदृश्यों को संभालने की अनुमति देता है।

`initialize` अनुरोध में ब्रिज मेटाडेटा भेजें:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` उस HTTP सत्र के लिए `PLAYWRIGHT_MCP_PROXY_SERVER` को ओवरराइड करता है।
`proxyBypass` ओवरराइड करता है `PLAYWRIGHT_MCP_PROXY_BYPASS` केवल तभी ओवरराइड करता है जब `proxyServer` है
उपस्थित। यदि `proxyServer` उपस्थित है और `proxyBypass` को छोड़ दिया गया है, तो विरासत में मिला हुआ
उस सत्र के लिए प्रॉक्सी बाईपास कॉन्फ़िगरेशन साफ़ कर दिया गया है।

`geoipProxyMatch` उस HTTP के लिए प्रक्रिया-स्तर की GeoIP सेटिंग को ओवरराइड करता है
सत्र। सत्र के मिलान को सक्षम करने के लिए `true` का उपयोग करें या इसे अक्षम करने के लिए `false` का उपयोग करें।
यहाँ तक कि जब सर्वर को मैचिंग सक्षम के साथ शुरू किया गया था।

मौजूदा HTTP सत्र अपरिवर्तनीय हैं। किसी अलग प्रॉक्सी या स्थान पर स्विच करने के लिए एक और स्ट्रीमएबल HTTP सत्र बनाएँ।

यदि `proxyServer` में क्रेडेंशियल हैं, तो उन्हें URL-एनकोडेड रखें और प्रोजेक्ट फ़ाइलों में जमा करने के बजाय, वैल्यू को सीक्रेट्स या क्लाइंट रनटाइम कॉन्फ़िगरेशन के माध्यम से पास करें।

## उपयोग के मामले

<div class="grid cards" markdown>

- :material-cart-check: **स्थानीयकृत commerce QA**

  Checkout, taxes, shipping messages, currency और regional catalog rules को ऐसे browser timezone
  और locale के साथ test करें जो proxy location से match करते हों।

- :material-web: **क्षेत्रीय landing pages**

  Visitor region पर निर्भर language, consent, campaign और content variants verify करें।

- :material-lifebuoy: **Customer support reproduction**

  हर proxy location के लिए पूरा MCP server restart किए बिना customer region से report reproduce करें।

- :material-clock-check: **Timezone-sensitive flows**

  Date pickers, booking windows, reminders और scheduling pages validate करें जहां timezone और locale
  network region से match होने चाहिए।

- :material-source-branch-sync: **Parallel regional sessions**

  अलग-अलग proxies के साथ अलग Streamable HTTP sessions चलाएं ताकि agent एक ही server process में
  कई regions compare कर सके।

</div>

## प्राथमिकता और सीमाएँ

| क्षेत्र | व्यवहार |
| --- | --- |
| Stdio | केवल process-level environment variables और CLI flags उपयोग करता है। |
| Streamable HTTP default | Runtime metadata न दिए जाने पर process-level environment variables और CLI flags उपयोग करता है। |
| Streamable HTTP metadata | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` एक session के लिए proxy और GeoIP matching override कर सकता है। |
| Existing sessions | `initialize` के दौरान capture किए गए proxy और GeoIP setting को रखते हैं। |
| प्रमाणित HTTP प्रॉक्सी | समर्थित बाइनरी पर CloakBrowser नेटिव URL-इनलाइन प्रमाणीकरण और पुरानी बाइनरी पर Playwright प्रॉक्सी ऑब्जेक्ट का उपयोग करती है। |
| रॉ टाइमज़ोन/लोकेल फ़्लैग | `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` में स्पष्ट `--fingerprint-timezone`, `--lang` और `--fingerprint-locale` मान GeoIP से प्राप्त मानों पर प्राथमिकता लेते हैं और डुप्लिकेट नहीं होते। |
| Browser geolocation API | यह सुविधा इसे कॉन्फ़िगर नहीं करती; यह केवल CloakBrowser के टाइमज़ोन, भाषा, लोकेल और WebRTC IP फ़िंगरप्रिंट मानों को संरेखित करती है। |

GeoIP लोकेशन डेटा अनुमानित होता है और यह प्रॉक्सी आईपी और CloakBrowser के GeoIP डेटाबेस पर निर्भर करता है। CloakBrowser आवश्यकता पड़ने पर पहली बार उपयोग के समय उस ऑफ़लाइन डेटाबेस को डाउनलोड और कैश करता है।

उदाहरण के लिए, निम्न कॉन्फ़िगरेशन स्पष्ट टाइमज़ोन और लोकेल को बनाए रखता है,
फिर भी प्रॉक्सी निकास IP को रिज़ॉल्व करने के लिए GeoIP मैचिंग का उपयोग करता है:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS='["--fingerprint-timezone=America/New_York","--lang=en-US","--fingerprint-locale=en-US"]' \
npx -y cloakbrowser-mcp@latest
```

इस सुविधा का उपयोग वैध QA, स्थानीयकरण, और पर्यावरण की स्थिरता परीक्षण के लिए करें। इसे एक्सेस नियंत्रण या क्षेत्रीय नीति जांचों को बाईपास करने के तरीके के रूप में नहीं माना जाना चाहिए।

## संबंधित कॉन्फ़िगरेशन

- [कॉन्फ़िगरेशन](configuration.md) सभी ब्रिज और अपस्ट्रीम एनवायरनमेंट वेरिएबल्स को सूचीबद्ध करता है।
- [Docker](docker.md) कंटेनर रनटाइम डिफ़ॉल्ट और Streamable HTTP पब्लिशिंग को समझाता है।
- [टूल्स](tools.md) यह समझाता है कि अपस्ट्रीम Playwright MCP ब्राउज़र टूल्स को बिना बदले क्यों फॉरवर्ड किया जाता है।

## अतिरिक्त व्यावहारिक रास्ते

upstream Playwright MCP और इस package में चुनने के लिए [तुलना](comparison.md) देखें। तेज tasks के लिए [रेसिपी](recipes/index.md) उपयोग करें: persistent profile, extensions, reverse proxy, regional QA, Claude Desktop, Codex CLI और CI smoke test.
