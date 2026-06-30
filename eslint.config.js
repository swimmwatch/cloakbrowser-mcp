// Flat config for ESLint v9.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'artifacts/**', 'node_modules/**', '.venv-docs/**', 'site/**'],
  },
  js.configs.recommended,
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
      'no-console': ['error', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'no-console': 'off',
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
  },
  prettier,
);
