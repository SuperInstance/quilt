# API Status — August 22, 2026

## Working APIs
- **ZAI** (`glm-5`) at `https://api.z.ai/api/paas/v4/chat/completions` — 6KB cap, fast, good for analysis
- **DeepSeek** (`deepseek-chat`) at `https://api.deepseek.com/v1/chat/completions` — 4KB cap, fast, good for code

## Not working
- **Anthropic** (`claude-sonnet-4-5`, `claude-3-5-sonnet`, `claude-3-haiku`) — credit balance too low
- **SiliconFlow** — API key invalid
- **Kimi** — suspended for billing
- **GitHub** token works for repo operations
- **crates.io, packagist, npmjs, hexpm, rubygems** — package publishing tokens (available)

## What this means
We use ZAI and DeepSeek in the parallel council pattern. Both have similar capability.
For flagship creative work, use ZAI first (slightly more verbose, more reasoning).
For fast code generation, use DeepSeek first.

## Parallel council pattern
For deep work, fire 2-4 calls in parallel:
- ZAI for the analysis/interpretation
- DeepSeek for the code/implementation
- Both for cross-verification of facts

