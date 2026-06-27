#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';

const docsDir = join(process.cwd(), 'docs');
const manifestPath = join(docsDir, 'data', 'translation-manifest.json');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const refreshManifestOnly = args.has('--refresh-manifest');
const sourceLanguage = 'en';

const locales = [
  { locale: 'ru', name: 'Русский', deeplTarget: 'RU' },
  { locale: 'be', name: 'Беларуская', deeplTarget: 'BE' },
  { locale: 'uk', name: 'Українська', deeplTarget: 'UK' },
  { locale: 'es', name: 'Español', deeplTarget: 'ES' },
  { locale: 'pt-BR', name: 'Português (Brasil)', deeplTarget: 'PT-BR' },
  { locale: 'zh', name: '简体中文', deeplTarget: 'ZH' },
  { locale: 'ja', name: '日本語', deeplTarget: 'JA' },
  { locale: 'de', name: 'Deutsch', deeplTarget: 'DE' },
  { locale: 'fr', name: 'Français', deeplTarget: 'FR' },
  { locale: 'hi', name: 'हिन्दी', deeplTarget: 'HI' },
];

const localeSuffixes = new Set(locales.map(({ locale }) => locale));
const excludedDirectories = new Set(['assets', 'data', 'generated', 'hooks', 'overrides']);
const excludedFiles = new Set(['dockerhub-readme.md']);

const invalidLocalizedContentPatterns = [
  /Translation failed:/u,
  /Quota for this billing period has been exceeded/u,
  /<clb-keep\b/u,
];

const knownUntranslatedPhrases = [
  'Bridge runtime',
  'CloakBrowser execution',
  'Docker image',
  'GeoIP proxy matching',
  'Humanized input behavior',
  'Get started',
  'Form QA',
  'Checkout flows',
  'Interaction-sensitive UI checks',
  'Scroll-heavy pages',
  'Demos and recordings',
  '| Area | Behavior |',
  'Uses process-level environment variables and CLI flags only.',
  'Uses process-level environment variables and CLI flags when no runtime metadata is provided.',
  'Compared in CI',
];

const localizedPhraseReplacements = {
  ru: {
    'Get started': 'Начать',
    Tools: 'Инструменты',
    'Bridge runtime': 'Среда выполнения моста',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'Запускает вышестоящий Playwright MCP как дочерний процесс и пересылает вызовы браузерных инструментов без изменений.',
    'CloakBrowser execution': 'Запуск CloakBrowser',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      'Создает конфигурацию Playwright MCP, где `launchOptions.executablePath` указывает на CloakBrowser.',
    'npm CLI': 'CLI npm',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'Поставляется как тонкий CLI-пакет Node.js для клиентов MCP через stdio и Streamable HTTP.',
    'Docker image': 'Образ Docker',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'Основан на официальном образе Playwright MCP и предварительно загружает кэш бинарного файла CloakBrowser.',
    'GeoIP proxy matching': 'Сопоставление GeoIP прокси',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'Согласует часовой пояс, язык и локаль отпечатка CloakBrowser с настроенным местоположением прокси.',
    'Humanized input behavior': 'Человекообразное поведение ввода',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'Направляет взаимодействия со страницей через слой CloakBrowser для человекоподобной работы мыши, клавиатуры и прокрутки.',
    'Form QA': 'QA форм',
    'Checkout flows': 'Сценарии оформления заказа',
    'Interaction-sensitive UI checks': 'Проверки UI, чувствительного к взаимодействию',
    'Scroll-heavy pages': 'Страницы с активной прокруткой',
    'Demos and recordings': 'Демонстрации и записи',
    '| Area | Behavior |': '| Область | Поведение |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | Использует только переменные среды и флаги CLI уровня процесса. |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Значение по умолчанию Streamable HTTP | Использует переменные среды и флаги CLI уровня процесса, если метаданные времени выполнения не переданы. |',
    'Compared in CI': 'Сравнивается в CI',
  },
  be: {
    'Get started': 'Пачаць',
    Tools: 'Інструменты',
    'Bridge runtime': 'Асяроддзе выканання моста',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'Запускае вышэйстаячы Playwright MCP як даччыны працэс і перасылае выклікі браузерных інструментаў без змен.',
    'CloakBrowser execution': 'Запуск CloakBrowser',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      'Стварае канфігурацыю Playwright MCP, дзе `launchOptions.executablePath` указвае на CloakBrowser.',
    'npm CLI': 'CLI npm',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'Пастаўляецца як лёгкі CLI-пакет Node.js для MCP-кліентаў stdio і Streamable HTTP.',
    'Docker image': 'Вобраз Docker',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'Заснаваны на афіцыйным вобразе Playwright MCP і папярэдне загружае кэш бінарнага файла CloakBrowser.',
    'GeoIP proxy matching': 'Супастаўленне GeoIP проксі',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'Узгадняе часавы пояс, мову і лакальныя параметры адбітка CloakBrowser з наладжаным месцазнаходжаннем проксі.',
    'Humanized input behavior': 'Чалавекападобныя паводзіны ўводу',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'Накіроўвае ўзаемадзеянні са старонкай праз слой CloakBrowser для чалавекападобнай працы мышы, клавіятуры і пракруткі.',
    'Form QA': 'QA форм',
    'Checkout flows': 'Сцэнарыі афармлення замовы',
    'Interaction-sensitive UI checks': 'Праверкі UI, адчувальнага да ўзаемадзеяння',
    'Scroll-heavy pages': 'Старонкі з актыўнай пракруткай',
    'Demos and recordings': 'Дэманстрацыі і запісы',
    '| Area | Behavior |': '| Вобласць | Паводзіны |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | Выкарыстоўвае толькі зменныя асяроддзя і флагі CLI на ўзроўні працэсу. |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Значэнне па змаўчанні Streamable HTTP | Выкарыстоўвае зменныя асяроддзя і флагі CLI на ўзроўні працэсу, калі метаданыя часу выканання не перададзены. |',
    'Compared in CI': 'Параўноўваецца ў CI',
  },
  uk: {
    'Get started': 'Почати',
    Tools: 'Інструменти',
    'Bridge runtime': 'Середовище виконання моста',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'Запускає вищий Playwright MCP як дочірній процес і пересилає виклики браузерних інструментів без змін.',
    'CloakBrowser execution': 'Запуск CloakBrowser',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      'Створює конфігурацію Playwright MCP, де `launchOptions.executablePath` вказує на CloakBrowser.',
    'npm CLI': 'CLI npm',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'Постачається як тонкий CLI-пакет Node.js для MCP-клієнтів stdio і Streamable HTTP.',
    'Docker image': 'Образ Docker',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'Базується на офіційному образі Playwright MCP і попередньо завантажує кеш бінарного файлу CloakBrowser.',
    'GeoIP proxy matching': 'Зіставлення GeoIP проксі',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'Узгоджує часовий пояс, мову та локаль відбитка CloakBrowser із налаштованим розташуванням проксі.',
    'Humanized input behavior': 'Людиноподібна поведінка введення',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'Спрямовує взаємодії зі сторінкою через шар CloakBrowser для людиноподібної роботи миші, клавіатури й прокручування.',
    'Form QA': 'QA форм',
    'Checkout flows': 'Сценарії оформлення замовлення',
    'Interaction-sensitive UI checks': 'Перевірки UI, чутливого до взаємодії',
    'Scroll-heavy pages': 'Сторінки з активним прокручуванням',
    'Demos and recordings': 'Демонстрації та записи',
    '| Area | Behavior |': '| Область | Поведінка |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | Використовує лише змінні середовища та прапорці CLI рівня процесу. |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Типове значення Streamable HTTP | Використовує змінні середовища та прапорці CLI рівня процесу, якщо метадані часу виконання не передано. |',
    'Compared in CI': 'Порівнюється в CI',
  },
  es: {
    'Get started': 'Primeros pasos',
    Tools: 'Herramientas',
    'Bridge runtime': 'Ejecución del puente',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'Inicia Playwright MCP de origen como proceso hijo y reenvía sin cambios las llamadas a las herramientas del navegador.',
    'CloakBrowser execution': 'Ejecución de CloakBrowser',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      'Genera una configuración de Playwright MCP con `launchOptions.executablePath` apuntando a CloakBrowser.',
    'npm CLI': 'CLI de npm',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'Se publica como un paquete CLI ligero de Node.js para clientes MCP por stdio y Streamable HTTP.',
    'Docker image': 'Imagen Docker',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'Se basa en la imagen oficial de Playwright MCP y precarga la caché del binario de CloakBrowser.',
    'GeoIP proxy matching': 'Coincidencia GeoIP del proxy',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'Alinea la zona horaria, el idioma y la configuración regional de la huella de CloakBrowser con la ubicación del proxy configurado.',
    'Humanized input behavior': 'Comportamiento de entrada humanizado',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'Dirige las interacciones de la página mediante la capa de ratón, teclado y desplazamiento de CloakBrowser con comportamiento similar al humano.',
    'Form QA': 'QA de formularios',
    'Checkout flows': 'Flujos de compra',
    'Interaction-sensitive UI checks': 'Comprobaciones de UI sensibles a la interacción',
    'Scroll-heavy pages': 'Páginas con mucho desplazamiento',
    'Demos and recordings': 'Demos y grabaciones',
    '| Area | Behavior |': '| Área | Comportamiento |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | Usa solo variables de entorno y flags de CLI a nivel de proceso. |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Valor predeterminado de Streamable HTTP | Usa variables de entorno y flags de CLI a nivel de proceso cuando no se proporcionan metadatos en tiempo de ejecución. |',
    'Compared in CI': 'Comparado en CI',
  },
  'pt-BR': {
    'Get started': 'Primeiros passos',
    Tools: 'Ferramentas',
    'Bridge runtime': 'Runtime da ponte',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'Inicia o Playwright MCP upstream como um processo filho e encaminha as chamadas das ferramentas do navegador sem alterações.',
    'CloakBrowser execution': 'Execução do CloakBrowser',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      'Gera uma configuração do Playwright MCP com `launchOptions.executablePath` apontando para o CloakBrowser.',
    'npm CLI': 'CLI npm',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'Publicado como um pacote CLI leve em Node.js para clientes MCP via stdio e Streamable HTTP.',
    'Docker image': 'Imagem Docker',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'Baseado na imagem oficial do Playwright MCP e com pré-carregamento do cache do binário do CloakBrowser.',
    'GeoIP proxy matching': 'Correspondência GeoIP do proxy',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'Alinha o fuso horário, o idioma e a localidade da impressão digital do CloakBrowser com o local do proxy configurado.',
    'Humanized input behavior': 'Comportamento de entrada humanizado',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'Encaminha as interações da página pela camada de mouse, teclado e rolagem humanizada do CloakBrowser.',
    'Form QA': 'QA de formulários',
    'Checkout flows': 'Fluxos de checkout',
    'Interaction-sensitive UI checks': 'Verificações de UI sensíveis à interação',
    'Scroll-heavy pages': 'Páginas com muita rolagem',
    'Demos and recordings': 'Demonstrações e gravações',
    '| Area | Behavior |': '| Área | Comportamento |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | Usa apenas variáveis de ambiente e flags de CLI no nível do processo. |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Padrão de Streamable HTTP | Usa variáveis de ambiente e flags de CLI no nível do processo quando nenhum metadado de runtime é fornecido. |',
    'Compared in CI': 'Comparado no CI',
  },
  zh: {
    'Get started': '快速开始',
    Tools: '工具',
    'Bridge runtime': '桥接运行时',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      '将上游 Playwright MCP 作为子进程启动，并原样转发浏览器工具调用。',
    'CloakBrowser execution': 'CloakBrowser 执行',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      '生成 Playwright MCP 配置，并将 `launchOptions.executablePath` 指向 CloakBrowser。',
    'npm CLI': 'npm CLI',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      '作为轻量级 Node.js CLI 包发布，适用于 stdio 和 Streamable HTTP MCP 客户端。',
    'Docker image': 'Docker 镜像',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      '基于官方 Playwright MCP 镜像，并预加载 CloakBrowser 二进制缓存。',
    'GeoIP proxy matching': 'GeoIP 代理匹配',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      '将 CloakBrowser 的时区、语言和区域指纹标志与配置的代理位置对齐。',
    'Humanized input behavior': '人性化输入行为',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      '通过 CloakBrowser 类人的鼠标、键盘和滚动层处理页面交互。',
    'Form QA': '表单 QA',
    'Checkout flows': '结账流程',
    'Interaction-sensitive UI checks': '交互敏感 UI 检查',
    'Scroll-heavy pages': '滚动密集页面',
    'Demos and recordings': '演示和录制',
    '| Area | Behavior |': '| 范围 | 行为 |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | 仅使用进程级环境变量和 CLI 标志。 |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Streamable HTTP 默认值 | 未提供运行时元数据时，使用进程级环境变量和 CLI 标志。 |',
    'Compared in CI': '在 CI 中比较',
  },
  ja: {
    'Get started': 'はじめに',
    Tools: 'ツール',
    'Bridge runtime': 'ブリッジランタイム',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      '上流の Playwright MCP を子プロセスとして起動し、ブラウザーツール呼び出しを変更せずに転送します。',
    'CloakBrowser execution': 'CloakBrowser の実行',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      '`launchOptions.executablePath` を CloakBrowser に設定した Playwright MCP 設定を生成します。',
    'npm CLI': 'npm CLI',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'stdio と Streamable HTTP MCP クライアント向けの薄い Node.js CLI パッケージとして公開されています。',
    'Docker image': 'Docker イメージ',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      '公式 Playwright MCP イメージをベースにし、CloakBrowser バイナリキャッシュを事前に読み込みます。',
    'GeoIP proxy matching': 'GeoIP プロキシ照合',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'CloakBrowser のタイムゾーン、言語、ロケールのフィンガープリントフラグを、設定されたプロキシの場所に合わせます。',
    'Humanized input behavior': '人間らしい入力動作',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'CloakBrowser の人間らしいマウス、キーボード、スクロールレイヤーを通じてページ操作を処理します。',
    'Form QA': 'フォーム QA',
    'Checkout flows': 'チェックアウトフロー',
    'Interaction-sensitive UI checks': '操作に敏感な UI チェック',
    'Scroll-heavy pages': 'スクロール中心のページ',
    'Demos and recordings': 'デモと録画',
    '| Area | Behavior |': '| 領域 | 動作 |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | プロセスレベルの環境変数と CLI フラグのみを使用します。 |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Streamable HTTP のデフォルト | 実行時メタデータが指定されていない場合、プロセスレベルの環境変数と CLI フラグを使用します。 |',
    'Compared in CI': 'CI で比較済み',
  },
  de: {
    'Get started': 'Erste Schritte',
    Tools: 'Werkzeuge',
    'Bridge runtime': 'Bridge-Laufzeit',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'Startet das upstream Playwright MCP als Kindprozess und leitet Browser-Tool-Aufrufe unverändert weiter.',
    'CloakBrowser execution': 'CloakBrowser-Ausführung',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      'Erzeugt eine Playwright-MCP-Konfiguration, in der `launchOptions.executablePath` auf CloakBrowser gesetzt ist.',
    'npm CLI': 'npm-CLI',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'Wird als schlankes Node.js-CLI-Paket für stdio- und Streamable-HTTP-MCP-Clients veröffentlicht.',
    'Docker image': 'Docker-Image',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'Basiert auf dem offiziellen Playwright-MCP-Image und lädt den CloakBrowser-Binärcache vor.',
    'GeoIP proxy matching': 'GeoIP-Proxy-Abgleich',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'Gleicht Zeitzone, Sprache und Locale-Fingerprint-Flags von CloakBrowser mit dem konfigurierten Proxy-Standort ab.',
    'Humanized input behavior': 'Humanisiertes Eingabeverhalten',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'Leitet Seiteninteraktionen über die menschenähnliche Maus-, Tastatur- und Scroll-Ebene von CloakBrowser.',
    'Form QA': 'Formular-QA',
    'Checkout flows': 'Checkout-Abläufe',
    'Interaction-sensitive UI checks': 'Interaktionssensible UI-Prüfungen',
    'Scroll-heavy pages': 'Scroll-intensive Seiten',
    'Demos and recordings': 'Demos und Aufzeichnungen',
    '| Area | Behavior |': '| Bereich | Verhalten |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | Verwendet nur Umgebungsvariablen und CLI-Flags auf Prozessebene. |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Streamable-HTTP-Standard | Verwendet Umgebungsvariablen und CLI-Flags auf Prozessebene, wenn keine Laufzeitmetadaten angegeben sind. |',
    'Compared in CI': 'In CI verglichen',
  },
  fr: {
    'Get started': 'Premiers pas',
    Tools: 'Outils',
    'Bridge runtime': 'Runtime du pont',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'Démarre le Playwright MCP amont comme processus enfant et transmet les appels aux outils du navigateur sans modification.',
    'CloakBrowser execution': 'Exécution de CloakBrowser',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      'Génère une configuration Playwright MCP avec `launchOptions.executablePath` pointant vers CloakBrowser.',
    'npm CLI': 'CLI npm',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'Publié comme paquet CLI Node.js léger pour les clients MCP stdio et Streamable HTTP.',
    'Docker image': 'Image Docker',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'Basé sur l’image officielle Playwright MCP et précharge le cache du binaire CloakBrowser.',
    'GeoIP proxy matching': 'Correspondance GeoIP du proxy',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'Aligne le fuseau horaire, la langue et la locale de l’empreinte CloakBrowser sur l’emplacement du proxy configuré.',
    'Humanized input behavior': 'Comportement de saisie humanisé',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'Fait passer les interactions de page par la couche de souris, clavier et défilement humanisée de CloakBrowser.',
    'Form QA': 'QA des formulaires',
    'Checkout flows': 'Parcours de paiement',
    'Interaction-sensitive UI checks': 'Contrôles UI sensibles aux interactions',
    'Scroll-heavy pages': 'Pages riches en défilement',
    'Demos and recordings': 'Démonstrations et enregistrements',
    '| Area | Behavior |': '| Zone | Comportement |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | Utilise uniquement les variables d’environnement et les indicateurs CLI au niveau du processus. |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Valeur par défaut de Streamable HTTP | Utilise les variables d’environnement et les indicateurs CLI au niveau du processus lorsqu’aucune métadonnée d’exécution n’est fournie. |',
    'Compared in CI': 'Comparé dans CI',
  },
  hi: {
    'Get started': 'शुरू करें',
    Tools: 'टूल',
    'Bridge runtime': 'ब्रिज रनटाइम',
    'Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.':
      'अपस्ट्रीम Playwright MCP को चाइल्ड प्रोसेस के रूप में शुरू करता है और ब्राउज़र टूल कॉल को बिना बदले आगे भेजता है।',
    'CloakBrowser execution': 'CloakBrowser निष्पादन',
    'Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.':
      '`launchOptions.executablePath` को CloakBrowser पर सेट करके Playwright MCP कॉन्फ़िगरेशन बनाता है।',
    'npm CLI': 'npm CLI',
    'Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.':
      'stdio और Streamable HTTP MCP क्लाइंट के लिए हल्के Node.js CLI पैकेज के रूप में प्रकाशित है।',
    'Docker image': 'Docker इमेज',
    'Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.':
      'आधिकारिक Playwright MCP इमेज पर आधारित है और CloakBrowser बाइनरी कैश को पहले से लोड करता है।',
    'GeoIP proxy matching': 'GeoIP प्रॉक्सी मिलान',
    'Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.':
      'CloakBrowser के टाइमज़ोन, भाषा और लोकेल फिंगरप्रिंट फ़्लैग को कॉन्फ़िगर किए गए प्रॉक्सी स्थान से मिलाता है।',
    'Humanized input behavior': 'मानवीय इनपुट व्यवहार',
    "Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.":
      'पेज इंटरैक्शन को CloakBrowser की मानव-जैसी माउस, कीबोर्ड और स्क्रॉल परत से गुजारता है।',
    'Form QA': 'फ़ॉर्म QA',
    'Checkout flows': 'चेकआउट फ़्लो',
    'Interaction-sensitive UI checks': 'इंटरैक्शन-संवेदनशील UI जांच',
    'Scroll-heavy pages': 'अधिक स्क्रॉल वाली पेजें',
    'Demos and recordings': 'डेमो और रिकॉर्डिंग',
    '| Area | Behavior |': '| क्षेत्र | व्यवहार |',
    '| Stdio | Uses process-level environment variables and CLI flags only. |':
      '| Stdio | केवल प्रोसेस-स्तर के पर्यावरण चर और CLI फ़्लैग का उपयोग करता है। |',
    '| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |':
      '| Streamable HTTP डिफ़ॉल्ट | रनटाइम मेटाडेटा न दिए जाने पर प्रोसेस-स्तर के पर्यावरण चर और CLI फ़्लैग का उपयोग करता है। |',
    'Compared in CI': 'CI में तुलना की गई',
  },
};

async function main() {
  const sources = discoverEnglishDocs();
  const manifest = readManifest();

  if (refreshManifestOnly) {
    refreshManifest(manifest, sources);
    writeManifest(manifest);
    process.stderr.write('Refreshed documentation translation manifest.\n');
    return;
  }

  const stale = findStaleTranslations(sources, manifest);

  if (checkOnly) {
    if (stale.length > 0) {
      process.stderr.write('Documentation translations are missing or stale:\n');
      for (const item of stale) {
        process.stderr.write(`- ${item.sourceRel} -> ${item.locale}: ${item.reason}\n`);
      }
      process.exitCode = 1;
    } else {
      process.stderr.write('Documentation translations are current.\n');
    }
    return;
  }

  if (stale.length === 0) {
    process.stderr.write('Documentation translations are already current.\n');
    return;
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPL_API_KEY is required to update documentation translations.');
  }

  const client = new DeepLMcpClient(apiKey);
  await client.initialize();

  try {
    for (const item of stale) {
      const localeConfig = locales.find(({ locale }) => locale === item.locale);
      if (!localeConfig) {
        throw new Error(`Unsupported locale ${item.locale}`);
      }

      process.stderr.write(`Translating ${item.sourceRel} -> ${item.locale}\n`);
      const translated = postProcessLocalizedMarkdown(
        await translateMarkdown(item.sourceText, localeConfig.deeplTarget, client),
        item.locale,
      );
      const invalidReason = validateLocalizedMarkdown(translated, item.locale);
      if (invalidReason) {
        throw new Error(`Generated invalid translation for ${item.targetRel}: ${invalidReason}`);
      }

      mkdirSync(dirname(item.targetPath), { recursive: true });
      writeFileSync(item.targetPath, translated);
      const translationHash = sha256(translated);
      const sourceEntry = (manifest.sources[item.sourceRel] ??= {
        sourceHash: item.sourceHash,
        translations: {},
      });
      sourceEntry.sourceHash = item.sourceHash;
      sourceEntry.translations[item.locale] = {
        path: item.targetRel,
        sourceHash: item.sourceHash,
        translationHash,
        translator: 'deepl-mcp translate-text',
        updatedAt: new Date().toISOString(),
      };
    }
  } finally {
    client.close();
  }

  pruneManifest(manifest, sources);
  writeManifest(manifest);
  process.stderr.write(`Updated ${stale.length} documentation translation(s).\n`);
}

function discoverEnglishDocs() {
  const results = [];

  function visit(directory) {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      const stats = statSync(path);
      const rel = relative(docsDir, path).replaceAll('\\\\', '/');
      const parts = rel.split('/');

      if (stats.isDirectory()) {
        if (!excludedDirectories.has(entry)) {
          visit(path);
        }
        continue;
      }

      if (!entry.endsWith('.md') || excludedFiles.has(entry)) {
        continue;
      }

      if (isLocalizedMarkdown(entry)) {
        continue;
      }

      if (parts.some((part) => excludedDirectories.has(part))) {
        continue;
      }

      const sourceText = readFileSync(path, 'utf8');
      results.push({
        path,
        rel,
        sourceText,
        sourceHash: sha256(sourceText),
      });
    }
  }

  visit(docsDir);
  return results.sort((left, right) => left.rel.localeCompare(right.rel));
}

function isLocalizedMarkdown(fileName) {
  const match = fileName.match(/\.([^.]+(?:-[^.]+)?)\.md$/u);
  return Boolean(match && localeSuffixes.has(match[1]));
}

function readManifest() {
  if (!existsSync(manifestPath)) {
    return {
      version: 1,
      sourceLanguage,
      locales: Object.fromEntries(
        locales.map(({ locale, name, deeplTarget }) => [locale, { name, deeplTarget }]),
      ),
      sources: {},
    };
  }

  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function findStaleTranslations(sources, manifest) {
  const stale = [];

  for (const source of sources) {
    const sourceEntry = manifest.sources[source.rel];

    for (const localeConfig of locales) {
      const targetRel = localizedPath(source.rel, localeConfig.locale);
      const targetPath = join(docsDir, targetRel);
      const translationEntry = sourceEntry?.translations?.[localeConfig.locale];
      const targetExists = existsSync(targetPath);
      const targetText = targetExists ? readFileSync(targetPath, 'utf8') : undefined;
      const translationHash = targetText === undefined ? undefined : sha256(targetText);
      const invalidReason =
        targetText === undefined ? undefined : validateLocalizedMarkdown(targetText, localeConfig.locale);
      const expectedSourceHash = translationEntry?.sourceHash ?? sourceEntry?.sourceHash;
      let reason;

      if (!targetExists) {
        reason = 'missing localized file';
      } else if (!translationEntry) {
        reason = 'missing manifest entry';
      } else if (expectedSourceHash !== source.sourceHash) {
        reason = 'source changed';
      } else if (translationEntry.path !== targetRel) {
        reason = 'manifest path mismatch';
      } else if (invalidReason) {
        reason = invalidReason;
      } else if (translationEntry.translationHash !== translationHash) {
        reason = 'localized file changed without manifest update';
      }

      if (reason) {
        stale.push({
          locale: localeConfig.locale,
          reason,
          sourceRel: source.rel,
          sourceHash: source.sourceHash,
          sourceText: source.sourceText,
          targetPath,
          targetRel,
        });
      }
    }
  }

  return stale;
}

function pruneManifest(manifest, sources) {
  const sourceRels = new Set(sources.map(({ rel }) => rel));
  const localeCodes = new Set(locales.map(({ locale }) => locale));

  for (const sourceRel of Object.keys(manifest.sources)) {
    if (!sourceRels.has(sourceRel)) {
      delete manifest.sources[sourceRel];
      continue;
    }

    const translations = manifest.sources[sourceRel].translations ?? {};
    for (const locale of Object.keys(translations)) {
      if (!localeCodes.has(locale)) {
        delete translations[locale];
      }
    }
  }
}

function refreshManifest(manifest, sources) {
  for (const source of sources) {
    const sourceEntry = (manifest.sources[source.rel] ??= {
      sourceHash: source.sourceHash,
      translations: {},
    });
    sourceEntry.sourceHash = source.sourceHash;

    for (const { locale } of locales) {
      const targetRel = localizedPath(source.rel, locale);
      const targetPath = join(docsDir, targetRel);

      if (!existsSync(targetPath)) {
        throw new Error(`Cannot refresh manifest; missing ${targetRel}`);
      }

      const targetText = readFileSync(targetPath, 'utf8');
      const invalidReason = validateLocalizedMarkdown(targetText, locale);
      if (invalidReason) {
        throw new Error(`Cannot refresh manifest; ${targetRel}: ${invalidReason}`);
      }

      sourceEntry.translations[locale] = {
        path: targetRel,
        sourceHash: source.sourceHash,
        translationHash: sha256(targetText),
        translator: sourceEntry.translations[locale]?.translator ?? 'deepl-mcp translate-text',
        updatedAt: sourceEntry.translations[locale]?.updatedAt ?? new Date().toISOString(),
      };
    }
  }

  pruneManifest(manifest, sources);
}

function writeManifest(manifest) {
  manifest.version = 1;
  manifest.sourceLanguage = sourceLanguage;
  manifest.locales = Object.fromEntries(
    locales.map(({ locale, name, deeplTarget }) => [locale, { name, deeplTarget }]),
  );
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function localizedPath(sourceRel, locale) {
  return sourceRel.replace(/\.md$/u, `.${locale}.md`);
}

function postProcessLocalizedMarkdown(markdown, locale) {
  const replacements = localizedPhraseReplacements[locale];
  if (!replacements) {
    return markdown;
  }

  let result = markdown;
  for (const [source, replacement] of Object.entries(replacements)) {
    result = result.replaceAll(source, replacement);
  }

  return result;
}

function validateLocalizedMarkdown(markdown, locale) {
  for (const pattern of invalidLocalizedContentPatterns) {
    if (pattern.test(markdown)) {
      return `localized ${locale} content contains invalid marker ${pattern}`;
    }
  }

  const tripleFenceCount = markdown.match(/^```/gmu)?.length ?? 0;
  if (tripleFenceCount % 2 !== 0) {
    return `localized ${locale} content has unbalanced triple-backtick code fences`;
  }

  const tildeFenceCount = markdown.match(/^~~~/gmu)?.length ?? 0;
  if (tildeFenceCount % 2 !== 0) {
    return `localized ${locale} content has unbalanced tilde code fences`;
  }

  for (const phrase of knownUntranslatedPhrases) {
    if (markdown.includes(phrase)) {
      return `localized ${locale} content contains untranslated phrase "${phrase}"`;
    }
  }

  return undefined;
}

async function translateMarkdown(markdown, targetLanguage, client) {
  const protectedMarkdown = protectMarkdown(markdown);
  const translated = await translateProtectedMarkdown(protectedMarkdown.text, targetLanguage, client);
  return restoreMarkdown(translated, protectedMarkdown.placeholders);
}

async function translateProtectedMarkdown(markdown, targetLanguage, client) {
  const parts = markdown.split(/(\n{2,})/u);
  const translatedParts = [];

  for (const part of parts) {
    if (shouldTranslatePart(part)) {
      translatedParts.push(await translatePart(part, targetLanguage, client));
    } else {
      translatedParts.push(part);
    }
  }

  return translatedParts.join('');
}

async function translatePart(part, targetLanguage, client) {
  const translated = await client.translateText(part, targetLanguage);
  if (preservesPlaceholders(part, translated)) {
    return translated;
  }

  const lineParts = part.split(/(\n)/u);
  const translatedLineParts = [];

  for (const linePart of lineParts) {
    if (!shouldTranslatePart(linePart)) {
      translatedLineParts.push(linePart);
      continue;
    }

    const translatedLine = await client.translateText(linePart, targetLanguage);
    translatedLineParts.push(preservesPlaceholders(linePart, translatedLine) ? translatedLine : linePart);
  }

  return translatedLineParts.join('');
}

function preservesPlaceholders(source, translated) {
  for (const token of source.matchAll(/<clb-keep data-i="[0-9]+">CLB[0-9]+<\/clb-keep>/gu)) {
    if (!translated.includes(token[0])) {
      return false;
    }
  }

  return true;
}

function shouldTranslatePart(part) {
  if (part.trim() === '') {
    return false;
  }

  const withoutPlaceholders = part.replace(/<clb-keep data-i="[0-9]+">CLB[0-9]+<\/clb-keep>/gu, '');

  return /[A-Za-z]/u.test(withoutPlaceholders);
}

function protectMarkdown(markdown) {
  const placeholders = [];

  function protect(value) {
    if (value === '') {
      return value;
    }

    const id = String(placeholders.length).padStart(6, '0');
    const token = `<clb-keep data-i="${id}">CLB${id}</clb-keep>`;
    placeholders.push([token, value]);
    return token;
  }

  let text = markdown;

  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---\n', 4);
    if (end !== -1) {
      const frontmatter = text.slice(4, end);
      const body = text.slice(end + 5);
      const protectedFrontmatter = frontmatter
        .split('\n')
        .map((line) => {
          const match = line.match(/^([A-Za-z0-9_-]+):(\s*)(.*)$/u);
          if (match && (match[1] === 'title' || match[1] === 'description')) {
            return `${protect(`${match[1]}:${match[2]}`)}${match[3]}`;
          }

          return protect(line);
        })
        .join('\n');
      text = `${protect('---')}\n${protectedFrontmatter}\n${protect('---')}\n${body}`;
    }
  }

  text = protectBody(text, protect);
  return { text, placeholders };
}

function protectBody(text, protect) {
  return text
    .replace(/```[\s\S]*?```/gu, (value) => protect(value))
    .replace(/~~~[\s\S]*?~~~/gu, (value) => protect(value))
    .replace(/<!--[\s\S]*?-->/gu, (value) => protect(value))
    .replace(/^(?:\|.*\|\n?){2,}/gmu, (value) => protect(value))
    .replace(/<p\b[\s\S]*?<\/p>/giu, (value) => protect(value))
    .replace(/<div\b[\s\S]*?<\/div>/giu, (value) => protect(value))
    .replace(/`[^`\n]+`/gu, (value) => protect(value))
    .replace(/:[a-z0-9_/-]+:/giu, (value) => protect(value))
    .replace(/\]\(([^)\n]+)\)/gu, (_match, url) => `](${protect(url)})`)
    .replace(/https?:\/\/[^\s)>]+/giu, (value) => protect(value));
}

function restoreMarkdown(markdown, placeholders) {
  let restored = markdown;

  for (const [token, value] of placeholders.toReversed()) {
    if (!restored.includes(token)) {
      throw new Error(`DeepL response did not preserve placeholder ${token}`);
    }

    restored = restored.replaceAll(token, value);
  }

  return restored;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

class DeepLMcpClient {
  constructor(apiKey) {
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.stderr = '';
    this.child = spawn('npx', ['-y', 'deepl-mcp-server@latest'], {
      env: { ...process.env, DEEPL_API_KEY: apiKey },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout.on('data', (chunk) => this.handleStdout(chunk));
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk.toString();
    });
    this.child.on('exit', (code, signal) => {
      const error = new Error(`DeepL MCP server exited unexpectedly: code=${code} signal=${signal}`);
      for (const { reject } of this.pending.values()) {
        reject(error);
      }
      this.pending.clear();
    });
  }

  async initialize() {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'cloakbrowser-doc-translator', version: '0.0.0' },
    });
    this.notify('notifications/initialized', {});
  }

  async translateText(text, targetLanguage) {
    if (text.trim() === '') {
      return text;
    }

    const result = await this.request('tools/call', {
      name: 'translate-text',
      arguments: {
        text,
        sourceLangCode: sourceLanguage,
        targetLangCode: targetLanguage,
        formality: 'default',
      },
    });
    const content = result?.content;
    const translated = Array.isArray(content)
      ? content.find((item) => item?.type === 'text')?.text
      : undefined;

    if (typeof translated !== 'string') {
      throw new Error('DeepL MCP translate-text returned no translated text content.');
    }

    for (const pattern of invalidLocalizedContentPatterns) {
      if (pattern.test(translated)) {
        throw new Error(`DeepL MCP translate-text failed: ${translated}`);
      }
    }

    return translated;
  }

  request(method, params) {
    const id = this.nextId++;
    const message = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify(message)}\n`);
    });
  }

  notify(method, params) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  handleStdout(chunk) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim() || line.startsWith('DeepL MCP Server')) {
        continue;
      }

      const message = JSON.parse(line);
      const pending = this.pending.get(message.id);
      if (!pending) {
        continue;
      }

      this.pending.delete(message.id);

      if (message.error) {
        pending.reject(new Error(`DeepL MCP error: ${JSON.stringify(message.error)}`));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  close() {
    this.child.kill('SIGTERM');
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
