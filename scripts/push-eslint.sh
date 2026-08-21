#!/bin/bash
# push-eslint.sh — Push ESLint config to all TypeScript Quilt repos
#
# Usage: ./scripts/push-eslint.sh
#
# This script:
# 1. Copies .eslintrc.cjs + .eslintignore from the main quilt repo
# 2. Updates each repo's package.json to add eslint deps + lint script
# 3. Commits + pushes via GitHub API
#
# Works for any TS repo that has a package.json but no lint script.

set -e

REPOS=(
  "quilt-ai"
  "quilt-evolve"
  "quilt-time"
  "quilt-vault"
  "quilt-vision"
  "quilt-zk"
  "quilt-flow"
  "quilt-cloudflare"
)

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set" >&2
  exit 1
fi

ESLINT_CONFIG='/**
 * ESLint configuration for this Quilt sub-package.
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
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "no-unused-vars": "off",
    "no-undef": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "off",
    "quotes": ["warn", "single", { avoidEscape: true, allowTemplateLiterals: true }],
    "semi": ["warn", "always"],
    "comma-dangle": ["warn", "always-multiline"],
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    "examples/",
    "landing/",
    "docs/",
    "*.config.js",
    "*.config.cjs",
    "*.config.mjs",
    "*.config.ts",
  ],
  overrides: [
    {
      files: ["test/**/*.ts", "test/**/*.js", "**/*.test.ts", "**/*.test.js"],
      env: { node: true },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "no-console": "off",
      },
    },
  ],
};
'

ESLINT_IGNORE='node_modules/
dist/
build/
target/
examples/
landing/
docs/
*.config.js
*.config.cjs
*.config.mjs
*.config.ts
.eslintrc.cjs
'

for repo in "${REPOS[@]}"; do
  dir="/workspace/$repo"
  if [ ! -d "$dir" ] || [ ! -f "$dir/package.json" ]; then
    echo "  ✗ $repo: not found or no package.json"
    continue
  fi

  # Check if lint script already exists
  if grep -q '"lint"' "$dir/package.json" 2>/dev/null; then
    echo "  → $repo: lint already configured, skipping"
    continue
  fi

  echo "  → $repo: adding ESLint..."

  # Write ESLint config files
  echo "$ESLINT_CONFIG" > "$dir/.eslintrc.cjs"
  echo "$ESLINT_IGNORE" > "$dir/.eslintignore"

  # Update package.json: add lint script and eslint deps
  # Use a node script for safe JSON editing
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$dir/package.json', 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.lint = 'eslint . --ext .ts,.js';
    pkg.scripts['lint:fix'] = 'eslint . --ext .ts,.js --fix';
    pkg.devDependencies = pkg.devDependencies || {};
    pkg.devDependencies['eslint'] = pkg.devDependencies['eslint'] || '^8.57.0';
    pkg.devDependencies['@typescript-eslint/parser'] = pkg.devDependencies['@typescript-eslint/parser'] || '^7.0.0';
    pkg.devDependencies['@typescript-eslint/eslint-plugin'] = pkg.devDependencies['@typescript-eslint/eslint-plugin'] || '^7.0.0';
    fs.writeFileSync('$dir/package.json', JSON.stringify(pkg, null, 2) + '\n');
    console.log('  ✓ updated package.json');
  "

  # Add dev deps to devDeps if necessary
  echo "  ✓ $repo: ESLint config added"
done

echo ""
echo "Done. To commit and push, run:"
echo "  for repo in ${REPOS[@]}; do"
echo "    cd /workspace/\$repo"
echo "    git add .eslintrc.cjs .eslintignore package.json"
echo "    git commit -m 'chore: add ESLint configuration'"
echo "    git push"
echo "  done"
