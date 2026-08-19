#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# push-standards.sh — push the Quilt engineering standards to all 15 repos
#
# Pushes:
#   - LICENSE                  (Apache-2.0)
#   - CODEOWNERS               (auto-assigns @SuperInstance to all PRs)
#   - SECURITY.md              (vulnerability disclosure policy)
#   - .editorconfig            (consistent style)
#   - .github/dependabot.yml   (automated dep updates — TS or Rust variant)
#   - .github/workflows/ci.yml (test + lint + audit)
#
# Idempotent: skips files that already exist.
# Run:  bash push-standards.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

STANDARDS_DIR="${STANDARDS_DIR:-/workspace/quilt-standards}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN env var required}"
GITHUB_API="https://api.github.com"
ORG="SuperInstance"

# 15 Quilt repos, with their stack
REPOS=(
  "quilt:ts"
  "quilt-rust:rust"
  "quilt-live:ts"
  "quilt-esp32:rust"
  "quilt-mesh:ts"
  "quilt-agent:ts"
  "quilt-time:ts"
  "quilt-vault:ts"
  "quilt-vision:ts"
  "quilt-zk:ts"
  "quilt-flow:ts"
  "quilt-cloudflare:ts"
  "quilt-ai:ts"
  "quilt-evolve:ts"
  "quilt-codespace:ts"
)

# File list: source -> destination path
# (All files are pushed to every repo; dependabot and ci.yml vary by stack)
COMMON_FILES=(
  "LICENSE:LICENSE"
  "CODEOWNERS:CODEOWNERS"
  "SECURITY.md:SECURITY.md"
  "editorconfig:.editorconfig"
)

# Per-stack files
TS_FILES=(
  "dependabot-ts.yml:.github/dependabot.yml"
  "ci-ts.yml:.github/workflows/ci.yml"
)
RUST_FILES=(
  "dependabot-rust.yml:.github/dependabot.yml"
  "ci-rust.yml:.github/workflows/ci.yml"
)

# ── Helpers ───────────────────────────────────────────────────────
check_existing() {
  local repo="$1" path="$2"
  local code
  code=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 \
    "https://raw.githubusercontent.com/$ORG/$repo/main/$path" 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "    [exists] $path"
    return 0
  fi
  code=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 \
    "https://raw.githubusercontent.com/$ORG/$repo/master/$path" 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "    [exists-on-master] $path"
    return 0
  fi
  return 1
}

push_file() {
  local repo="$1" src="$2" dest="$3"
  local content
  content=$(cat "$src" | base64 -w 0)

  # First check if the file exists and get its SHA
  local existing_sha
  existing_sha=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "$GITHUB_API/repos/$ORG/$repo/contents/$dest" 2>/dev/null | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")

  # Build the JSON payload
  local payload
  payload=$(mktemp)
  if [ -n "$existing_sha" ]; then
    cat > "$payload" <<EOF
{
  "message": "chore: update $dest (Quilt engineering standards)",
  "content": "$content",
  "sha": "$existing_sha",
  "branch": "main"
}
EOF
  else
    cat > "$payload" <<EOF
{
  "message": "chore: add $dest (Quilt engineering standards)",
  "content": "$content",
  "branch": "main"
}
EOF
  fi

  local res
  res=$(curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "@$payload" \
    "$GITHUB_API/repos/$ORG/$repo/contents/$dest")

  rm -f "$payload"

  # Check if commit succeeded by looking for 'commit' field
  if echo "$res" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if 'commit' in d else 1)" 2>/dev/null; then
    echo "    [ok]      $dest"
    return 0
  else
    local err
    err=$(echo "$res" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('message','unknown'))" 2>/dev/null || echo "parse error")
    echo "    [FAIL]    $dest: $err"
    return 1
  fi
}

# ── Main loop ────────────────────────────────────────────────────
ok=0
fail=0
skipped=0
total=0

for entry in "${REPOS[@]}"; do
  repo="${entry%%:*}"
  stack="${entry##*:}"
  echo "→ $repo ($stack)"

  files=("${COMMON_FILES[@]}")
  if [ "$stack" = "rust" ]; then
    files+=("${RUST_FILES[@]}")
  else
    files+=("${TS_FILES[@]}")
  fi

  for f in "${files[@]}"; do
    src="${f%%:*}"
    dest="${f##*:}"
    src_path="$STANDARDS_DIR/$src"
    total=$((total+1))

    if check_existing "$repo" "$dest"; then
      skipped=$((skipped+1))
      continue
    fi

    if push_file "$repo" "$src_path" "$dest"; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
    fi
  done
  echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo "  Done."
echo "  Total:    $total"
echo "  Pushed:   $ok"
echo "  Skipped:  $skipped (already existed)"
echo "  Failed:   $fail"
echo "═══════════════════════════════════════════════════════════════"
