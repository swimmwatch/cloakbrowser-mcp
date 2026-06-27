---
description: क्लोकब्राउज़र MCP npm पैकेज, डॉकर इमेज, दस्तावेज़ीकरण साइट, MCP रजिस्ट्री लिस्टिंग, और GitHub पेज परिनियोजन के लिए रिलीज़ प्रक्रिया।
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# रिलीज़

रिलीज़ एक प्रकाशित GitHub रिलीज़ द्वारा संचालित होती हैं, जिसका टैग `v`, उदाहरण के लिए `v1.2.7`।

एकीकृत `Release` वर्कफ़्लो टैग को एक बार रिज़ॉल्व करता है, फिर व्युत्पन्न `version`,
`version_tag`, और npm पैकेजिंग, Docker बिल्ड आर्गुमेंट्स, इमेज लेबल, सर्वर मेटाडेटा, README मार्कर्स, और डॉक्यूमेंटेशन मार्कर्स के माध्यम से Docker-सेफ इमेज टैग।

## गिटहब रिपॉजिटरी सेटिंग्स

पहली रिलीज़ से पहले इन सेटिंग्स को कॉन्फ़िगर करें।

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

`npm-production`, `docker-production`, और में आवश्यक समीक्षकों को जोड़ें
`mcp-registry-production` यदि GitHub रिलीज़ प्रकाशित होने के बाद रिलीज़ के लिए मैन्युअल अनुमोदन की आवश्यकता होनी चाहिए। `github-pages` वातावरण का उपयोग नेटिव GitHub पेज डिप्लॉयमेंट जॉब द्वारा किया जाता है।

## एनपीएम पब्लिशिंग

एनपीएम रिलीज़ वर्कफ़्लो, गिटहब एक्शन्स OIDC के साथ एनपीएम ट्रस्टेड पब्लिशिंग के माध्यम से प्रकाशित करता है। यह प्रकाशित करने के लिए `NPM_TOKEN` का उपयोग नहीं करता है।

इन सटीक मानों के साथ npmjs.com पर विश्वसनीय प्रकाशक को कॉन्फ़िगर करें:

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

`npm` जॉब GitHub-होस्टेड रनर्स पर चलती है, Node.js 24 का उपयोग करती है, और रखती है
`id-token: write` ताकि npm GitHub Actions OIDC टोकन को एक अल्पकालिक पब्लिश क्रेडेंशियल के लिए एक्सचेंज कर सके। npm ट्रस्टेड पब्लिशिंग के लिए npm CLI
`>=11.5.1` और Node.js `>=22.14.0`.

प्रकाशन उपयोग:

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Trusted Publishing के माध्यम से प्रकाशित करते समय, npm सार्वजनिक रिपॉजिटरी से सार्वजनिक पैकेजों के लिए स्वचालित रूप से पैकेज प्रूवेंन्स (provenance) उत्पन्न करता है। इस वर्कफ़्लो में एक लंबे समय तक चलने वाले npm पब्लिश टोकन को वापस न जोड़ें।

पैकेज संस्करण `npm pack` और `npm publish`, और यदि `package.json` रिज़ॉल्व किए गए रिलीज़ संस्करण से मेल नहीं खाता है तो जॉब विफल हो जाता है।

## डॉकर पब्लिशिंग

Docker इमेज प्रकाशित किए जाते हैं:

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

`docker` जॉब रिपॉजिटरी `GITHUB_TOKEN` का उपयोग करता है
`packages: write` GHCR के लिए। Docker Hub पब्लिशिंग के लिए `DOCKERHUB_USERNAME` और `DOCKERHUB_TOKEN` `docker-production` वातावरण या रिपॉजिटरी सीक्रेट्स में।

सफल इमेज पुश के बाद वर्कफ़्लो डॉकर हब रिपॉजिटरी का अवलोकन अपडेट करता है। डॉकर हब इस गिटहब एक्शन्स रिलीज़ फ़्लो के लिए रूट `README.md` को स्वचालित रूप से पुल नहीं करता है; Docker Hub-विशिष्ट अवलोकन `docs/dockerhub-readme.md` में बनाए रखा जाता है।

रिलीज़ इमेज को पुश करने से पहले, वर्कफ़्लो:

- रिलीज़ संस्करण लागू करता है;
- टाइपस्क्रिप्ट, लिंट, फ़ॉर्मेट, बिल्ड, टेस्ट और कवरेज चेक्स चलाता है;
- एक लोकल रिलीज़ स्मोक इमेज बनाता है;
- डॉकर बिल्ड के दौरान पिन किए गए Playwright MCP बेस इमेज पर उपलब्ध डेबियन सुरक्षा अपडेट लागू करता है;
- रनटाइम इमेज से अनावश्यक ग्लोबल npm पेलोड को हटाता है;
- इमेज में `--help` चलाता है;
- ब्रिज पैरिटी स्क्रिप्ट के साथ इमेज की तुलना अपस्ट्रीम Playwright MCP से करता है;
- JSON ब्रिज पैरिटी रिपोर्ट को एक वर्कफ़्लो आर्टिफैक्ट के रूप में अपलोड करता है;
- उच्च और गंभीर OS/लाइब्रेरी भेद्यताओं के लिए इमेज को Trivy से स्कैन करता है।

Docker बिल्ड को `RELEASE_VERSION`, `RELEASE_VERSION_TAG`, और
`VCS_REF` बिल्ड आर्गुमेंट्स। वर्कफ़्लो अपस्ट्रीम Playwright MCP बेस इमेज डिजस्ट को भी रिज़ॉल्व करता है और इसे `PLAYWRIGHT_MCP_IMAGE_DIGEST` के रूप में पास करता है।

अंतिम छवि OCI लेबल और रनटाइम मेटाडेटा एनवायरनमेंट वेरिएबल्स के समान मान संग्रहीत करती है। प्रकाशित छवियों में शीर्षक, विवरण, स्रोत, दस्तावेज़ीकरण, संस्करण, संशोधन, लाइसेंस, लेखक, विक्रेता, बेस इमेज नाम, बेस इमेज डिजस्ट, और MCP सर्वर नाम के लिए लेबल शामिल होते हैं।

ट्रिवी मुफ़्त और ओपन सोर्स है और सार्वजनिक इमेज स्कैन के लिए किसी बाहरी टोकन की आवश्यकता नहीं होती है। जब कोड स्कैनिंग सक्षम होती है, तो SARIF परिणाम GitHub कोड स्कैनिंग पर अपलोड हो जाते हैं।

पहली पब्लिश के बाद, पुष्टि करें कि GHCR पैकेज सार्वजनिक है और इस रिपॉजिटरी से जुड़ा है, और पुष्टि करें कि डॉकर हब रिपॉजिटरी सार्वजनिक है।

Docker `linux/amd64` के लिए एक बहु-प्लेटफ़ॉर्म मैनिफ़ेस्ट प्रकाशित करता है और
`linux/arm64`. रिलीज़ वर्कफ़्लो पब्लिश करने से पहले दोनों प्लेटफ़ॉर्मों का स्मोक-टेस्ट करता है
और `linux/amd64` पर ब्राउज़र पैरिटी की तुलना बनाए रखता है।

## एमसीपी रजिस्ट्री प्रकाशन

`mcp-registry` जॉब प्रकाशित करता है `server.json` को आधिकारिक रजिस्ट्री में इस पते पर प्रकाशित करता है:

```text
https://registry.modelcontextprotocol.io
```

सर्वर पब्लिशिंग स्थानीय `MCP Registry Publish` कम्पोजिट GitHub एक्शन, आधिकारिक `mcp-publisher` CLI, और GitHub Actions OIDC का उपयोग करता है। इस सर्वर को सूचीबद्ध करने के लिए `modelcontextprotocol/registry` पर पुल रिक्वेस्ट न खोलें; वह रिपॉजिटरी
स्पष्ट रूप से पैकेज लेखकों को `mcp-publisher` के साथ प्रकाशित करने की आवश्यकता है।

वर्कफ़्लो को ग्लामा, बिलिंग, एक गिटहब पीएटी, डीएनएस क्रेडेंशियल, या लंबे समय तक चलने वाले रजिस्ट्री सीक्रेट्स की आवश्यकता नहीं है। यह उपयोग करता है:

- GitHub OIDC प्रमाणीकरण के लिए `id-token: write`;
- `mcp-publisher login github-oidc`;
- मौजूदा GitHub नेमस्पेस `io.github.swimmwatch/cloakbrowser-mcp`;
- npm पैकेज स्वामित्व को साबित करने के लिए npm पैकेज `mcpName` का मान;
- OCI इमेज स्वामित्व को साबित करने के लिए Docker इमेज लेबल `io.modelcontextprotocol.server.name`।

MCP रजिस्ट्री की जॉब npm, Docker की तरह ही उसी GitHub रिलीज़ इवेंट से शुरू होती है,
और दस्तावेज़ीकरण प्रकाशन। यह `needs: [npm, docker]` घोषित करता है, इसलिए npm और
रजिस्ट्री प्रकाशन शुरू होने से पहले GHCR प्रकाशन पूरा हो जाना चाहिए। समग्र
यह क्रिया जानबूझकर रजिस्ट्री-केंद्रित है: यह `server.json` को स्थानीय रूप से मान्य करती है,
`mcp-publisher` के साथ इसकी वैधता जांचता है, यह जांचता है कि सटीक रजिस्ट्री संस्करण है या नहीं
पहले से दिखाई दे रहा है, `mcp-publisher login github-oidc` के साथ प्रमाणीकरण करता है, प्रकाशित करता है
सर्वर मेटाडेटा, और अंतिम रजिस्ट्री प्रविष्टि को सत्यापित करता है।

यदि अस्थायी रजिस्ट्री विफलता होती है, तो npm और Docker जॉब्स के ग्रीन होने के बाद, मूल रिलीज़ रन में असफल `mcp-registry` जॉब को फिर से चलाएँ। मैनुअल
`workflow_dispatch` ट्रिगर `Release` पर एक स्पष्ट टैग के साथ पूर्ण रिलीज़-पाइपलाइन रन के लिए है।

प्रकाशित रजिस्ट्री प्रविष्टि को निम्नलिखित के साथ सत्यापित करें:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

GitHub की `https://github.com/mcp` रजिस्ट्री एक अलग, चयनित खोज सतह है। आधिकारिक MCP रजिस्ट्री पर प्रकाशित करना आवश्यक है, लेकिन यह गिटहब के `/mcp` पेज पर तत्काल दृश्यता की गारंटी नहीं देता। `npm run registry:check` को आधिकारिक रजिस्ट्री, npm, GHCR, डॉकर हब, और गिटहब MCP दृश्यता के लिए एक सर्वोत्तम प्रयास जांच उपकरण के रूप में मानें। `npm run registry:check:` का उपयोग केवल तब करें जब GitHub MCP दृश्यता एक कठोर गेट बन जाना चाहिए।

## ग्लैमा डायरेक्टरी चेकलिस्ट

ग्लामा डायरेक्टरी स्कोरिंग, गिटहब रिलीज़ और आधिकारिक MCP रजिस्ट्री प्रकाशन से अलग है। रिपॉजिटरी में `glama.json` शामिल है ताकि
`swimmwatch` मेंटेनर खाता Glama में स्वामित्व का दावा या पुष्टि कर सकता है।

स्थिर रिलीज़ प्रकाशित करने से पहले, निःशुल्क ग्लामा चेकलिस्ट पूरी करें:

- `glama.json` के बाद ग्लामा MCP सर्वर एडमिन इंटरफ़ेस से सर्वर को सिंक करें
  के साथ विलय किया गया है `main`;
- खोलें
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile`;
- इस रिपॉजिटरी Dockerfile को बनाने और अतिरिक्त सीक्रेट्स के बिना मौजूदा
  stdio एंट्रीपॉइंट को शुरू करने के लिए Glama को कॉन्फ़िगर करें;
- रनटाइम को CloakBrowser डिफ़ॉल्ट के साथ संगत रखें: `cloak` ब्राउज़र
  इंजन, हेडलेस मोड, stdout आउटपुट, और `/data` आर्टिफैक्ट स्टोरेज;
- Deploy पर क्लिक करें और बिल्ड टेस्ट के पास होने तक प्रतीक्षा करें;
- GitHub रिलीज़ के समान संस्करण के साथ एक Glama रिलीज़ बनाएँ और प्रकाशित करें, उदाहरण के लिए `1.2.7`;
- प्रारंभिक उपयोग शुरू करने के लिए रिलीज़ के बाद एक बार Glama "ब्राउज़र में आज़माएँ" फ़ीचर का उपयोग करें;
- संबंधित सर्वरों को मैन्युअल रूप से जोड़ें, कम से कम आधिकारिक Playwright MCP सर्वर,
  और वैकल्पिक रूप से निकट-संबंधित ब्राउज़र ऑटोमेशन विकल्प।

केवल डायरेक्टरी स्कोर को बेहतर बनाने के लिए बिलिंग विधि या सशुल्क ग्लैमा होस्टिंग न जोड़ें। यदि ग्लैमा को किसी आवश्यक चेकलिस्ट आइटम के लिए बिलिंग की आवश्यकता होती है, तो उसे एक रिलीज़ ब्लॉकर मानें जिसके लिए एक स्पष्ट मेंटेनर निर्णय की आवश्यकता होती है।

## सुरक्षा वर्कफ़्लो

रिपॉजिटरी मुफ्त सुरक्षा उपकरणों का उपयोग करती है:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / releases | `npm audit --omit=dev --audit-level=high` | CI and release checks | No external account or token. |

एक्शन SHA पिनिंग को एक भविष्य के हार्डनिंग पास के रूप में ट्रैक किया जाता है। वर्तमान वर्कफ़्लो संस्करणित एक्शन संदर्भों का उपयोग करते हैं ताकि अपडेट प्रबंधनीय बने रहें, जब तक कि रिलीज़ इंफ्रास्ट्रक्चर अभी भी नया है।

## दस्तावेज़ीकरण प्रकाशन

`docs-build` और `docs-deploy` जॉब्स नेटिव GitHub पेज एक्शंस डिप्लॉयमेंट फ्लो के साथ MkDocs को डिप्लॉय करते हैं। रिपॉजिटरी पेज सेटिंग्स को स्रोत के रूप में `GitHub Actions` का उपयोग करना चाहिए।

यह वर्कफ़्लो सख्त मोड में दस्तावेज़ तैयार करता है, उत्पन्न `site/` अपलोड करता है
निर्देशिका में `actions/upload-pages-artifact` के साथ, और इसे के साथ तैनात करता है
`actions/deploy-pages` को `github-pages` वातावरण में तैनात करता है।

डॉक्यूमेंटेशन पब्लिशिंग भी MkDocs बिल्ड के बाद SEO वैलिडेटर चलाता है।
वैकल्पिक वेबमास्टर वेरिफिकेशन टोकन आधिकारिक मुफ्त वेबमास्टर टूल्स का उपयोग करते हैं और इन्हें रिपॉजिटरी वेरिएबल्स या सीक्रेट्स के रूप में प्रदान किया जा सकता है:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

वैकल्पिक IndexNow सूचनाओं के लिए `INDEXNOW_KEY` नामक एक रिपॉजिटरी सीक्रेट की आवश्यकता होती है। जब इसे सेट किया जाता है, तो वर्कफ़्लो आवश्यक की फ़ाइल को प्रकाशित करता है और GitHub Pages परिनियोजन के बाद उत्पन्न साइटमैप URL सबमिट करता है।

बिना एक अलग स्पष्ट निर्णय के, दस्तावेज़ीकरण रिलीज़ प्रवाह में सशुल्क इंडेक्सिंग सेवाएँ, विज्ञापन उत्पाद, या तृतीय-पक्ष एनालिटिक्स न जोड़ें।

## अपस्ट्रीम निगरानी

अपस्ट्रीम मॉनिटर वर्कफ़्लो प्रतिदिन चलता है और इसे GitHub Actions से मैन्युअल रूप से भी शुरू किया जा सकता है। यह दोनों अपस्ट्रीम Playwright MCP वितरण चैनलों की जाँच करता है:

- npm पैकेज: `@playwright/mcp`;
- Docker इमेज: `mcr.microsoft.com/playwright/mcp`.

जब एक नया अपस्ट्रीम संस्करण पता चलता है, तो वर्कफ़्लो `swimmwatch` को सौंपा गया एक GitHub इश्यू बनाता है। इस इश्यू में वर्तमान और नवीनतम npm/Docker
वर्तमान और नवीनतम npm/Docker संस्करण, `microsoft/playwright-mcp` से एक संक्षिप्त रिलीज़-नोट्स सारांश, और पूर्ण अपस्ट्रीम चेंजलॉग, npm पैकेज, और Docker टैग के लिंक शामिल हैं।

स्थानीय रूप से निम्नलिखित के साथ वही जाँच चलाएँ:

```bash
npm run upstream:check
```

## रिलीज़ टैग

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## चेकलिस्ट

रिलीज़ प्रकाशित करने से पहले:

- केवल `Actionlint` और `CI` के हरे होने के बाद ही मर्ज करें।
- `v1.2.7` जैसे टैग से GitHub रिलीज़ बनाएँ।
- `next` npm संस्करण प्रकाशित करते समय रिलीज़ को prerelease के रूप में चिह्नित करें।
- पुष्टि करें कि `release.yml` के लिए npm Trusted Publisher कॉन्फ़िगर किया गया है और
  `npm-production`.
- पुष्टि करें `npm-production`, `docker-production`, `github-pages`, और
  `mcp-registry-production` वातावरण मौजूद हैं।
- यदि SARIF अपलोड दृश्यता की आवश्यकता है तो GitHub कोड स्कैनिंग सक्षम है या नहीं, इसकी पुष्टि करें।
- पहली Docker प्रकाशित होने के बाद GHCR पैकेज दृश्यता सार्वजनिक है या नहीं, इसकी पुष्टि करें।
- पुष्टि करें कि Glama सर्वर सिंक हो गया है, Dockerfile एडमिन पेज के माध्यम से उसका परीक्षण किया गया है, और उसी स्थिर संस्करण के साथ जारी किया गया है।

`SUPPORT.md` को जानबूझकर तब तक के लिए स्थगित कर दिया गया है, जब तक कि परियोजना के पास GitHub मुद्दों और सुरक्षा सलाहकारों से परे एक स्थिर समर्थन नीति नहीं हो जाती।
