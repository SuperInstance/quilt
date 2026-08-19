/**
 * @file cells/ai.ts
 * @module @quilt/core
 *
 * =====================================================================
 *  THE AI CELL — language model, embedding, vision, code
 * =====================================================================
 *
 * An AI cell is a reactive cell that calls an LLM provider when its
 * inputs change. It supports 8 sub-kinds via the `ai_kind` field:
 *
 *   - ai.llm       — chat completion
 *   - ai.embed     — text → vector
 *   - ai.image     — text → image
 *   - ai.translate — text → translated text
 *   - ai.sentiment — text → {label, score}
 *   - ai.summarize — long text → short text
 *   - ai.code      — description → code
 *   - ai.vision    — image + text → text
 *
 * The cell is async. The runtime queues it for evaluation when
 * upstream cells change. Caching is by input hash.
 *
 * Providers: zai, kimi, deepseek, cloudflare (or any custom provider
 * registered with the AIEngine).
 *
 * =====================================================================
 *  USAGE IN A SHEET
 * =====================================================================
 *
 *   - id: ai.answer
 *     kind: ai
 *     ai_kind: ai.llm
 *     provider: zai
 *     model: glm-4.5
 *     prompt: "What is Quilt?"
 *     temperature: 0.7
 *     max_tokens: 500
 *
 * The cell's value is the model's response. If the call fails, the
 * cell's error field is set and the value is null.
 *
 * =====================================================================
 *  INTEGRATION WITH @quilt/ai
 * =====================================================================
 *
 * The AI cell is a thin wrapper around @quilt/ai's AIEngine. To use it:
 *
 *   import { Quilt } from '@quilt/core';
 *   import { AIEngine } from '@quilt/ai';
 *
 *   const ai = new AIEngine({ zaiKey: process.env.ZAI_TOKEN, ... });
 *   const q = new Quilt({ ai });
 *
 *   q.load({ cells: [{ id: 'a', kind: 'ai', provider: 'zai', ... }] });
 *   await q.tick();
 *   console.log(q.get('a')); // the model's response
 *
 * =====================================================================
 */

import type { CellDef, CallerContext } from '../types.js';

/** The 8 AI cell sub-kinds. */
export type AIKind =
  | 'ai.llm'
  | 'ai.embed'
  | 'ai.image'
  | 'ai.translate'
  | 'ai.sentiment'
  | 'ai.summarize'
  | 'ai.code'
  | 'ai.vision';

/** The AI cell's own config. */
export interface AICellConfig extends Omit<CellDef, 'language'> {
  kind: 'ai';
  /** The AI sub-kind. */
  ai_kind: AIKind;
  /** Provider name. */
  provider: string;
  /** Model id. */
  model: string;
  /** Prompt template (for ai.llm, ai.code, ai.summarize, ai.vision). */
  prompt?: string;
  /** Input cell reference or value (for ai.embed, ai.translate, ai.sentiment, ai.summarize, ai.code). */
  input?: string;
  /** Image URL (for ai.vision, ai.image). */
  image?: string;
  /** Target language (for ai.translate). */
  target?: string;
  /** Language (for ai.code). */
  language?: string | 'javascript' | 'python' | 'wasm';
  /** Max words (for ai.summarize). */
  max_words?: number;
  /** Temperature (0 = deterministic, 2 = creative). */
  temperature?: number;
  /** Max tokens. */
  max_tokens?: number;
  /** System message. */
  system?: string;
}

/** The AIEngine interface (a subset of @quilt/ai's AIEngine). */
export interface AIEngineLike {
  call(config: AICellConfig, opts?: { useCache?: boolean; signal?: AbortSignal }): Promise<unknown>;
}

/** Result of evaluating an AI cell. */
export interface AIEvalResult {
  value: unknown;
  error: string | null;
}

/** Evaluate an AI cell. */
export async function evaluateAI(
  cell: AICellConfig,
  _context: CallerContext,
  engine: AIEngineLike,
  resolveCellValue?: (id: string) => unknown,
): Promise<AIEvalResult> {
  // Helper: substitute {{cell.id}} in a string
  const substitute = (s: string): string => {
    if (!resolveCellValue) return s;
    return s.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, id) => {
      const v = resolveCellValue(id);
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v;
      return JSON.stringify(v);
    });
  };

  // Build the AI config from the cell
  const config: Record<string, unknown> = {
    id: cell.id,
    kind: cell.ai_kind,
    provider: cell.provider,
    model: cell.model,
  };
  if (cell.prompt !== undefined) config.prompt = substitute(cell.prompt);
  if (cell.input !== undefined) {
    // If it's a template like {{cell.id}}, substitute; otherwise use as-is
    config.input = cell.input.startsWith('{{') ? substitute(cell.input) : cell.input;
  }
  if (cell.image !== undefined) config.image = substitute(cell.image);
  if (cell.target !== undefined) config.target = cell.target;
  if (cell.language !== undefined) config.language = cell.language;
  if (cell.max_words !== undefined) config.max_words = cell.max_words;
  if (cell.temperature !== undefined) config.temperature = cell.temperature;
  if (cell.max_tokens !== undefined) config.max_tokens = cell.max_tokens;
  if (cell.system !== undefined) config.system = substitute(cell.system);

  try {
    const result = await engine.call(config, { useCache: true });
    return { value: result, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { value: null, error: message };
  }
}
