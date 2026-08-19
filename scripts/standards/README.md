# Quilt Engineering Standards

> The shared standards files that every Quilt repo is held to. Apply them
> with the included scripts, or copy them by hand.

## What's here

```
standards/
├── LICENSE                     — Apache-2.0
├── .editorconfig.template      — consistent style
├── CODEOWNERS.template         — auto-assigns @SuperInstance to all PRs
├── SECURITY.md.template        — vulnerability disclosure policy
├── dependabot.ts.yml           — npm dependency updates
├── dependabot.rust.yml         — cargo dependency updates
├── ci.ts.yml                   — test + lint + audit (Node)
├── ci.rust.yml                 — test + clippy + fmt + audit (Rust)
├── cross-refs.md               — README footer with sibling-repo links
├── push-standards.sh           — apply LICENSE+CODEOWNERS+SECURITY.md+... to all 15 repos
└── push-cross-refs.sh          — append the cross-refs footer to every README
```

## How to use

### Apply the standards to a new repo

```bash
# Pick a language-specific workflow and Dependabot
cp standards/ci.ts.yml .github/workflows/ci.yml       # or ci.rust.yml
cp standards/dependabot.ts.yml .github/dependabot.yml # or dependabot.rust.yml

# Apply the universal files
cp standards/LICENSE LICENSE
cp standards/.editorconfig.template .editorconfig
cp standards/CODEOWNERS.template CODEOWNERS
cp standards/SECURITY.md.template SECURITY.md

# Add the cross-refs footer to README
# (use the push-cross-refs.sh script if you have GITHUB_TOKEN)
```

### Apply to all 15 Quilt repos

```bash
export GITHUB_TOKEN=ghp_xxx
bash standards/push-standards.sh    # pushes 6 files × 15 repos
bash standards/push-cross-refs.sh   # appends the footer to every README
```

The scripts are idempotent — they skip files that already exist.

## Versions

- **CI workflows** target Node 22 (and Node 20 for the matrix) on Linux
- **Dependabot** schedules weekly on Monday
- **ESLint** config (in the main `quilt` repo) targets TypeScript 5.3+

## Why this set

The 6 standard files correspond to L1+L2 of the [Engineering Bar](../../docs/engineering-bar.md):

| File | Layer | Why |
|---|---|---|
| `LICENSE` | L1 | Required for any open-source project |
| `CODEOWNERS` | L1 | Auto-route reviews |
| `SECURITY.md` | L1 | Disclose vuln handling process |
| `.editorconfig` | L1 | Consistent style across editors |
| `dependabot.yml` | L2 | Automated dep updates |
| `ci.yml` | L2+L3 | Tests run on every PR |

The cross-references footer is a one-time addition that makes the
ecosystem feel like one project instead of 15.

## Maintaining

When you change a template:
1. Update the file in `standards/`
2. Run `push-standards.sh` to push the change to all 15 repos
3. (Future) Move the standards to a separate `quilt-standards` repo for version control
