/**
 * ESLint configuration for the Quilt monorepo (flat config).
 *
 * Migrated from .eslintrc.cjs for ESLint v9+/v10, which requires the flat
 * config format. Behavior is preserved: eslint:recommended +
 * @typescript-eslint recommended, the same custom rule set, the same ignore
 * globs, and the same relaxed rules for test files.
 *
 * Run: npm run lint
 * Auto-fix: npm run lint -- --fix
 */

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  // Ignore globs (formerly .eslintignore + ignorePatterns).
  {
    ignores: [
      'node_modules/',
      '**/dist/',
      '**/build/',
      '**/target/',
      'examples/',
      'landing/',
      'docs/',
      'demo/', // experimental one-off demos, not shipped source
      'polyglot/', // experimental kernel port, not shipped source
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      '**/*.config.ts',
    ],
  },

  // Base JS recommended rules.
  js.configs.recommended,

  // TypeScript recommended (flat) — sets up the plugin, parser, and rules.
  ...tsPlugin.configs['flat/recommended'],

  // Project rules (parity with the previous .eslintrc.cjs).
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // TypeScript already enforces these; ESLint is redundant and noisy.
      'no-unused-vars': 'off',
      'no-undef': 'off',

      // TypeScript-specific.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off', // we use this intentionally
      '@typescript-eslint/consistent-type-imports': 'warn',

      // Code quality.
      'no-console': 'off', // CLI uses console.log intentionally; lib code should be quiet
      // Not part of the ruleset this config was originally written against
      // (predates the rule); defensive `let x = default` inits are intentional.
      'no-useless-assignment': 'off',
      'no-debugger': 'error',
      // The formula/program/context cells compile expressions with
      // `new Function`/`new AsyncFunction` by design; those three call sites
      // carry explicit `eslint-disable-next-line no-new-func` directives.
      'no-new-func': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-multi-spaces': 'warn',
      'no-trailing-spaces': 'warn',

      // Style.
      'quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['warn', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],
    },
  },

  // qgit is a standalone CommonJS subpackage (git-native Quilt protocol).
  {
    files: ['qgit/**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Relaxed rules for tests.
  {
    files: ['**/test/**/*.ts', '**/test/**/*.js', '**/*.test.ts', '**/*.test.js', '**/*.test.mts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];
