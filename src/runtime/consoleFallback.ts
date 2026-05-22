export const consoleFallbackInitScript = `(() => {
  const messages = [];
  Object.defineProperty(globalThis, '__cloakMcpConsoleMessages', {
    value: messages,
    configurable: true,
  });

  const methods = {
    debug: 'debug',
    error: 'error',
    info: 'info',
    log: 'log',
    warn: 'warning',
  };

  const formatValue = (value) => {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const sourceLocation = () => {
    const stack = new Error().stack ?? '';
    for (const line of stack.split('\\n')) {
      const match = /((?:https?|file):[^)\\s]+):(\\d+):(\\d+)/.exec(line);
      if (match) return { url: match[1], lineNumber: Math.max(Number(match[2]) - 1, 0) };
    }
    return { url: location.href, lineNumber: 0 };
  };

  for (const [method, type] of Object.entries(methods)) {
    const original = console[method]?.bind(console);
    if (!original) continue;
    console[method] = (...args) => {
      const entry = sourceLocation();
      messages.push({
        type,
        text: args.map(formatValue).join(' '),
        timestamp: Date.now(),
        url: entry.url,
        lineNumber: entry.lineNumber,
      });
      return original(...args);
    };
  }
})();`;

export function consoleFallbackPreloadScript(coreBundlePath: string): string {
  return `'use strict';

if (process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK !== 'false') {
  const { tools } = require(${JSON.stringify(coreBundlePath)});
  const originalCount = tools.Tab.prototype.consoleMessageCount;
  const originalMessages = tools.Tab.prototype.consoleMessages;
  const originalClear = tools.Tab.prototype.clearConsoleMessages;

  tools.Tab.prototype.consoleMessageCount = async function consoleMessageCount() {
    const nativeCount = await originalCount.call(this);
    if (nativeCount.total > 0) return nativeCount;
    if (hasModalState(this)) return nativeCount;
    const messages = await readMessages(this.page);
    return {
      total: messages.length,
      errors: messages.filter((message) => message.type === 'error').length,
      warnings: messages.filter((message) => message.type === 'warning').length,
    };
  };

  tools.Tab.prototype.consoleMessages = async function consoleMessages(level, all) {
    const nativeMessages = await originalMessages.call(this, level, all);
    if (nativeMessages.length > 0) return nativeMessages;
    if (hasModalState(this)) return nativeMessages;
    const messages = await readMessages(this.page);
    return messages.filter((message) => includesLevel(level, message.type)).map(toConsoleMessage);
  };

  tools.Tab.prototype.clearConsoleMessages = async function clearConsoleMessages() {
    await originalClear.call(this);
    await this.page
      .evaluate(() => {
        if (Array.isArray(globalThis.__cloakMcpConsoleMessages)) {
          globalThis.__cloakMcpConsoleMessages.length = 0;
        }
      })
      .catch(() => undefined);
  };
}

function hasModalState(tab) {
  return Array.isArray(tab._modalStates) && tab._modalStates.length > 0;
}

async function readMessages(page) {
  return page
    .evaluate(() => {
      const messages = globalThis.__cloakMcpConsoleMessages;
      return Array.isArray(messages) ? messages : [];
    })
    .catch(() => []);
}

function toConsoleMessage(message) {
  return {
    type: message.type,
    timestamp: message.timestamp,
    text: message.text,
    toString: () => \`[\${message.type.toUpperCase()}] \${message.text} @ \${message.url}:\${message.lineNumber}\`,
  };
}

function includesLevel(level, type) {
  const levels = ['error', 'warning', 'info', 'debug'];
  return levels.indexOf(levelForType(type)) <= levels.indexOf(level ?? 'info');
}

function levelForType(type) {
  if (type === 'error' || type === 'assert') return 'error';
  if (type === 'warning') return 'warning';
  if (type === 'debug') return 'debug';
  return 'info';
}
`;
}
