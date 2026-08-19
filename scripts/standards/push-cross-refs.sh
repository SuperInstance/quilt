#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# push-cross-refs.sh — add cross-reference footer to every Quilt README
#
# For each repo:
#   1. GET current README.md
#   2. Insert the cross-refs block before the "## License" section
#      (or before "---" at the end if no License section)
#   3. PUT the new content back
#
# Idempotent: if the cross-refs are already there, skip.
# ═════════════════════════════════════════════════════════════════════════════

set -euo pipefail

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN env var required}"
GITHUB_API="https://api.github.com"
ORG="SuperInstance"
CROSS_REFS_FILE="${CROSS_REFS_FILE:-/workspace/quilt-standards/cross-refs.md}"

REPOS=(
  "quilt" "quilt-rust" "quilt-live" "quilt-esp32" "quilt-mesh"
  "quilt-agent" "quilt-time" "quilt-vault" "quilt-vision" "quilt-zk"
  "quilt-flow" "quilt-cloudflare" "quilt-ai" "quilt-evolve" "quilt-codespace"
)

# Marker we use to detect that cross-refs are already present
MARKER="Related Quilt repos"

ok=0
skipped=0
failed=0

for repo in "${REPOS[@]}"; do
  echo "→ $repo"

  # Get current README
  readme_json=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "$GITHUB_API/repos/$ORG/$repo/contents/README.md")

  # Decode content
  current=$(echo "$readme_json" | python3 -c "
import json, sys, base64
try:
    d = json.load(sys.stdin)
    if 'content' in d:
        print(base64.b64decode(d['content']).decode('utf-8'))
    else:
        sys.stderr.write('no content: ' + d.get('message',''))
        sys.exit(1)
except Exception as e:
    sys.stderr.write('parse error: ' + str(e))
    sys.exit(1)
")

  if [ -z "$current" ]; then
    echo "    [FAIL]    could not read README"
    failed=$((failed+1))
    continue
  fi

  # Skip if already has the marker
  if echo "$current" | grep -qF "$MARKER"; then
    echo "    [skip]    cross-refs already present"
    skipped=$((skipped+1))
    continue
  fi

  # Read the cross-refs block
  cross_refs=$(cat "$CROSS_REFS_FILE")

  # Find insertion point: just before the "## License" section,
  # or at the very end if no License section.
  if echo "$current" | grep -qE "^## License"; then
    # Insert before "## License"
    new_content=$(echo "$current" | awk -v refs="$cross_refs" '
      /^## License/ && !done {
        print refs
        print ""
        print "---"
        print ""
        done = 1
      }
      { print }
    ')
  else
    # Append at the end
    new_content="${current}

---

${cross_refs}"
  fi

  # Encode and push
  encoded=$(echo "$new_content" | base64 -w 0)
  sha=$(echo "$readme_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('sha',''))")

  payload=$(mktemp)
  cat > "$payload" <<EOF
{
  "message": "docs: add cross-reference footer to sibling Quilt repos",
  "content": "$encoded",
  "sha": "$sha",
  "branch": "main"
}
EOF

  res=$(curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "@$payload" \
    "$GITHUB_API/repos/$ORG/$repo/contents/README.md")

  rm -f "$payload"

  if echo "$res" | python3 -c "import json,sys; sys.exit(0 if 'commit' in json.load(sys.stdin) else 1)" 2>/dev/null; then
    echo "    [ok]"
    ok=$((ok+1))
  else
    err=$(echo "$res" | python3 -c "import json,sys; print(json.load(sys.stdin).get('message','?'))" 2>/dev/null)
    echo "    [FAIL]    $err"
    failed=$((failed+1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Done. ok=$ok skip=$skipped fail=$failed"
echo "═══════════════════════════════════════════════════════════════"
