'use strict';

const humanizedBrowserMarker = Symbol.for('io.github.swimmwatch.cloakbrowser-mcp.humanizedBrowser');
const humanizedContextMarker = Symbol.for('io.github.swimmwatch.cloakbrowser-mcp.humanizedContext');

const defaultDependencies = {
  loadCloakBrowser: () => import('cloakbrowser'),
  loadCloakHuman: () => import('cloakbrowser/human'),
};

function createHumanizeInitPage(dependencies = defaultDependencies) {
  return async function cloakbrowserMcpHumanizeInitPage({ page }) {
    const context = page && typeof page.context === 'function' ? page.context() : undefined;
    if (!context) return;

    const preset = process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET || 'default';
    const browser = getContextBrowser(context);
    if (browser) {
      if (browser[humanizedBrowserMarker]) return;

      const { humanizeBrowser } = await dependencies.loadCloakBrowser();
      await humanizeBrowser(browser, { humanize: true, humanPreset: preset });
      markHumanized(browser, humanizedBrowserMarker);
      return;
    }

    if (context[humanizedContextMarker]) return;

    const { patchContext, resolveConfig } = await dependencies.loadCloakHuman();
    patchContext(context, resolveConfig(preset));
    markHumanized(context, humanizedContextMarker);
  };
}

function getContextBrowser(context) {
  if (typeof context.browser !== 'function') return undefined;
  try {
    return context.browser() || undefined;
  } catch {
    return undefined;
  }
}

function markHumanized(target, marker) {
  Object.defineProperty(target, marker, {
    value: true,
    configurable: false,
  });
}

module.exports = {
  default: createHumanizeInitPage(),
  _createHumanizeInitPageForTest: createHumanizeInitPage,
};
