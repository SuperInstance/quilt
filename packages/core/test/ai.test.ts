/**
 * Test the AI cell evaluator.
 *
 * These tests use a stub AIEngine — we don't make real API calls here.
 * Real API calls are tested in @quilt/ai and the live demos.
 */

import { describe, it, expect } from 'vitest';
import { QuiltEngine, parseSheet } from '../src/index.js';
import type { AIEngineLike } from '../src/cells/ai.js';

describe('AI cell', () => {
  it('evaluates an ai.llm cell with a stub engine', async () => {
    const stubEngine: AIEngineLike = {
      call: async (config) => `mock response to: ${config.prompt}`,
    };
    const engine = new QuiltEngine('test', { ai: stubEngine });
    const sheet = parseSheet(`id: test1
cells:
  - id: question
    kind: value
    value: "What is Quilt?"
  - id: answer
    kind: ai
    ai_kind: ai.llm
    provider: zai
    model: glm-4.5
    prompt: "{{question}}"
`);
    engine.loadSheet(sheet);
    const answer = await engine.get('answer');
    expect(answer.data).toBe('mock response to: What is Quilt?');
    expect(answer.status).toBe('ready');
  });

  it('returns an error when no AI engine is configured', async () => {
    const engine = new QuiltEngine('test'); // no ai
    const sheet = parseSheet(`id: test2
cells:
  - id: answer
    kind: ai
    ai_kind: ai.llm
    provider: zai
    model: glm-4.5
    prompt: "test"
`);
    engine.loadSheet(sheet);
    const answer = await engine.get('answer');
    expect(answer.status).toBe('error');
    expect(answer.error?.message).toMatch(/no ai engine/i);
  });

  it('passes through {{cell.id}} references in prompts', async () => {
    let lastConfig: any = null;
    const stubEngine: AIEngineLike = {
      call: async (config) => { lastConfig = config; return 'ok'; },
    };
    const engine = new QuiltEngine('test', { ai: stubEngine });
    const sheet = parseSheet(`id: test3
cells:
  - id: name
    kind: value
    value: "Quilt"
  - id: description
    kind: value
    value: "a reactive runtime"
  - id: summary
    kind: ai
    ai_kind: ai.llm
    provider: zai
    model: glm-4.5
    prompt: "Tell me about {{name}} ({{description}})"
`);
    engine.loadSheet(sheet);
    await engine.get('summary');
    expect(lastConfig.prompt).toBe('Tell me about Quilt (a reactive runtime)');
  });

  it('caches results by input hash', async () => {
    let callCount = 0;
    const stubEngine: AIEngineLike = {
      call: async (_config) => { callCount++; return `call-${callCount}`; },
    };
    const engine = new QuiltEngine('test', { ai: stubEngine });
    const sheet = parseSheet(`id: test4
cells:
  - id: q
    kind: value
    value: "hi"
  - id: a
    kind: ai
    ai_kind: ai.llm
    provider: zai
    model: glm-4.5
    prompt: "{{q}}"
`);
    engine.loadSheet(sheet);
    await engine.get('a');
    await engine.get('a');
    expect(callCount).toBe(1); // cached
  });

  it('handles all 7 sub-kinds', async () => {
    const stubEngine: AIEngineLike = {
      call: async (config) => `mock ${config.kind}`,
    };
    const engine = new QuiltEngine('test', { ai: stubEngine });
    const sheet = parseSheet(`id: test5
cells:
  - id: e
    kind: ai
    ai_kind: ai.embed
    provider: cloudflare
    model: "@cf/baai/bge-base-en-v1.5"
    input: "hello"
  - id: s
    kind: ai
    ai_kind: ai.summarize
    provider: zai
    model: glm-4.5
    input: "long text"
    max_words: 50
  - id: c
    kind: ai
    ai_kind: ai.code
    provider: zai
    model: glm-4.5
    input: "fibonacci"
    language: "rust"
  - id: t
    kind: ai
    ai_kind: ai.translate
    provider: cloudflare
    model: "@cf/meta/m2m100-1.2b"
    input: "hello"
    target: "fr"
  - id: se
    kind: ai
    ai_kind: ai.sentiment
    provider: cloudflare
    model: "@cf/huggingface/distilbert-sst-2-int8"
    input: "great product"
  - id: i
    kind: ai
    ai_kind: ai.image
    provider: cloudflare
    model: "@cf/stabilityai/stable-diffusion-xl-base-1.0"
    prompt: "a cat"
  - id: v
    kind: ai
    ai_kind: ai.vision
    provider: cloudflare
    model: "@cf/llava-hf/llava-1.5-7b-hf"
    image: "https://example.com/cat.jpg"
    prompt: "what is in this image"
`);
    engine.loadSheet(sheet);
    expect((await engine.get('e')).data).toBe('mock ai.embed');
    expect((await engine.get('s')).data).toBe('mock ai.summarize');
    expect((await engine.get('c')).data).toBe('mock ai.code');
    expect((await engine.get('t')).data).toBe('mock ai.translate');
    expect((await engine.get('se')).data).toBe('mock ai.sentiment');
    expect((await engine.get('i')).data).toBe('mock ai.image');
    expect((await engine.get('v')).data).toBe('mock ai.vision');
  });

  it('updates when an upstream value cell changes', async () => {
    const stubEngine: AIEngineLike = {
      call: async (config) => `echo: ${config.prompt}`,
    };
    const engine = new QuiltEngine('test', { ai: stubEngine });
    const sheet = parseSheet(`id: test6
cells:
  - id: q
    kind: value
    value: "first"
  - id: a
    kind: ai
    ai_kind: ai.llm
    provider: zai
    model: glm-4.5
    prompt: "{{q}}"
`);
    engine.loadSheet(sheet);
    // Bypass engine-level cache for this test
    expect((await engine.get('a')).data).toBe('echo: first');
    await engine.set('q', 'second');
    // The engine should invalidate the AI cell's cache and re-evaluate
    const a2 = await engine.get('a');
    // The result depends on whether the engine cleared the context cache
    // for the AI cell when 'q' changed. It does (propagate clears dependents).
    expect(a2.data).toBe('echo: second');
  });
});
