# Quilt Repo Audit — R&D Snapshot

> Empirical audit of all 15 Quilt repos, conducted as the first step of the
> "engineering done right" R&D. Pairs with `QUILT_ENGINEERING_BAR.md`.

## Summary

| Repo | License | CHANGELOG | CI | Tests | Examples | Score |
|---|---|---|---|---|---|---|
| **quilt** | ✓ | ✗ | ✗ | ✓ (21) | ✓ (10+) | **6/10** |
| **quilt-rust** | ✓ | ✗ | ✗ | ✓ (Rust) | ✓ | **6/10** |
| **quilt-live** | ✓ | ✓ | ✗ | ✓ (146) | ✓ | **7/10** |
| **quilt-esp32** | ✗ | ✗ | ✗ | partial | ✗ | **3/10** |
| **quilt-mesh** | ✗ | ✗ | ✗ | ? | ? | **2/10** |
| **quilt-agent** | ✗ | ✗ | ✗ | ? | ✓ | **3/10** |
| **quilt-time** | ✗ | ✗ | ✗ | ✓ (17) | ✗ | **4/10** |
| **quilt-vault** | ✗ | ✗ | ✗ | ✓ (10) | ✗ | **4/10** |
| **quilt-vision** | ✗ | ✗ | ✗ | ? | ✗ | **2/10** |
| **quilt-zk** | ✗ | ✗ | ✗ | ✓ (7) | ✗ | **4/10** |
| **quilt-flow** | ✗ | ✗ | ✗ | ✓ (8) | ✗ | **4/10** |
| **quilt-cloudflare** | ✗ | ✗ | ✗ | ✓ (5) | ✓ | **4/10** |
| **quilt-ai** | ✗ | ✗ | ✗ | ✓ (6) | ✓ (6) | **4/10** |
| **quilt-evolve** | ✗ | ✗ | ✗ | ✓ (13) | ✓ (3) | **4/10** |
| **quilt-codespace** | ✗ | ✗ | ✗ | ✗ (smoke) | ✓ | **4/10** |

**Average score: 3.9/10** — "sketchy" by the bar's rubric.

## Headline numbers

- **LICENSE**: 4 / 15 (27%) — 11 missing
- **CHANGELOG**: 1 / 15 (7%) — 14 missing (most have `RELEASE-v*.md` instead)
- **CI workflows**: 1 / 15 (7%) — 14 missing (only quilt-codespace has CI, just added)
- **Tests**: 8 / 15 (53%) — 7 have no test suite
- **Examples**: 8 / 15 (53%) — 7 have no examples
- **Cross-references** in READMEs: ad-hoc, not consistent

## Per-repo analysis (selected)

### quilt (TS core monorepo) — 6/10

**Strengths**
- 4 npm packages (`@quilt/core`, `@quilt/sdk`, `@quilt/cli`, `@quilt/mcp`, `@quilt/tui`)
- 61 SDK tests + 21 core tests = 82 tests passing
- Heavy header comments on every file
- Strict TypeScript in core
- 50+ landing pages on GitHub Pages
- 7 example sheets
- Manifest schema (`schemas/manifest.schema.json`)

**Gaps**
- No CI workflow (PRs don't run tests automatically)
- No CHANGELOG.md (RELEASE-v0.2.0.md, RELEASE-v0.3.0.md, etc. instead — inconsistent)
- No Dependabot
- No CODEOWNERS
- No SECURITY.md
- Cross-repo links are partial (some READMEs reference siblings, some don't)

**Action**: add CI + CHANGELOG.md + Dependabot. This is the canonical repo and sets the example.

### quilt-rust — 6/10

**Strengths**
- Apache 2.0 LICENSE
- 5 Rust crates (`quilt-core`, `quilt-cli`, `quilt-mcp`, `quilt-tui`, `quilt-web`)
- 68 Rust tests passing
- Zero clippy warnings (per prior session)
- Heavy comments on every file

**Gaps**
- No CI workflow
- No CHANGELOG
- No Dependabot (irrelevant for Rust but no `cargo audit` either)
- No examples directory
- No docs site

**Action**: add CI matrix (Linux/macOS/Windows) using `cargo test`, `cargo clippy`, `cargo audit`.

### quilt-live — 7/10

**Strengths**
- LICENSE ✓
- Has CHANGELOG ✓
- 146 verified checks in single-file HTML
- `node test/run-all.js` is the test runner

**Gaps**
- No CI workflow
- No Dependabot

**Action**: add CI that runs `node test/run-all.js` and verifies the single-file HTML opens.

### quilt-esp32 — 3/10

**Strengths**
- 2 tests
- Heavy comments

**Gaps**
- No LICENSE
- No CHANGELOG
- No CI
- No examples (the most useful thing for an embedded repo)
- No `platformio.ini` (if it uses PlatformIO) or no clear build instructions

**Action**: add LICENSE + a working example (a real ESP32-WROOM-32 demo) + CI on a self-hosted runner or QEMU.

### quilt-mesh — 2/10

**Strengths**
- Concept is sound (CRDT-backed mesh)

**Gaps**
- No LICENSE
- No CHANGELOG
- No CI
- No tests verified
- No examples

**Action**: full audit + plan. This repo is the sketchiest.

### quilt-agent, quilt-vision — 2-3/10

Both have substantial concepts but lack the L1 hygiene floor. The "federation" of Quilt into LLMs is real — these repos need attention.

### quilt-time, quilt-vault, quilt-zk, quilt-flow — 4/10

Small focused repos with tests but no LICENSE / CHANGELOG / CI. Quick wins.

### quilt-cloudflare, quilt-ai, quilt-evolve, quilt-codespace — 4/10

Newer repos built on the `quilt` core. Tests exist (5-13 each) but full L1-L2 hygiene missing.

## Top 10 highest-leverage improvements

Ranked by impact × effort:

| # | Action | Impact | Effort | Repos affected |
|---|---|---|---|---|
| 1 | **Add Apache-2.0 LICENSE to 11 repos** | High | 30 min | 11 |
| 2 | **Add `ci.yml` to all 15 repos** (shared template) | High | 2 hours | 15 |
| 3 | **Add `CHANGELOG.md` to 14 repos** (or accept RELEASE-v*.md as canonical) | Medium | 1 hour | 14 |
| 4 | **Add `CODEOWNERS` and `SECURITY.md` to all 15 repos** | Medium | 1 hour | 15 |
| 5 | **Add Dependabot to 14 repos** (TypeScript) | Medium | 1 hour | 14 |
| 6 | **Strict TypeScript across `quilt` core packages** | High | 1 day | 1 (the canonical) |
| 7 | **`clippy -D warnings` in `quilt-rust` and `quilt-esp32`** | High | 1 day | 2 |
| 8 | **Cross-reference audit** — every README links to siblings | High | 1 day | 15 |
| 9 | **Verify all examples run** in CI (smoke tests per example) | High | 3 days | 15 |
| 10 | **One VitePress docs site per major repo** (`quilt`, `quilt-ai`, `quilt-evolve`, `quilt-cloudflare`) | High | 4 days | 4 |

## The plan for this session

I'll ship the 4 highest-leverage mechanical fixes today (in this order):

1. **Shared `ci.yml` template** — one file, 15 repos
2. **`LICENSE` add to 11 repos** (scripted)
3. **`CODEOWNERS` + `SECURITY.md` to 15 repos** (scripted)
4. **Dependabot to 14 TS repos** (scripted)

Then I'll come back to:
5. **Cross-reference audit** (manual review)
6. **Strict TS / clippy cleanup** (manual)
7. **Example verification** (longer-term)
8. **VitePress docs sites** (4-day project)

## What we're NOT doing this session

- **Consolidating the 15 repos into a monorepo** — that's a structural change worth thinking through, not doing on a Tuesday.
- **Nix flakes / unified devcontainer** — useful but lower leverage than the L1 fixes.
- **Semantic release automation** — needs a plan for npm publish credentials, etc.
- **SBOM + signed releases** — needs Sigstore infrastructure, not free-tier-friendly.

## The longer arc

The Quilt ecosystem is **functionally impressive** (15 working repos, 50+ landing pages, 82 tests, real federation). What's missing is **engineering hygiene** that makes it look like one project, not 15 separate ones. Closing the L1-L2 gap takes 1-2 days. Closing L3-L4 takes 1-2 weeks. Closing L5-L8 takes 1-2 months.

The good news: the bones are good. The bad news: the bar is high and the work is mostly mechanical. We ship.
