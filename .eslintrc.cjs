/**
 * ESLint configuration for the Quilt monorepo.
 *
 * Goals:
 *   - Catch real bugs (no-unused-vars, no-implicit-any, etc.)
 *   - Enforce consistent style (quotes, semicolons, indentation)
 *   - Allow heavy header comments (no restriction on file length)
 *   - Run fast (no slow plugins, default parser)
 *
 * Run: npm run lint
 * Auto-fix: npm run lint -- --fix
 */

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // TypeScript already enforces these; ESLint is redundant and noisy
    'no-unused-vars': 'off',
    'no-undef': 'off',

    // TypeScript-specific
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

    // Code quality
    'no-console': 'off',  // CLI uses console.log intentionally; lib code should be quiet
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-multi-spaces': 'warn',
    'no-trailing-spaces': 'warn',

    // Style
    'quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'always-multiline'],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'target/',
    'examples/',
    'landing/',
    'docs/',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
    '*.config.ts',
  ],
  overrides: [
    {
      files: ['test/**/*.ts', 'test/**/*.js', '**/*.test.ts', '**/*.test.js'],
      env: { node: true },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};
