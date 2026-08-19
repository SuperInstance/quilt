# The Quilt Engineering Bar

> A definition of "done right" for every repo in the Quilt ecosystem.
> This is a research document, not a contract. We're working toward it.

## Why a bar?

We have 15 repos, 50+ landing pages, ~80 tests, 3 npm packages, 2 Rust crates, and a single-file browser runtime. None of it is production-grade engineering unless we agree on what that means. The bar is a checklist that, when applied uniformly, makes the ecosystem feel like one project — not 15 separate ones.

## The 8 layers

```
                ┌─────────────────────────────────────┐
                │  L8 Ecosystem: monorepo, Nix, fleet │
                ├─────────────────────────────────────┤
                │  L7 Operations: issues, security    │
                ├─────────────────────────────────────┤
                │  L6 Release: semver, SBOM, signing  │
                ├─────────────────────────────────────┤
                │  L5 Docs: landing, API, tutorial    │
                ├─────────────────────────────────────┤
                │  L4 Quality: lint, types, security  │
                ├─────────────────────────────────────┤
                │  L3 Test: unit, integration, e2e    │
                ├─────────────────────────────────────┤
                │  L2 Build: lockfile, reproducible   │
                ├─────────────────────────────────────┤
                │  L1 Hygiene: license, README, git   │
                └─────────────────────────────────────┘
```

Each layer is a prerequisite for the next. A repo with great docs (L5) but no tests (L3) is a brochure, not a project.

---

## L1 — Hygiene (the absolute floor)

Every repo MUST have:

- [ ] **LICENSE** — `Apache-2.0` (the org-wide default)
- [ ] **README** with: title, one-line tagline, badges, quick start, examples, links
- [ ] **CHANGELOG** (or release notes) showing version history
- [ ] **.gitignore** with the language's standard exclusions
- [ ] **.editorconfig** for consistent indentation/EOL
- [ ] **CODE_OF_CONDUCT** (or a link to the org-level one)

Cost: 1 hour per repo. Audit takes 5 minutes.

## L2 — Build

A new contributor must be able to clone, install, build, and test in under 5 minutes.

- [ ] **Lockfile committed** (`package-lock.json`, `Cargo.lock`, `pnpm-lock.yaml`)
- [ ] **Single command to build** (`npm run build`, `cargo build`)
- [ ] **Single command to test** (`npm test`, `cargo test`)
- [ ] **Reproducible** — same input → same output
- [ ] **Versioned** — semver, tag in git
- [ ] **Node/Rust/embedded toolchain pinned** (`.nvmrc`, `rust-toolchain.toml`)

Cost: half a day per repo if it's already started. A day from scratch.

## L3 — Test

Tests are how we say "this works" with receipts.

- [ ] **Unit tests** for every public function
- [ ] **Integration tests** for cross-module flows
- [ ] **End-to-end tests** for user-facing paths
- [ ] **CI runs on every PR** (GitHub Actions matrix across OS where relevant)
- [ ] **Coverage reported** (target: 80% for core, 60% for utilities)
- [ ] **Smoke tests** for any binary or long-running process

Quilt-specific test bars:
- `quilt` core: 100 tests (we have 21)
- `quilt-ai` / `quilt-evolve`: 30+ tests each
- `quilt-esp32`: 10+ tests
- Every example must have at least one test

Cost: 1-3 days per repo depending on existing coverage.

## L4 — Quality

A passing test isn't enough — code has to be readable, safe, and consistent.

- [ ] **Lint passes** with zero warnings
  - TS: `eslint` with `typescript-eslint`, no `eslint-disable` without justification
  - Rust: `clippy` with `-D warnings`
  - Python: `ruff` or `flake8`
- [ ] **Type check passes** with strict settings
  - TS: `"strict": true`, no `any` (use `unknown` + narrowing)
  - Rust: no `unsafe` without safety comment
- [ ] **No compiler warnings**
- [ ] **No security advisories** in dependencies
  - `npm audit` / `cargo audit` clean (or exceptions documented)
- [ ] **Heavy header comments** on every file explaining intent
- [ ] **Public API documented** — JSDoc for TS, rustdoc for Rust

Cost: ongoing. Set up once per repo, run on every PR.

## L5 — Docs

The user-facing surface. If the README is the trailer, the docs are the movie.

- [ ] **Landing page** in the main `quilt/landing/` directory
- [ ] **API reference** (auto-generated from JSDoc/rustdoc)
- [ ] **Tutorial** that works end-to-end on a fresh clone
- [ ] **Architecture diagram** (one image is worth a thousand words)
- [ ] **Cross-references** to sibling Quilt repos
- [ ] **Examples index** — a table of working examples with one-line descriptions
- [ ] **Changelog visible** on the landing page

Quilt-specific docs:
- Every repo's landing page must be linked from `quilt/landing/index.html`
- The landing pages must use a consistent design language (dark, gradient, code blocks)
- All examples in docs must be runnable

Cost: 1-2 days per repo. The biggest existing gap.

## L6 — Release

We ship software; the release is the artifact people use.

- [ ] **Semantic versioning** — MAJOR.MINOR.PATCH
- [ ] **GitHub release per version** with notes
- [ ] **npm publish** for TS packages, **crates.io publish** for Rust
- [ ] **Docker image** for runtimes (`quilt-cloudflare`, `quilt-codespace`)
- [ ] **SBOM generated** (CycloneDX or SPDX)
- [ ] **Signed releases** (Sigstore, GPG)

Quilt-specific release bars:
- `quilt` core: npm `@quilt/core`, `@quilt/sdk`, `@quilt/cli`, `@quilt/mcp`, `@quilt/tui`
- `quilt-rust`: crates `quilt-core`, `quilt-tui`, `quilt-web`
- `quilt-esp32`: `cargo` for the embedded target
- `quilt-cloudflare`: `wrangler deploy` from CI
- `quilt-codespace`: use-as-template on GitHub

Cost: 1 day to set up, ongoing for each release.

## L7 — Operations

A healthy project. Good citizenship in the ecosystem.

- [ ] **Issue templates** (bug, feature, question)
- [ ] **PR template** with checklist
- [ ] **CODEOWNERS** (auto-assign reviewers)
- [ ] **Dependabot configured** for automated dependency updates
- [ ] **SECURITY.md** with disclosure process
- [ ] **Discussions enabled** for community Q&A

Cost: half a day. Big payoff in contributor experience.

## L8 — Ecosystem

The highest layer — the repos become one project.

- [ ] **Listed in main `quilt` README** with description and badge
- [ ] **Cross-referenced from sibling repos** (every README links to siblings)
- [ ] **Compatibility matrix** — which versions of which repos work together
- [ ] **Shared devcontainer** or Nix flake — one setup for all
- [ ] **Monorepo CI** that runs tests across all repos
- [ ] **Cross-repo refactor tools** — codemods, scripts

Cost: ongoing. The biggest leverage point — when done right, every improvement to a shared tool benefits all 15 repos.

---

## The 80/20 actions

If I had to pick 10 things to ship this week to raise the bar most:

| # | Action | Why | Cost |
|---|---|---|---|
| 1 | LICENSE + README audit for all 15 repos | Lowest floor, highest signal | 1 day |
| 2 | One shared CI workflow template | Lifts all 15 repos at once | 1 day |
| 3 | Strict TS in `quilt` core | Sets the example for all TS repos | 1 day |
| 4 | `clippy -D warnings` in `quilt-rust` and `quilt-esp32` | Sets the example for all Rust repos | 1 day |
| 5 | Cross-reference audit — every README links to siblings | Makes the ecosystem feel like one | 1 day |
| 6 | Dependabot in all 15 repos | Automated dependency hygiene | 2 hours |
| 7 | One VitePress docs site per major repo | `quilt`, `quilt-ai`, `quilt-evolve`, `quilt-cloudflare` | 4 days |
| 8 | Example CI — every example in every repo is runnable | The "no broken demos" promise | 3 days |
| 9 | Semantic release automation | No more "I forgot to bump the version" | 2 days |
| 10 | One shared devcontainer / Nix flake | "Clone any Quilt repo and it just works" | 3 days |

## The 1-year bar

If every repo hits L5 by next month, and L6-L8 by year-end, the Quilt ecosystem becomes a peer to Rust, React, or Postgres in terms of engineering quality — but with a much smaller surface area and a much more focused purpose. That's the goal.

## What "done right" is NOT

- **Not**: "It builds and the tests pass." That's L2.
- **Not**: "It has a fancy landing page." That's L5 with no L3.
- **Not**: "I rewrote it in Rust." That's complexity without leverage.
- **Not**: "I added a logo and a tagline." That's L1 if even that.

**Done right is:** *a new contributor can clone the repo, build it, run its tests, read its docs, find an example, and ship a change in under an hour.* That's the standard. Everything else is decoration.
