// per-context memoization. Exposes a QuiltLite class via window.QuiltEngine
// (kept that name for app compat) — a minimal browser-friendly version.
//
// Design goals:
//   1. Self-contained (no external deps, no build, no fetch).
//   2. Readable end-to-end in one file.
//   3. The full power of Quilt in the browser.
//
// The formula DSL is JS itself, with a `with(cells)` block —
// so the user can use any JS syntax. Program cells use
// AsyncFunction. Router cells pick a destination by evaluating
// rule conditions.

'use strict';

// Wrap the whole module in an IIFE so the helper functions (compileFormula,
// evalFormula, parseSheet, etc.) don't pollute the global scope when
// this file is inlined into an HTML page with other scripts.
(function () {

// =============================================================================
// Types — defined as plain JS shapes (no TypeScript runtime).
// =============================================================================

const CellStatus = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  STALE: 'stale',
  ERROR: 'error',
  COMPUTING: 'computing',
});

function makeCell(id, def) {
  return {
    id,
    def: { kind: 'value', value: null, ...def },
    value: { data: undefined, status: CellStatus.IDLE, error: null, computedAt: null },
    dependencies: new Set(),
    dependents: new Set(),
    contextCache: new Map(),
  };
}

function makeCellValue(data, status = CellStatus.READY, error = null) {
  return { data, status, error, computedAt: status === CellStatus.READY ? Date.now() : null };
}

function cloneCellValue(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(cloneCellValue);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = cloneCellValue(v[k]);
    return out;
  }
  return v;
}

// =============================================================================
// Sheet parser — minimal YAML subset for Quilt sheets.
// We support the document format we ship in examples/.
//   id, title, description (block scalar), version, cells (list of objects).
//   Each cell: id, kind, value, expr, code, endpoint, source, default, deps.
//   Block scalars (|) for multi-line strings.
//   No anchors, no flow-style maps, no !!tags — keep it simple.
// =============================================================================

function parseSheet(yaml) {
  const sheet = { cells: [], title: null, description: null, version: null };
  const lines = yaml.split('\n');

  // Walk through lines, tracking current top-level key.
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line || line.match(/^\s*#/)) { i++; continue; }

    // Top-level key.
    const topM = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (topM) {
      const key = topM[1];
      let v = topM[2].trim();
      if (v === '' || v === '|') {
        // Block scalar or list follows.
        if (key === 'cells') {
          i++;
          sheet.cells = readCells(lines, i);
          // skip past the cells block
          i = skipCellsBlock(lines, i);
          continue;
        }
        if (v === '|') {
          i++;
          const block = [];
          while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
            block.push(lines[i].replace(/^  /, ''));
            i++;
          }
          sheet[key] = block.join('\n').replace(/\n+$/, '');
          continue;
        }
        // Empty value: just skip
        i++;
        continue;
      }
      // Scalar value.
      sheet[key] = coerceScalar(v);
      i++;
      continue;
    }
    i++;
  }
  return sheet;
}

function coerceScalar(v) {
  if (v === '~' || v === 'null' || v === '') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v.startsWith('{') && v.endsWith('}')) {
    return parseFlowMap(v);
  }
  return v;
}

function parseFlowMap(v) {
  // Naive inline flow-style map: { key: value, key: value }
  const inner = v.slice(1, -1).trim();
  if (inner === '') return {};
  const obj = {};
  // Split on commas not inside quotes.
  const parts = [];
  let depth = 0, cur = '', inStr = null;
  for (const c of inner) {
    if (inStr) {
      cur += c;
      if (c === inStr) inStr = null;
    } else if (c === '"' || c === "'") {
      cur += c;
      inStr = c;
    } else if (c === '{' || c === '[') { depth++; cur += c; }
    else if (c === '}' || c === ']') { depth--; cur += c; }
    else if (c === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += c;
  }
  if (cur) parts.push(cur);
  for (const part of parts) {
    const colonAt = part.indexOf(':');
    if (colonAt === -1) continue;
    const k = part.slice(0, colonAt).trim();
    const val = part.slice(colonAt + 1).trim();
    obj[k] = coerceScalar(val);
  }
  return obj;
}

function skipCellsBlock(lines, i) {
  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/^[A-Za-z_]/) && line.match(/^[\w-]+:/)) return i; // back at top level
    i++;
  }
  return i;
}

function readCells(lines, start) {
  const cells = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/^\s*#/)) { i++; continue; }
    // New top-level key — stop.
    if (line.match(/^[A-Za-z_][\w-]*:\s*/)) break;
    // Empty line.
    if (line.trim() === '') { i++; continue; }
    // Cell start: "  - id: foo"
    const cellStart = line.match(/^\s*-\s+id:\s*(.*)$/);
    if (cellStart) {
      const cell = { id: cellStart[1].trim().replace(/^["']|["']$/g, ''), kind: 'value' };
      i++;
      // Read sub-keys.
      while (i < lines.length) {
        const sub = lines[i];
        if (sub.trim() === '') { i++; continue; }
        if (sub.match(/^\s+-\s+id:/)) break; // next cell
        if (sub.match(/^[A-Za-z_][\w-]*:/)) break; // top-level key
        const m = sub.match(/^    (\w+):\s*(.*)$/);
        if (!m) { i++; continue; }
        const k = m[1];
        let v = m[2].trim();
        let brokeAtNextCell = false;
        // Block list: a `key:` followed by `  - item` lines.
        // Example:
        //   rules:
        //     - when: "..."
        //       route: { ... }
        //     - when: "..."
        if (v === '' && lines[i + 1] && lines[i + 1].match(/^      -\s+/)) {
          i++;
          const items = [];
          while (i < lines.length && lines[i].match(/^      -\s+/)) {
            const itemLines = [lines[i].replace(/^      -\s+/, '')];
            i++;
            while (i < lines.length && (lines[i].startsWith('        ') || lines[i] === '')) {
              if (lines[i] === '') break;
              itemLines.push(lines[i].replace(/^        /, ''));
              i++;
            }
            // Parse the item as a mini-YAML object.
            items.push(parseObject(itemLines));
          }
          v = items;
        } else if (v === '' || v === '|') {
          // block scalar (multi-line)
          i++;
          const block = [];
          while (i < lines.length) {
            const b = lines[i];
            if (b === '' || b.startsWith('      ')) {
              block.push(b.replace(/^      /, ''));
              i++;
            } else if (b.match(/^\s*-\s+id:/)) {
              brokeAtNextCell = true;
              break;
            } else if (b.match(/^    \w+:/) || b.match(/^[A-Za-z_][\w-]*:/)) {
              break;
            } else {
              break;
            }
          }
          v = block.join('\n').replace(/\n+$/, '');
        } else if (v === '~' || v === 'null') {
          v = null;
        } else if (v === 'true') {
          v = true;
        } else if (v === 'false') {
          v = false;
        } else if (/^-?\d+$/.test(v)) {
          v = Number(v);
        } else if (/^-?\d+\.\d+$/.test(v)) {
          v = Number(v);
        } else if (v.startsWith('[') && v.endsWith(']')) {
          v = parseInlineList(v);
        } else if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        cell[k] = v;
        if (!brokeAtNextCell) i++;
      }
      cells.push(cell);
      continue;
    }
    i++;
  }
  return cells;
}

function parseInlineList(v) {
  // Naive: [a, b, c] or ["a", "b"]
  const inner = v.slice(1, -1).trim();
  if (inner === '') return [];
  return inner.split(',').map(s => {
    s = s.trim();
    if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
    if (/^-?\d+$/.test(s)) return Number(s);
    return s;
  });
}

function parseObject(lines) {
  // Parse a list of "key: value" lines into an object. Handles
  // inline flow-style maps like `{ cell: greeting.formal }`.
  const obj = {};
  for (const raw of lines) {
    const m = raw.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const k = m[1];
    const v = m[2].trim();
    obj[k] = coerceScalar(v);
  }
  return obj;
}

// =============================================================================
// Formula engine
// =============================================================================

function compileFormula(expr, knownIds, selfId) {
  let body = expr.startsWith('=') ? expr.slice(1) : expr;
  // First pass: substitute all bare cell ids with unique placeholders.
  // This avoids the rewrite interfering with itself when the replacement
  // contains a substring that matches another cell id.
  const sorted = [...knownIds].sort((a, b) => b.length - a.length);
  const subs = new Map();
  let nextPlaceholder = 0;
  for (const id of sorted) {
    if (id === selfId) continue;
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![A-Za-z0-9_.])${safe}(?![A-Za-z0-9_(])`, 'g');
    const placeholder = `__Q${nextPlaceholder++}__`;
    if (re.test(body)) {
      subs.set(placeholder, `cells[${JSON.stringify(id)}]`);
      // Re-create the regex since we used test() (lastIndex moves on /g).
      const re2 = new RegExp(`(?<![A-Za-z0-9_.])${safe}(?![A-Za-z0-9_(])`, 'g');
      body = body.replace(re2, placeholder);
    }
  }
  // Second pass: replace placeholders with the actual cells[...] access.
  for (const [ph, replacement] of subs) {
    body = body.split(ph).join(replacement);
  }
  return new Function('cells', 'abs', 'min', 'max', 'clamp', 'caller',
    `return (${body});`);
}

function evalFormula(cell, ctx, allCells) {
  const knownIds = [...allCells.keys()];
  const fn = compileFormula(cell.def.expr || '', knownIds, cell.id);
  const cellsObj = {};
  for (const [id, other] of allCells) {
    cellsObj[id] = other.value.data;
  }
  const proxy = new Proxy(cellsObj, {
    get(t, p) { return typeof p === 'string' && p in t ? t[p] : undefined; },
    has(t, p) { return typeof p === 'string' && p in t; },
  });
  const caller = ctx || {};
  try {
    const data = fn(proxy, Math.abs, Math.min, Math.max,
      (n, lo, hi) => Math.min(Math.max(n, lo), hi), caller);
    return makeCellValue(data);
  } catch (err) {
    return { data: null, status: CellStatus.ERROR, error: { message: String(err.message || err) }, computedAt: null };
  }
}

// =============================================================================
// Program cell — JS expression or block, async. We use AsyncFunction
// so the user can `await` things. The script gets `runtime` with
// .get/.set/.call/.list and `input` (the call input) and `caller`.
// =============================================================================

async function evalProgram(cell, ctx, input, engine) {
  const code = cell.def.code || '';
  // Pre-evaluate any formula/program dependencies so they're cached
  // before the program runs. This is best-effort; we don't await any
  // top-level await errors that aren't related to the dep itself.
  for (const dep of cell.dependencies) {
    const depCell = engine.cells.get(dep);
    if (depCell && (depCell.def.kind === 'formula' || depCell.def.kind === 'program' || depCell.def.kind === 'value' || depCell.def.kind === 'sensor')) {
      try { await engine.get(dep, ctx); } catch { /* ignore */ }
    }
  }
  try {
    const fn = new Function('runtime', 'input', 'caller',
      `return (async () => { ${code} })();`);
    const runtime = makeProgramRuntime(engine, ctx);
    const result = await fn(runtime, input ?? null, ctx || {});
    return makeCellValue(result === undefined ? null : result);
  } catch (err) {
    return { data: null, status: CellStatus.ERROR, error: { message: String(err.message || err) }, computedAt: null };
  }
}

function makeProgramRuntime(engine, ctx) {
  return {
    get(id) {
      // Synchronous read from the last known value.
      const c = engine.cells.get(id);
      if (!c) return undefined;
      return c.value;
    },
    async set(id, value) {
      await engine.set(id, value, ctx);
      return true;
    },
    async call(id, input) {
      return await engine.call(id, input, ctx);
    },
    list() {
      return engine.listCells().map(c => c.id);
    },
  };
}

// =============================================================================
// Router cell — picks a destination by evaluating rule conditions.
// =============================================================================

async function evalRouter(cell, ctx, input, engine) {
  for (const rule of (cell.def.rules || [])) {
    if (evalRuleCondition(rule.when, ctx, input, engine)) {
      const route = rule.route;
      if (typeof route === 'string') {
        return await engine.call(route, input, ctx);
      } else if (route && typeof route === 'object') {
        if (route.value !== undefined) return makeCellValue(route.value);
        if (route.cell) return await engine.call(route.cell, input, ctx);
        if (route.model) return makeCellValue({ model: route.model, note: 'model swap (not implemented in lite)' });
      }
    }
  }
  return makeCellValue(input ?? null);
}

function evalRuleCondition(when, ctx, input, engine) {
  if (!when) return false;
  const w = when.trim();
  if (w === 'true') return true;
  if (w === 'false') return false;
  // caller.row > N, caller.row == 'X', input == X
  let m = w.match(/^caller\.row\s*([<>=!]+)\s*(.+)$/);
  if (m) {
    const op = m[1];
    const rhs = JSON.parse(m[2].replace(/'/g, '"'));
    return compare(ctx.row, op, rhs);
  }
  m = w.match(/^caller\.column\s*([<>=!]+)\s*(.+)$/);
  if (m) {
    const op = m[1];
    const rhs = JSON.parse(m[2].replace(/'/g, '"'));
    return compare(ctx.column, op, rhs);
  }
  m = w.match(/^input\s*([<>=!]+)\s*(.+)$/);
  if (m) {
    const op = m[1];
    const rhs = JSON.parse(m[2].replace(/'/g, '"'));
    return compare(input, op, rhs);
  }
  // .includes / .equals
  if (w.includes('.includes(')) {
    const [obj, val] = w.split('.includes(');
    const v = val.replace(/\)$/, '').replace(/'/g, '');
    const target = obj.includes('caller.row') ? ctx.row : null;
    if (Array.isArray(target)) return target.includes(v);
  }
  // bare id (cell truthy?)
  const cell = engine.cells.get(w);
  if (cell) return Boolean(cell.value.data);
  return false;
}

function compare(a, op, b) {
  if (op === '==') return a == b;
  if (op === '!=') return a != b;
  if (op === '>') return a > b;
  if (op === '<') return a < b;
  if (op === '>=') return a >= b;
  if (op === '<=') return a <= b;
  return false;
}

// =============================================================================
// API cell — fetches the endpoint. In the browser, we use the
// global `fetch`. Real-world deployments would proxy through a
// CORS-friendly backend; for demo, we handle the `model:` and
// `mcp://` pseudo-endpoints and try fetch for everything else.
// =============================================================================

async function evalApi(cell, ctx, input) {
  const ep = cell.def.endpoint || '';
  const method = (cell.def.method || 'GET').toUpperCase();
  if (ep.startsWith('model:')) {
    return makeCellValue({ model: ep.slice(6), note: 'model endpoint (synthetic in lite)' });
  }
  if (ep.startsWith('mcp://')) {
    return makeCellValue({ mcp: ep.slice(6), note: 'mcp endpoint (synthetic in lite)' });
  }
  try {
    const res = await fetch(ep, {
      method,
      headers: { 'content-type': 'application/json', ...(cell.def.headers || {}) },
      body: (method === 'GET' || method === 'HEAD') ? undefined : JSON.stringify(input),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return makeCellValue({ status: res.status, body });
  } catch (err) {
    return { data: null, status: CellStatus.ERROR, error: { message: 'fetch: ' + err.message }, computedAt: null };
  }
}

// =============================================================================
// Engine
// =============================================================================

class QuiltLite {
  constructor(id) {
    this.id = id || 'quilt';
    this.cells = new Map();
    this.subscriptions = new Map();
    this._subCounter = 0;
  }

  defineCell(def) {
    if (this.cells.has(def.id)) throw new Error(`cell already defined: ${def.id}`);
    let initial = { data: undefined, status: CellStatus.IDLE, error: null, computedAt: null };
    if (def.value !== undefined) {
      initial = makeCellValue(cloneCellValue(def.value));
    } else if (def.kind === 'sensor' && def.default !== undefined) {
      initial = makeCellValue(cloneCellValue(def.default));
    }
    const cell = makeCell(def.id, def);
    cell.value = initial;
    this.cells.set(def.id, cell);
    return cell;
  }

  loadSheet(sheet) {
    this.cells.clear();
    for (const def of sheet.cells) this.defineCell(def);
    // First pass: register explicit deps.
    for (const cell of this.cells.values()) {
      for (const dep of (cell.def.deps || [])) this._addDep(cell.id, dep);
    }
    // Second pass: auto-detect formula deps from the expression.
    for (const cell of this.cells.values()) {
      if (cell.def.kind === 'formula' && cell.def.expr) {
        this._autoDetectDeps(cell);
      }
    }
    // Third pass: auto-detect program deps from runtime.get('...') calls.
    for (const cell of this.cells.values()) {
      if (cell.def.kind === 'program' && cell.def.code) {
        this._autoDetectProgramDeps(cell);
      }
    }
  }

  _autoDetectProgramDeps(cell) {
    // Find all runtime.get("...") or runtime.get('...') or
    // runtime.set("...", ...) or runtime.call("...", ...) calls.
    const re = /runtime\.(get|set|call)\(\s*['"]([^'"]+)['"]/g;
    const seen = new Set();
    let m;
    while ((m = re.exec(cell.def.code || '')) !== null) {
      const id = m[2];
      if (id === cell.id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      if (this.cells.has(id)) this._addDep(cell.id, id);
    }
  }

  _autoDetectDeps(cell) {
    const expr = (cell.def.expr || '').replace(/^=/, '');
    for (const [id, other] of this.cells) {
      if (id === cell.id) continue;
      if (this._exprContainsToken(expr, id)) this._addDep(cell.id, id);
    }
  }

  _tokenizeIds(expr) {
    // Match bare identifiers (not strings, not property access).
    return [...new Set(expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [])];
  }

  _exprContainsToken(expr, id) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![A-Za-z0-9_])${safe}(?![A-Za-z0-9_.])`);
    return re.test(expr);
  }

  _addDep(from, to) {
    if (!this.cells.has(from) || !this.cells.has(to)) return;
    this.cells.get(from).dependencies.add(to);
    this.cells.get(to).dependents.add(from);
  }

  listCells() { return [...this.cells.values()]; }

  getCell(id) { return this.cells.get(id); }

  subscribe(cellId) {
    if (!this.cells.has(cellId)) throw new Error('cell not found: ' + cellId);
    const subId = 'sub-' + (++this._subCounter);
    const sub = { id: subId, cellId, callback: null };
    this.subscriptions.set(subId, sub);
    return sub;
  }

  unsubscribe(subId) { this.subscriptions.delete(subId); }

  subscribeAll(callback) {
    const subId = 'sub-all-' + (++this._subCounter);
    this.subscriptions.set(subId, { id: subId, cellId: '*', callback });
    return subId;
  }

  _notifyChange(cellId) {
    const cell = this.cells.get(cellId);
    if (!cell) return;
    const event = { cellId, newValue: cell.value };
    for (const [id, sub] of this.subscriptions) {
      if (sub.cellId === '*' || sub.cellId === cellId) {
        if (sub.callback) sub.callback(event);
      }
    }
  }

  async get(id, ctx) {
    ctx = ctx || {};
    const cell = this.cells.get(id);
    if (!cell) return { data: null, status: CellStatus.ERROR, error: { message: 'no such cell: ' + id }, computedAt: null };
    const fullCtx = { ...ctx, caller: cell.id };
    const key = JSON.stringify(fullCtx);
    if (cell.contextCache.has(key) && cell.contextCache.get(key).status === CellStatus.READY && !cell.contextCache.get(key).error) {
      // Return a fresh clone so callers can mutate freely.
      return cloneCellValue(cell.contextCache.get(key));
    }
    let result;
    switch (cell.def.kind) {
      case 'value': {
        // Use the latest known value (which set() updates), falling back to def.
        const data = cell.value.data !== undefined ? cell.value.data : cell.def.value;
        result = makeCellValue(cloneCellValue(data));
        break;
      }
      case 'formula': result = this._evalFormulaChain(cell, fullCtx); break;
      case 'api': result = await evalApi(cell, fullCtx, null); break;
      case 'program': result = await evalProgram(cell, fullCtx, null, this); break;
      case 'router': result = await evalRouter(cell, fullCtx, null, this); break;
      case 'sensor':
      case 'io':
      case 'listener':
        result = makeCellValue(cloneCellValue(cell.value.data));
        result.status = cell.value.status;
        result.error = cell.value.error;
        result.computedAt = cell.value.computedAt;
        break;
      default:
        result = { data: null, status: CellStatus.ERROR, error: { message: 'unknown kind: ' + cell.def.kind }, computedAt: null };
    }
    cell.contextCache.set(key, result);
    cell.value = result;
    cell.lastContext = fullCtx;
    return cloneCellValue(result);
  }

  _evalFormulaChain(cell, ctx) {
    // Pre-evaluate formula dependencies (recursively).
    for (const dep of cell.dependencies) {
      const depCell = this.cells.get(dep);
      if (depCell && depCell.def.kind === 'formula') {
        // Recursive: will be cached.
        this.get(dep, ctx);
      }
    }
    return evalFormula(cell, ctx, this.cells);
  }

  async set(id, value, ctx) {
    const cell = this.cells.get(id);
    if (!cell) throw new Error('no such cell: ' + id);
    cell.value = makeCellValue(cloneCellValue(value));
    cell.contextCache.clear();
    this._notifyChange(id);
    // Invalidate transitive dependents — mark stale and clear caches.
    const stack = [...cell.dependents];
    const seen = new Set();
    while (stack.length) {
      const depId = stack.pop();
      if (seen.has(depId)) continue;
      seen.add(depId);
      const dep = this.cells.get(depId);
      if (dep) {
        dep.value = { data: null, status: CellStatus.STALE, error: null, computedAt: null };
        dep.contextCache.clear();
        for (const t of dep.dependents) stack.push(t);
      }
    }
  }

  async push(id, data) {
    return this.set(id, data);
  }

  async call(id, input, ctx) {
    return this.get(id, ctx);
  }

  // Serialize the engine state to a portable JSON object.
  static fromJSON(snapshot) {
    const e = new QuiltLite(snapshot.id);
    e.cells.clear();
    for (const c of snapshot.cells) {
      const cell = makeCell(c.id, c.def);
      cell.value = c.value;
      cell.contextCache = new Map(Object.entries(c.contextCache || {}));
      e.cells.set(c.id, cell);
    }
    // Re-establish dep edges.
    for (const cell of e.cells.values()) {
      for (const depId of (cell.def.deps || [])) e._addDep(cell.id, depId);
    }
    for (const cell of e.cells.values()) {
      if (cell.def.kind === 'formula' && cell.def.expr) e._autoDetectDeps(cell);
    }
    return e;
  }

  // Serialize the engine state to a portable JSON object.
  toJSON() {
    return {
      id: this.id,
      cells: this.listCells().map(c => ({
        id: c.id,
        def: c.def,
        value: c.value,
        contextCache: Object.fromEntries(c.contextCache),
      })),
    };
  }
}

// =============================================================================
// Export
// =============================================================================

const QuiltLiteExports = { QuiltLite, parseSheet, CellStatus };
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuiltLiteExports;
}
if (typeof window !== 'undefined') {
  window.QuiltEngine = QuiltLite;
  window.QuiltLite = QuiltLite;
  window.parseSheet = parseSheet;
  window.CellStatus = CellStatus;
}

})();  // end IIFE
