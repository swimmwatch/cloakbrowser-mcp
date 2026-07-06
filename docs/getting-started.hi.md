---
description: npm या Docker से CloakBrowser MCP इंस्टॉल करें और चलाएँ।
icon: material/rocket-launch
tags:
  - User Guide
---

# आरंभ करना

प्रकाशित npm पैकेज या Docker इमेज का उपयोग करें। स्रोत से इंस्टॉल करना केवल विकास के लिए आवश्यक है।

जब आपका MCP क्लाइंट पहले से ही आपकी मशीन पर चल रहा हो और Node.js उपलब्ध हो, तो npm चुनें। जब आप एक पुनरावृत्ति योग्य रनटाइम चाहते हों, जिसमें अपस्ट्रीम Playwright MCP बेस इमेज और CloakBrowser कैश कंटेनर के अंदर तैयार हो, तो Docker चुनें।

सामान्य सेटअप प्रश्नों का त्वरित अवलोकन के लिए, [FAQ](faq.md) देखें।

एनपीएम

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

जब पुनरुत्पादनशीलता मायने रखती है, तो रिलीज़ को पिन करें:

```bash
npx -y {{ project.npm_pin }}
```

इस npm पैकेज के लिए Node.js 22.12 या उससे नया संस्करण आवश्यक है। CloakBrowser पहली बार उपयोग करने पर अपना Chromium बाइनरी डाउनलोड करता है, जब तक कि वह पहले से कैश न किया गया हो।

क्लाइंट को कनेक्ट करने से पहले स्थानीय Node.js रनटाइम, पैकेज मेटाडेटा, अपस्ट्रीम Playwright MCP CLI रिज़ॉल्यूशन, और CloakBrowser बाइनरी मेटाडेटा सत्यापित करने के लिए `doctor` का उपयोग करें। यह कमांड ब्रिज शुरू नहीं करता है और न ही ब्राउज़र डाउनलोड करता है।

The default transport is stdio. Use `--transport streamable-http` when your MCP client connects to an HTTP endpoint instead of spawning a stdio process. The HTTP endpoint defaults to `http://127.0.0.1:3000/mcp`, with fixed `GET /healthz` and `GET /readyz` probes on the same host and port. Use `--http-protocol https` with `--https-cert` and `--https-key` or `--https-pfx` when the bridge should terminate TLS directly.
पूर्ण फ़्लैग सूची और संबंधित पर्यावरण चरों के लिए उत्पन्न [CLI संदर्भ](generated/cli.md) देखें।

## डॉकर

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker सबसे पुनरुत्पादनीय रनटाइम है क्योंकि इमेज पिन किए गए आधिकारिक Playwright MCP इमेज पर आधारित है और इसमें तैयार CloakBrowser ब्राउज़र कैश शामिल है। प्रकाशित छवियाँ `linux/amd64` और `linux/arm64` का समर्थन करती हैं।
इसी टैग्स को `ghcr.io/swimmwatch/cloakbrowser-mcp` पर भी प्रकाशित किया गया है।

Docker के साथ स्थानीय Streamable HTTP के लिए, पोर्ट को लूपबैक पर प्रकाशित करें और कंटेनर के अंदर सर्वर को बाइंड करें:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Docker से सीधे HTTPS के लिए, अपने प्रमाणपत्र फ़ाइलों को माउंट करें और HTTPS चुनें:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Streamable HTTP मोड सुनने वाले MCP एंडपॉइंट URL और अनुरोध लॉग्स को stdout में लिखता है। Stdio मोड नियमित परिचालन लॉग्स उत्सर्जित नहीं करता, इसलिए MCP JSON-RPC stdout प्रोटोकॉल-स्वच्छ रहता है।

जब पुनरुत्पादनशीलता मायने रखती है, तो रिलीज़ को पिन करें:

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## एमसीपी क्लाइंट कॉन्फ़िग

अधिकांश स्थानीय MCP क्लाइंट्स stdio और npm के साथ सबसे अच्छा काम करते हैं:

```bash
npx -y cloakbrowser-mcp@latest
```

जब आप एक दोहराने योग्य रनटाइम चाहते हैं तो Docker का उपयोग करें। `-i` रखें ताकि stdio जुड़ा रहे और `--init` ताकि ब्राउज़र की चाइल्ड प्रक्रियाओं को सही ढंग से समाप्त किया जा सके।

स्ट्रीमएबल HTTP क्लाइंट्स के लिए, सर्वर को अलग से शुरू करें और क्लाइंट URL को `http://127.0.0.1:3000/mcp` या `https://127.0.0.1:3000/mcp`. यदि `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` या `--http-auth-token` सेट है, तो वही बेयरर टोकन `/mcp` को भेजें, `/healthz`, और `/readyz`.

कोडेक्स सीएलआई

    स्थानीय stdio सर्वर को पंजीकृत करें:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    या Codex को पहले से चल रहे Streamable HTTP सर्वर से कनेक्ट करें:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

क्लॉड कोड

    स्थानीय stdio सर्वर को पंजीकृत करें:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    या Claude Code को पहले से चल रहे Streamable HTTP सर्वर से कनेक्ट करें:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

क्लॉड डेस्कटॉप

    सर्वर को `mcpServers` के अंतर्गत `claude_desktop_config.json` में जोड़ें, फिर Claude Desktop को पुनः आरंभ करें:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== "कर्सर / क्लाइन"

    सर्वर को क्लाइंट की MCP JSON कॉन्फ़िगरेशन में जोड़ें:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== "वीएस कोड"

    वर्कस्पेस में सर्वर जोड़ें `.vscode/mcp.json` या अपने यूज़र-लेवल `mcp.json`:

    ```json
    {
      "servers": {
        "cloakbrowser": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== "जारी रखें"

    `.continue/mcpServers/cloakbrowser-mcp.yaml` बनाएँ:

    ```yaml
    name: CloakBrowser MCP
    version: 0.0.1
    schema: v1
    mcpServers:
      - name: CloakBrowser
        type: stdio
        command: npx
        args:
          - -y
          - cloakbrowser-mcp@latest
    ```

विंडसर्फ / कैस्केड

    विंडसर्फ में, सेटिंग्स > टूल्स > विंडसर्फ सेटिंग्स > सर्वर जोड़ें खोलें, या `~/.codeium/mcp_config.json` संपादित करें:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    पहले से चल रहे Streamable HTTP सर्वर के लिए, `serverUrl` का उपयोग करें:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== "हंस"

    एक कस्टम MCP एक्सटेंशन जोड़ें और इस कमांड का उपयोग करें:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    एक्सटेंशन नाम के लिए `cloakbrowser` और ट्रांसपोर्ट के लिए stdio का उपयोग करें।

विकृति

    Warp में, सेटिंग्स > एजेंट्स > MCP सर्वर खोलें, Add चुनें, फिर पेस्ट करें:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    पहले से चल रहे Streamable HTTP सर्वर के लिए, URL प्रविष्टि का उपयोग करें:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

डॉकर

    जब आपका क्लाइंट एक स्थानीय Docker कमांड चला सकता है, तब इसका उपयोग करें:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "docker",
          "args": [
            "run",
            "--rm",
            "--init",
            "-i",
            "-v",
            "/tmp/cloakbrowser-artifacts:/data",
            "swimmwatch/cloakbrowser-mcp:latest"
          ]
        }
      }
    }
    ```

सत्यापित करें

MCP क्लाइंट से टूल्स की सूची मांगें। आपको अपस्ट्रीम Playwright MCP ब्राउज़र टूल्स के साथ-साथ निम्नलिखित भी दिखेंगे:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## अतिरिक्त व्यावहारिक रास्ते

upstream Playwright MCP और इस package में चुनने के लिए [तुलना](comparison.md) देखें। तेज tasks के लिए [रेसिपी](recipes/index.md) उपयोग करें: persistent profile, extensions, reverse proxy, regional QA, Claude Desktop, Codex CLI और CI smoke test.
