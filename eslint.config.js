// Flat config for ESLint v9.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { flatConfigs as importXFlatConfigs } from 'eslint-plugin-import-x';
import n from 'eslint-plugin-n';
import { configs as regexpConfigs } from 'eslint-plugin-regexp';
import vitest from 'eslint-plugin-vitest';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'artifacts/**', 'node_modules/**', '.venv-docs/**', 'site/**'],
  },
  js.configs.recommended,
  n.configs['flat/recommended-module'],
  importXFlatConfigs.recommended,
  regexpConfigs['flat/recommended'],
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Auto-discover the closest tsconfig for each linted file. Avoids the
        // "file not in project" error for top-level config files.
        projectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 40,
          allowDefaultProject: [
            'eslint.config.js',
            'vitest.config.ts',
            'vitest.e2e.config.ts',
            '*.cjs',
            '*.mjs',
            'scripts/*.mjs',
            'scripts/lib/*.mjs',
            'src/runtime/*.cjs',
            'tests/fixtures/*.mjs',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      // The MCP SDK + zod surface returns lots of `unknown` we narrow at runtime.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      // Interface methods are declared `async` for consistency even when the
      // mock implementation has no awaits.
      '@typescript-eslint/require-await': 'off',
      // Stylistic preferences we don't want to enforce.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      // Stay strict on these:
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'import-x/no-unresolved': 'off',
      'n/hashbang': 'off',
      'n/no-missing-import': 'off',
      'n/no-process-exit': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'no-console': ['error', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'regexp/negation': 'off',
      'regexp/no-super-linear-backtracking': 'off',
      'regexp/optimal-quantifier-concatenation': 'off',
      'regexp/prefer-d': 'off',
      'regexp/prefer-w': 'off',
      'regexp/use-ignore-case': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'n/no-unpublished-import': 'off',
      'no-console': 'off',
      'vitest/expect-expect': 'off',
    },
  },
  {
    files: ['src/cli.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['src/runtime/*.cjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        fetch: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'n/no-unpublished-import': 'off',
    },
  },
  prettier,
);
