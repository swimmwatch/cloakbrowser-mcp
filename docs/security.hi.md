---
description: CloakBrowser MCP, Docker isolation, artifacts, secrets और network exposure के लिए security model और browser automation risk guidance.
icon: material/shield-lock
tags:
  - सुरक्षा
  - उपयोगकर्ता गाइड
---

# सुरक्षा

यह project browser automation bridge है। इसे trusted-code execution infrastructure की तरह treat करें।

## मैनेज्ड CDP सुरक्षा { #managed-cdp-security }

मैनेज्ड CDP डिफ़ॉल्ट रूप से अक्षम है। यह मनमाना Chromium डेवलपर टूल्स नियंत्रण प्रदान करता है,
API एक संकुचित ब्राउज़र-टूल नहीं है। इसे केवल भरोसेमंद क्लाइंट्स के लिए सक्षम करें। इसमें क्षमता
`cloakbrowser_bridge_info.cdp.discoveryUrl` एक धारक क्रेडेंशियल है: इसे लॉग न करें,
इसे टिकटों में स्टोर करें, या सत्रों के बीच साझा करें। यह ब्राउज़र बदलने के बाद घूमता है।
और एक पुराना URL कभी भी प्रतिस्थापन पीढ़ी में नहीं जाता।

एक नॉन-लूपबैक CDP बाइंड के लिए दोनों `--cdp-allow-remote` और एक ठोस विज्ञापित की आवश्यकता होती है
होस्ट। प्रकाशित पोर्ट के आसपास नेटवर्क एक्सेस नियंत्रण जोड़ें। चयन करना
`--cdp-advertised-scheme https` TLS प्रदान नहीं करता। प्रबंधित श्रोता और
Chromium हॉप प्लेनटेक्स्ट में बने रहें; एक ऑपरेटर-स्वामित्व वाले सेम-पोर्ट TLS टर्मिनेटर को बनाए रखना चाहिए
विज्ञापित `Host` और `Origin` प्राधिकरण और उसके लिए वन-टू-वन रूटिंग बनाए रखते हैं
स्वयं का सत्र।

रनटाइम लॉग में कभी भी क्षमता पथ, लक्ष्य आईडी, CDP पेलोड, ब्राउज़र डेटा शामिल नहीं होते हैं,
कुकीज़, कच्चे `Host` या `Origin` मान, या प्रोफ़ाइल पाथ। अस्वीकृत सुरक्षा जांच हैं
केवल 60-सेकंड के साथ एक सत्र-सीमित `cdp_security_rejections` चेतावनी के रूप में रिपोर्ट किया गया
`capability`, `host`, और `origin` के लिए संतृप्ति गणनाएँ; शेष किसी भी चीज़ को साफ करने के लिए फ्लश
गणना। सफल जांच प्रति-आवेदन ऑडिट रिकॉर्ड नहीं बनाती हैं।

### निर्धारित सीमाएँ

सीमाएँ प्रत्येक CDP-सक्षम MCP सत्र पर स्वतंत्र रूप से लागू होती हैं:

| सीमा | सीमा |
| --- | --- |
| सक्रिय प्रॉक्सी वाले WebSocket कनेक्शन, जिसमें चल रहे हैंडशेक शामिल हैं | 8 |
| समानांतर प्री-अपग्रेड HTTP अनुरोध | 16 |
| अनुरोध हेडर | 16 KiB |
| समर्थित रूट्स पर अनुरोध बॉडी | अनुमति नहीं |
| बफ़र्ड Chromium HTTP प्रतिक्रिया | 4 MiB |
| इनबाउंड या आउटबाउंड WebSocket संदेश | 16 मेगाबाइट |
| निर्देशानुसार लंबित अनभेज़ा WebSocket डेटा | 16 मेगाबाइट |
| अनुरोध हेडर, अपस्ट्रीम HTTP प्रतिक्रिया, या WebSocket हैंडशेक | 10 सेकंड |
| मजबूर बंद करने से पहले सुशील प्रॉक्सी बंद | 5 सेकंड |
| स्थानीय त्रुटि प्रतिक्रिया शरीर | 8 केबी |

### HTTP त्रुटियाँ

स्थानीय विफलताएँ JSON `{"error":{"code":"...","message":"..."}}` का उपयोग करती हैं
`Cache-Control: no-store`, `Content-Type: application/json; charset=utf-8`, और एक
सटीक `Content-Length`। विधि की असफलताओं में `Allow` भी शामिल हैं। स्थिर मैपिंग हैं:

| स्थिति | कोड |
| --- | --- |
| `400` | `bad_request` |
| `403` | `forbidden` |
| `404` | `not_found` |
| `405` | `method_not_allowed` |
| `408` | `request_timeout` |
| `413` | `payload_too_large` |
| `431` | `headers_too_large` |
| `500` | `internal_error` |
| `502` | `bad_gateway` |
| `503` | `unavailable` |
| `504` | `gateway_timeout` |
| Chromium `400..499` | `upstream_error`, स्थिति बनाए रखना |

Chromium रीडायरेक्ट्स, सर्वर त्रुटियाँ, खराब प्रतिक्रिया, और ट्रांसपोर्ट विफलताएँ हैं
Chromium प्रतिक्रिया बॉडी को उजागर करने के बजाय सामान्यीकृत किया गया। एक ब्रिज-जनित अस्वीकृति
अपस्ट्रीम डिस्पैच से पहले किसी Chromium साइड इफेक्ट का कोई असर नहीं होता। एक केवल-पढ़ने वाली डिस्कवरी अनुरोध हो सकती है
स्थिति को सुधारने के बाद पुनः प्रयास किया जा सकता है। अस्पष्ट स्थिति-परिवर्तन विफलताओं के लिए,
`/json/list` को फिर से पढ़ें और एप्लिकेशन स्थिति को सुलझाएँ; `Retry-After` या मानने की धारणा न करें
स्वचालित आइडेम्पोटेंसी।

### WebSocket बंद होता है

स्थानीय रूप से उत्पन्न क्लोज़ स्थिर छिपाए गए जोड़ों का उपयोग करते हैं। वैध पीयर क्लोज़ प्रेषित किए जाते हैं।

| कोड | कारण | उपयोग करें |
| --- | --- | --- |
| `1001` | `going_away` | सत्र, पीढ़ी, या प्रॉक्सी शटडाउन |
| `1002` | `protocol_error` | दुरुस्त नहीं किया गया WebSocket प्रोटोकॉल इनपुट |
| `1009` | `message_too_big` | संदेश निर्धारित सीमा से अधिक है |
| `1011` | `internal_error` | अनपेक्षित अपस्ट्रीम डिस्कनेक्ट या रिले विफलता |
| `1013` | `try_again_later` | प्रति-दिशा अप्रेषित कतार सीमा पार हो गई |

## Trust boundary

Outer server stdio और Streamable HTTP support करता है। यह upstream Playwright MCP को child process के रूप में शुरू करता है और tool calls forward करता है। Browser automation, file output, network access और unsafe evaluation behavior upstream Playwright MCP द्वारा governed होते हैं।

stdio server को unauthenticated network wrapper के जरिए expose न करें। कोई भी client जो tools call कर सकता है, browser चला सकता है, browser-observable page data पढ़ सकता है और artifacts मांग सकता है।

Streamable HTTP local clients के लिए default रूप से HTTP पर `127.0.0.1` से bind होता है। यदि आप इसे `0.0.0.0` से bind करते हैं या loopback से बाहर publish करते हैं, तो `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` या equivalent reverse proxy authentication require करें, `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` और TLS files के साथ direct HTTPS उपयोग करें या trusted network edge पर TLS terminate करें, और access को trusted clients तक सीमित रखें।

## Unsafe tools

Upstream Playwright MCP में `browser_evaluate` और `browser_run_code_unsafe` जैसे tools शामिल हैं। ये browser या Playwright server context में JavaScript execute कर सकते हैं। इस server को केवल trusted MCP clients से connect करें।

`webmcp_*` tools मौजूदा page तय करता है। नाम, description, schema, annotations और output को अविश्वसनीय data मानें; bridge इन्हें बिना बदलाव आगे भेजता है। जरूरत न होने पर `PLAYWRIGHT_MCP_WEBMCP=false` सेट करें।

## Playwright Extension token

`PLAYWRIGHT_MCP_EXTENSION_TOKEN` केवल process environment या secret manager से दें। Bridge HTTP metadata में token स्वीकार नहीं करता और इसे config, bridge metadata, logs, errors या diagnostic snapshots में नहीं लिखता। Persistent profile सुरक्षित रखें और एक active `userDataDir` को कई sessions में reuse न करें।

## Configuration

Access controls और guardrails के लिए upstream options उपयोग करें:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

ये convenience guardrails हैं, process, container, network और filesystem isolation का substitute नहीं।

जहां संभव हो trusted targets के लिए allowlists उपयोग करें। Unrestricted file access और secrets files को sensitive capabilities मानें और shared MCP client profiles से बाहर रखें।

## Sandbox mode

Docker इमेज default रूप से `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true` उपयोग करती है, क्योंकि containerized CI और MCP runtimes में browser sandboxing अक्सर उपलब्ध नहीं होती। यह compatibility tradeoff है। यदि आपका host और container runtime Chromium sandboxing support करते हैं, तो सेट करें:

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

Chromium sandbox के बिना run करते समय Docker या कोई अन्य process isolation boundary उपयोग करें और broad host directories mount करने से बचें।

## Artifacts और secrets

Screenshots, snapshots, downloads, network logs, console logs और traces में credentials या private page content हो सकते हैं। केवल आवश्यक artifact directory mount करें, उपयोग के बाद साफ करें और artifact bundles सार्वजनिक रूप से share न करें।

यदि आपका MCP client browser sessions में credentials inject करता है, तो target site तक scoped short-lived credentials prefer करें। Long-lived tokens को screenshots, network responses या persistent browser profiles में न रखें।

## Docker

अलगाव और पुनरुत्पाद्य ब्राउज़र निर्भरताओं के लिए Docker की अनुशंसा की जाती है। केवल आवश्यक artifacts directory को mount करें; इमेज में पहले से Tini शामिल है, जो ब्राउज़र के child processes को सही तरीके से reaps करता है। कठोर, केवल-पढ़ने वाले कंटेनर में `/data` को mounted रखें और headed sessions संभव होने पर `/tmp` तथा `/tmp/.X11-unix` के लिए लिखने योग्य अस्थायी mounts प्रदान करें।


Docker से Streamable HTTP publish करते समय `-p 127.0.0.1:3000:3000` prefer करें। Public interface पर direct publish करने से कोई भी reachable client browser automation capability पा सकता है, जब तक आप authentication और network controls न जोड़ें।

Docker इमेज CI में और release publishing से पहले Trivy से scan होती है। Scanner high और critical OS/library vulnerabilities check करता है और enabled होने पर SARIF results GitHub code scanning में upload करता है।

## Supply chain checks

Repository free GitHub-native और open source checks उपयोग करती है:

- JavaScript और TypeScript static analysis के लिए CodeQL.
- Pull request dependency changes के लिए Dependency Review.
- Runtime npm dependencies के लिए `npm audit --omit=dev --audit-level=high`.
- Repository supply-chain signals के लिए OpenSSF Scorecard.
- GitHub Actions security linting के लिए zizmor.
- Docker इमेज vulnerability scanning के लिए Trivy.

ये checks browser automation behavior या release changes की manual review को replace नहीं करते।

## Reporting

Vulnerabilities [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md) के माध्यम से report करें।
