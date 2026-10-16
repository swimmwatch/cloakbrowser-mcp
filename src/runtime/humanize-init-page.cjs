'use strict';
const humanizedBrowserMarker = Symbol.for('io.github.swimmwatch.cloakbrowser-mcp.humanizedBrowser');
const humanizedContextMarker = Symbol.for('io.github.swimmwatch.cloakbrowser-mcp.humanizedContext');
const defaultDependencies = {
  prepareHumanize: async () => {
    const { registerHumanizeCompatibility } = await import('./humanizeCompatibility.js');
    registerHumanizeCompatibility();
  },
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
      await dependencies.prepareHumanize?.();
      const { humanizeBrowser } = await dependencies.loadCloakBrowser();
      await (() => {
        const humanizeBrowserOptions = { humanize: true, humanPreset: preset };
        return humanizeBrowser(browser, humanizeBrowserOptions);
      })();
      markHumanized(browser, humanizedBrowserMarker);
      return;
    }
    if (context[humanizedContextMarker]) return;
    await dependencies.prepareHumanize?.();
    const { patchContext, resolveConfig } = await dependencies.loadCloakHuman();
    const resolveConfigResult = resolveConfig(preset);
    patchContext(context, resolveConfigResult);
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
  const definePropertyOptions = {
    value: true,
    configurable: false,
  };
  Object.defineProperty(target, marker, definePropertyOptions);
}
module.exports = {
  default: createHumanizeInitPage(),
  _createHumanizeInitPageForTest: createHumanizeInitPage,
};
