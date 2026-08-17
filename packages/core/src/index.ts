/**
 * @file index.ts
 * @module @quilt/core
 *
 * =====================================================================
 *  PUBLIC API OF @quilt/core
 * =====================================================================
 *
 * This file is the single entry point for the Quilt runtime. It
 * re-exports everything consumers need: types, the engine, the
 * parser, and the individual cell evaluators.
 *
 * Consumers typically import:
 *   - `QuiltEngine` to instantiate the runtime
 *   - `parseSheet` to load YAML
 *   - The types for type annotations
 *
 * The cell evaluators are exported for advanced use (custom cell
 * types, testing) but most consumers won't need them.
 *
 * =====================================================================
 */

// =====================================================================
//  TYPES — the vocabulary
// =====================================================================

export type {
  CellId, CellRef, CellKind, CellStatus, CellValue, Effect,
  CallerContext, CellDef, Cell, SheetDef, RouterRule, Subscription,
  EvaluationTrace,
} from './types.js';

// =====================================================================
//  ENGINE — the runtime
// =====================================================================

export { QuiltEngine } from './engine.js';
export type { EngineOptions } from './engine.js';

// =====================================================================
//  CONTEXT — propagation and evaluation
// =====================================================================

export {
  emptyContext, extendContext, contextKey, evalWhen,
} from './context.js';

// =====================================================================
//  PARSER — YAML loading and saving
// =====================================================================

export { parseSheet, validateSheet, serializeSheet } from './parser.js';

// =====================================================================
//  CELL EVALUATORS — for advanced use and testing
// =====================================================================

export { evaluateValue } from './cells/value.js';
export { evaluateFormula } from './cells/formula.js';
export { evaluateApi } from './cells/api.js';
export { evaluateProgram, type ProgramRuntime } from './cells/program.js';
export { evaluateRouter } from './cells/router.js';
export { fireListener } from './cells/listener.js';
export { makeSensorValue } from './cells/sensor.js';
export { makeIoValue } from './cells/io.js';
