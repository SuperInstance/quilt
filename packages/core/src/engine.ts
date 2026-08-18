/**
 * @file engine.ts
 * @module @quilt/core
 *
 * =====================================================================
 *  THE QUILT ENGINE — the reactive runtime
 * =====================================================================
 *
 * This is the heart of Quilt. It holds the cell graph, tracks
 * dependencies, propagates changes, and exposes the universal API:
 * `get`, `set`, `call`, `push`, `subscribe`.
 *
 * Everything else (CLI, MCP, TUI, Web) is a view onto this engine.
 * If you understand this file, you understand the system.
 *
 * =====================================================================
 *  ROLE IN THE SYSTEM
 * =====================================================================
 *
 *     types.ts       ◄── Cell, CellDef, CellId, CellValue, CallerContext
 *     context.ts     ◄── extendContext, contextKey
 *     cells/*.ts     ◄── evaluateValue, evaluateFormula, evaluateApi,
 *                       evaluateProgram, evaluateRouter, fireListener,
 *                       makeSensorValue, makeIoValue
 *        ▲
 *        │ imports
 *        │
 *     engine.ts      ◄── THIS FILE: QuiltEngine (the runtime)
 *        ▲
 *        │ imports
 *        │
 *     parser.ts      (uses engine.loadSheet to install parsed cells)
 *     mcp/server.ts  (calls engine.get/call/subscribe for MCP tools)
 *     cli/index.ts   (calls engine.get/set/loadSheet for commands)
 *
 * The engine implements `ProgramRuntime` so that program cells can
 * call back into the runtime (read, write, call other cells). This
 * is the "user code can compose with the runtime" hook.
 *
 * =====================================================================
 *  THE LIFECYCLE OF A CELL
 * =====================================================================
 *
 *   1. loadSheet(sheet) — define cells, build dependency graph
 *      For each CellDef, create a Cell with empty value.
 *      For formulas, scan the expression and add dep edges.
 *      For others, use the declared `deps` field.
 *
 *   2. get(id, ctx) — pull a cell's value, computing if needed
 *      Pure cells (value, formula): recompute on demand.
 *      Effectful cells (api, program, router): de-duped, cached.
 *      Push-based cells (sensor, io, listener): return current.
 *
 *   3. set(id, value, ctx) — write a value, propagate changes
 *      Update the cell, mark dependents as stale,
 *      notify subscribers, fire listeners.
 *
 *   4. call(id, input, ctx) — invoke a cell as a capability
 *      Same as get for pure cells. For effectful, pass input.
 *
 *   5. push(id, data) — push a value into a sensor or IO cell
 *      External adapters call this. Triggers downstream.
 *
 * =====================================================================
 *  PROPAGATION ALGORITHM
 * =====================================================================
 *
 * When a cell's value changes (via set or push), the engine walks
 * the dependent graph depth-first:
 *
 *   1. Mark each formula/value dependent as 'stale' and clear its cache
 *   2. Recurse into their dependents
 *   3. For each listener dependent, check its condition and fire
 *   4. Notify external subscribers
 *
 * Pure cells are not auto-recomputed; they recompute lazily on the
 * next get(). Effectful cells are NEVER auto-recomputed by upstream
 * changes — they must be called explicitly.
 *
 * =====================================================================
 *  CACHING STRATEGY
 * =====================================================================
 *
 * Per-context memoization: same cell + same caller context (by
 * row/column/identity/tags) → same cached value.
 *
 *   - value cells: no cache needed (always O(1))
 *   - formula cells: cache the result by contextKey
 *   - api/program/router cells: cache the result by contextKey
 *   - sensor/io/listener cells: not cached (push-based)
 *
 * Cache is invalidated:
 *   - On set (to the same cell)
 *   - On propagation (to formula dependents)
 *   - Never on context change (we cache per context, not per cell)
 *
 * =====================================================================
 */

import type {
  Cell, CellDef, CellId, CellRef, CellKind, CallerContext, CellValue,
  SheetDef, Subscription, EvaluationTrace,
} from './types.js';
import { emptyContext, extendContext, contextKey } from './context.js';
import { evaluateValue } from './cells/value.js';
import { evaluateFormula } from './cells/formula.js';
import { evaluateApi } from './cells/api.js';
import { evaluateProgram } from './cells/program.js';
import { evaluateRouter } from './cells/router.js';
import { fireListener } from './cells/listener.js';
import { makeSensorValue } from './cells/sensor.js';
import { makeIoValue } from './cells/io.js';
import type { ProgramRuntime } from './cells/program.js';

/**
 * Engine options.
 *
 *   - maxConcurrency: max simultaneous effectful evaluations
 *     (not yet enforced in MVP — kept for future scheduler)
 *   - tracing: whether to record evaluation traces
 */
export interface EngineOptions {
  maxConcurrency?: number;
  tracing?: boolean;
}

const defaultOptions: Required<EngineOptions> = {
  maxConcurrency: 16,
  tracing: false,
};

/**
 * The Quilt reactive runtime. One instance per "session" or "agent"
 * or "deployment". Holds the cell graph and provides the universal
 * API.
 */
export class QuiltEngine implements ProgramRuntime {
  readonly id: string;
  private cells = new Map<CellId, Cell>();
  private subscriptions = new Map<string, Subscription>();
  private inflight = new Map<CellId, Promise<CellValue>>();
  private traces: EvaluationTrace[] = [];
  private options: Required<EngineOptions>;
  private subscriptionCounter = 0;

  constructor(id: string = 'default', options: EngineOptions = {}) {
    this.id = id;
    this.options = { ...defaultOptions, ...options };
  }

  // ===========================================================================
  // SHEET LIFECYCLE
  // ===========================================================================

  /**
   * Load a sheet definition into the engine. Resets all cell state.
   *
   * Steps:
   *   1. Clear existing cells, in-flight evaluations, traces
   *   2. For each CellDef, create a Cell instance
   *   3. Build dependency edges (auto-detect for formulas, declared for others)
   *   4. Index dependents (reverse lookup)
   *
   * After loadSheet, the engine is ready to answer get/set/call.
   * No values are computed until something asks for them (pull-based).
   */
  loadSheet(sheet: SheetDef): void {
    this.cells.clear();
    this.inflight.clear();
    this.traces = [];

    for (const def of sheet.cells) {
      this.defineCell(def);
    }

    // Build dependency edges. For formulas, auto-detect by scanning
    // the expression. For everything else, use the declared `deps`.
    for (const cell of this.cells.values()) {
      if (cell.def.kind === 'formula' && cell.def.expr) {
        this.autoDetectDeps(cell);
      }
      for (const dep of cell.def.deps ?? []) {
        this.addDep(cell.id, dep);
      }
    }
  }

  /**
   * Define a single cell. Adds it to the graph.
   *
   * Throws if a cell with the same id already exists. Use this for
   * static sheets (via loadSheet) or for one-off cells in tests.
   * For dynamic registration (e.g. agents defining cells at runtime),
   * use `register()`.
   */
  defineCell(def: CellDef): Cell {
    if (this.cells.has(def.id)) {
      throw new Error(`cell already defined: ${def.id}`);
    }
    // Seed the cell with its initial value. Value cells use
    // `def.value`; sensor cells use `def.default` (if any) so
    // demo sheets work without an adapter wired up.
    let initial: CellValue = { data: undefined, status: 'idle' };
    if (def.value !== undefined) {
      initial = { data: def.value, status: 'ready', computedAt: Date.now() };
    } else if (def.kind === 'sensor' && def.default !== undefined) {
      initial = { data: def.default, status: 'ready', computedAt: Date.now() };
    }
    const cell: Cell = {
      id: def.id,
      def,
      value: initial,
      dependencies: new Set(),
      dependents: new Set(),
      contextCache: new Map(),
    };
    this.cells.set(def.id, cell);
    return cell;
  }

  /**
   * Register a new cell definition after load. Used for dynamic
   * registration (e.g. sensors connecting, agents defining new tools).
   *
   * Unlike defineCell, this also builds dependency edges from the
   * declared deps. (Formulas registered dynamically don't get
   * auto-detected deps — declare them explicitly.)
   */
  register(def: CellDef): Cell {
    const cell = this.defineCell(def);
    for (const dep of def.deps ?? []) {
      this.addDep(def.id, dep);
    }
    return cell;
  }

  // ===========================================================================
  // THE UNIVERSAL API: get, set, call
  // ===========================================================================

  /**
   * Get a cell's value. Evaluates if needed.
   *
   * Dispatch by cell kind:
   *   - value:   return the static value (no computation)
   *   - formula: refresh deps, then evaluate
   *   - api/program/router: de-dupe concurrent calls, evaluate
   *   - sensor/io/listener: return the current pushed value
   *
   * Per-context memoization: same cell + same context → cached.
   *
   * @param id - the cell id
   * @param ctx - the caller context (for routing and cache key)
   * @returns the cell's value, or an error CellValue
   */
  async get(id: CellId, ctx: CallerContext = emptyContext()): Promise<CellValue> {
    const cell = this.cells.get(id);
    if (!cell) {
      return { data: undefined, status: 'error', error: { message: `no such cell: ${id}` } };
    }

    const fullCtx = extendContext(ctx, id);

    switch (cell.def.kind) {
      case 'value':
        return evaluateValue(cell, fullCtx);

      case 'formula': {
        await this.refreshDeps(cell, fullCtx);
        return evaluateFormula(cell, fullCtx, this.cells);
      }

      case 'api':
      case 'program':
      case 'router': {
        const key = contextKey(fullCtx);
        const cached = cell.contextCache.get(key);
        if (cached && cached.status === 'ready') {
          return cached;
        }
        if (this.inflight.has(id)) {
          return this.inflight.get(id)!;
        }
        const promise = this.evaluateEffectful(cell, fullCtx, undefined);
        this.inflight.set(id, promise);
        try {
          const value = await promise;
          cell.contextCache.set(key, value);
          return value;
        } finally {
          this.inflight.delete(id);
        }
      }

      case 'sensor':
      case 'io':
      case 'listener':
        return cell.value;

      default:
        return { data: undefined, status: 'error', error: { message: `unknown kind: ${cell.def.kind as string}` } };
    }
  }

  /**
   * Set a cell's value. Triggers downstream recomputation.
   *
   * Steps:
   *   1. Update the cell's value and invalidate its caller-aware cache
   *   2. Notify external subscribers
   *   3. Propagate to dependents (mark stale, fire listeners)
   *
   * Note: set only changes ONE cell. To update a transaction, you
   * make multiple set calls. They're not atomic, but they are
   * ordered — set is synchronous from the caller's perspective.
   */
  async set(id: CellId, value: unknown, ctx: CallerContext = emptyContext()): Promise<void> {
    const cell = this.cells.get(id);
    if (!cell) {
      throw new Error(`no such cell: ${id}`);
    }

    const fullCtx = extendContext(ctx, id);
    const prev = cell.value;
    const newValue: CellValue = {
      data: value,
      status: 'ready',
      computedAt: Date.now(),
    };
    cell.value = newValue;
    cell.contextCache.clear();

    await this.notify(id, newValue, prev);
    await this.propagate(id, fullCtx);
  }

  /**
   * Call a cell as a capability. Same as get for pure cells, but
   * allows passing an `input` argument for effectful cells.
   *
   * USAGE:
   *   const v = await engine.call('model.router', userInput, { row: 'boat-1' });
   *   // The router receives userInput and routes based on the caller context.
   */
  async call(id: CellId, input?: unknown, ctx: CallerContext = emptyContext()): Promise<CellValue> {
    const cell = this.cells.get(id);
    if (!cell) {
      return { data: undefined, status: 'error', error: { message: `no such cell: ${id}` } };
    }

    const fullCtx = extendContext(ctx, id);

    if (cell.def.kind === 'value' || cell.def.kind === 'formula') {
      return this.get(id, ctx);
    }

    if (cell.def.kind === 'sensor' || cell.def.kind === 'io' || cell.def.kind === 'listener') {
      return cell.value;
    }

    const key = contextKey(fullCtx);
    const cached = cell.contextCache.get(key);
    if (cached && cached.status === 'ready') {
      return cached;
    }
    if (this.inflight.has(id)) {
      return this.inflight.get(id)!;
    }
    const promise = this.evaluateEffectful(cell, fullCtx, input);
    this.inflight.set(id, promise);
    try {
      const value = await promise;
      cell.contextCache.set(key, value);
      return value;
    } finally {
      this.inflight.delete(id);
    }
  }

  /**
   * Push a value into a sensor or IO cell. Triggers downstream.
   *
   * Called by external adapters (MQTT, Modbus, GPIO, MCP tools) when
   * they have a new reading/event for the cell.
   *
   * Throws if the cell isn't a sensor or IO. Use set for value/formula.
   */
  async push(id: CellId, data: unknown, ctx: CallerContext = emptyContext()): Promise<void> {
    const cell = this.cells.get(id);
    if (!cell) throw new Error(`no such cell: ${id}`);

    if (cell.def.kind !== 'sensor' && cell.def.kind !== 'io') {
      throw new Error(`cannot push to ${cell.def.kind} cell: ${id}`);
    }

    const newValue: CellValue = cell.def.kind === 'sensor' ? makeSensorValue(data) : makeIoValue(data);
    const prev = cell.value;
    cell.value = newValue;

    await this.notify(id, newValue, prev);
    await this.propagate(id, extendContext(ctx, id));
  }

  // ===========================================================================
  // SUBSCRIPTIONS
  // ===========================================================================

  /**
   * Subscribe to a cell's value changes. The callback fires every
   * time the cell's value changes (and the optional filter returns
   * true, if provided).
   *
   * Returns a subscription id. Pass it to `unsubscribe` to stop.
   */
  subscribe(
    cellId: CellId,
    callback: (value: CellValue, prev: CellValue) => void | Promise<void>,
    filter?: (value: CellValue, prev: CellValue) => boolean,
  ): string {
    const id = `sub-${++this.subscriptionCounter}`;
    this.subscriptions.set(id, { id, cellId, callback, filter });
    return id;
  }

  /**
   * Stop a subscription. The callback will no longer fire.
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  // ===========================================================================
  // INTROSPECTION
  // ===========================================================================

  /**
   * Get a cell instance by id. Returns undefined if no such cell.
   * Use this to inspect a cell's dependencies, dependents, current value.
   */
  getCell(id: CellId): Cell | undefined {
    return this.cells.get(id);
  }

  /**
   * List all cells, optionally filtered by kind.
   */
  listCells(kind?: CellKind): Cell[] {
    const all = Array.from(this.cells.values());
    return kind ? all.filter(c => c.def.kind === kind) : all;
  }

  /**
   * Get recent evaluation traces (for debugging, time-travel).
   */
  getTraces(limit: number = 100): EvaluationTrace[] {
    return this.traces.slice(-limit);
  }

  /**
   * Export all cell definitions as an array of CellDef. Used by
   * `save` to serialize a runtime state back to YAML.
   */
  exportDefs(): CellDef[] {
    return Array.from(this.cells.values()).map(c => c.def);
  }

  // ===========================================================================
  // INTERNAL: evaluation, propagation, dependencies
  // ===========================================================================

  /**
   * Evaluate an effectful cell (api, program, router). Caches the
   * result by context, notifies subscribers, and traces if enabled.
   */
  private async evaluateEffectful(cell: Cell, ctx: CallerContext, input: unknown): Promise<CellValue> {
    const startedAt = Date.now();
    let result: CellValue;

    if (cell.def.kind === 'api') {
      result = await evaluateApi(cell, ctx, input);
    } else if (cell.def.kind === 'program') {
      result = await evaluateProgram(cell, ctx, input, this);
    } else if (cell.def.kind === 'router') {
      result = await evaluateRouter(cell, ctx, input, this);
    } else {
      result = { data: undefined, status: 'error', error: { message: `not effectful: ${cell.def.kind}` } };
    }

    if (this.options.tracing) {
      this.traces.push({
        cellId: cell.id,
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        context: ctx,
        effects: result.effects,
        error: result.error,
      });
    }

    const prev = cell.value;
    cell.value = result;
    await this.notify(cell.id, result, prev);
    return result;
  }

  /**
   * Recursively refresh formula/value dependencies before computing
   * a formula. This is the "pull" model: we walk down the dep graph
   * and ensure all values are computed.
   */
  private async refreshDeps(cell: Cell, ctx: CallerContext): Promise<void> {
    for (const depId of cell.dependencies) {
      const dep = this.cells.get(depId);
      if (!dep) continue;
      if (dep.def.kind === 'value' && dep.value.status !== 'ready') {
        dep.value = evaluateValue(dep, ctx);
      } else if (dep.def.kind === 'formula' && dep.value.status !== 'ready') {
        await this.refreshDeps(dep, ctx);
        const v = evaluateFormula(dep, ctx, this.cells);
        dep.value = v;
        dep.contextCache.set(contextKey(ctx), v);
      }
    }
  }

  /**
   * Propagate a change to all dependents. Mark formula/value
   * dependents as stale and invalidate their cache. Fire listener
   * dependents whose conditions are met.
   */
  private async propagate(changedId: CellId, ctx: CallerContext): Promise<void> {
    const cell = this.cells.get(changedId);
    if (!cell) return;

    for (const depId of cell.dependents) {
      const dep = this.cells.get(depId);
      if (!dep) continue;
      if (dep.def.kind === 'formula' || dep.def.kind === 'value') {
        dep.value = { ...dep.value, status: 'stale' };
        dep.contextCache.clear();
      }
      await this.propagate(depId, ctx);
    }

    for (const depId of cell.dependents) {
      const dep = this.cells.get(depId);
      if (!dep || dep.def.kind !== 'listener') continue;
      await fireListener(dep, changedId, cell.value, cell.value, this);
    }
  }

  /**
   * Notify all subscribers of a cell change. Subscriptions can have
   * an optional filter that decides whether to fire.
   */
  private async notify(id: CellId, value: CellValue, prev: CellValue): Promise<void> {
    for (const sub of this.subscriptions.values()) {
      if (sub.cellId !== id) continue;
      if (sub.filter && !sub.filter(value, prev)) continue;
      try {
        await sub.callback(value, prev);
      } catch (err) {
        if (process.env.QUILT_DEBUG) {
          console.error(`[quilt] subscription error for ${id}:`, err);
        }
      }
    }
  }

  /**
   * Add a dependency edge: `from` depends on `to`. Updates both
   * the forward index (from.dependencies) and the reverse index
   * (to.dependents).
   */
  private addDep(from: CellId, to: CellRef): void {
    const fromCell = this.cells.get(from);
    const toCell = this.cells.get(to);
    if (!fromCell || !toCell) return;
    fromCell.dependencies.add(to);
    toCell.dependents.add(from);
  }

  /**
   * Naive auto-detection of formula dependencies: scan the
   * expression for any token that matches a known cell id.
   *
   * Good enough for MVP. A real implementation would parse the
   * expression into an AST and walk it.
   */
  private autoDetectDeps(cell: Cell): void {
    if (!cell.def.expr) return;
    const knownIds = new Set(this.cells.keys());
    for (const id of knownIds) {
      if (id === cell.id) continue;
      const re = new RegExp(`\\b${escapeRegex(id)}\\b`);
      if (re.test(cell.def.expr)) {
        this.addDep(cell.id, id);
      }
    }
  }
}

/**
 * Escape a string for safe use inside a RegExp.
 * Used by `autoDetectDeps` when building patterns to match cell ids.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
