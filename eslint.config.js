// Flat config for ESLint v9.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { flatConfigs as importXFlatConfigs } from 'eslint-plugin-import-x';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import n from 'eslint-plugin-n';
import noSecrets from 'eslint-plugin-no-secrets';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import { configs as regexpConfigs } from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
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
    plugins: {
      jsdoc: jsdocPlugin,
      'no-secrets': noSecrets,
      perfectionist,
      promise,
      sonarjs,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
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
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
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
      complexity: ['warn', { max: 15 }],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true, IIFEs: true }],
      'sonarjs/cognitive-complexity': ['warn', 20],
      ...promise.configs['flat/recommended'].rules,
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
      'promise/no-callback-in-promise': 'off',
      'promise/no-nesting': 'off',
      'promise/no-promise-in-callback': 'off',
      'promise/no-return-in-finally': 'warn',
      'perfectionist/sort-named-exports': ['warn', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-named-imports': ['warn', { type: 'natural', order: 'asc' }],
      'no-secrets/no-secrets': [
        'warn',
        {
          tolerance: 4.5,
          ignoreModules: true,
          ignoreCase: false,
          ignoreContent: [
            '^sha256:',
            '^sha512-',
            '^https?://',
            '^docker\\.io/',
            '^ghcr\\.io/',
            '^@[a-z0-9-]+/',
          ],
          ignoreIdentifiers: ['checksum', 'digest', 'fingerprint', 'hash', 'integrity', 'sha256', 'sha512'],
          additionalDelimiters: [],
          additionalRegexes: {
            'GitHub token': 'gh[pousr]_[A-Za-z0-9_]{36,255}',
            'Private key block': '-----BEGIN [A-Z ]*PRIVATE KEY-----',
          },
        },
      ],
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/require-description': 'warn',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          enableFixer: false,
          minLineCount: 35,
          publicOnly: { esm: true, cjs: false, window: false },
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            FunctionDeclaration: true,
            FunctionExpression: false,
            MethodDefinition: true,
          },
        },
      ],
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',
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
      'no-secrets/no-secrets': 'off',
      complexity: 'off',
      'max-depth': 'off',
      'max-lines-per-function': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
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
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
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
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'n/no-unpublished-import': 'off',
    },
  },
  {
    files: ['tests/fixtures/**/*.mjs'],
    rules: {
      complexity: 'off',
      'max-depth': 'off',
      'max-lines-per-function': 'off',
      'no-secrets/no-secrets': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
    },
  },
  prettier,
);
