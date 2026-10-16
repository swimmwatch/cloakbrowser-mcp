const config = {
  name: 'CloakBrowser MCP tests',
  plugins: {
    awesome: {
      options: { singleFile: false, reportLanguage: 'en', groupBy: ['feature', 'level', 'os', 'lane'] },
    },
  },
};

/**
 * Build trusted environment matchers from already validated result labels.
 * @param {{historyPath: string, singleFile: boolean, variants: Array<{id: string, name: string, labels: Array<{name: string, value: string}>}>}} options Validated generator options.
 * @returns {import('allure').AllureConfig} Trusted local configuration.
 */
export function createAllureConfig({ historyPath, singleFile, variants }) {
  const environments = Object.fromEntries(
    variants.map(({ id, name, labels }) => {
      /** @type {{name: string, matcher: (payload: {labels: Array<{name: string, value: string}>}) => boolean}} */
      const descriptor = {
        name,
        matcher: ({ labels: actual }) =>
          labels.every((label) =>
            actual.some((item) => item.name === label.name && item.value === label.value),
          ),
      };
      return [id, descriptor];
    }),
  );
  const options = { ...config.plugins.awesome.options, singleFile };
  const plugins = { awesome: { options } };
  return { ...config, plugins, historyPath, environments };
}
export default config;
