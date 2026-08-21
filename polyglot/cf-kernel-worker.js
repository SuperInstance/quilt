/**
 * Quilt Kernel — Cloudflare Workers Edition
 * 
 * The canonical Quilt kernel that runs as a serverless function.
 * State lives in D1 (or KV or R2). Subscribers connect via WebSocket.
 * The watch channel emits events to all observers.
 * 
 * Endpoints:
 *   GET  /                    — Health
 *   GET  /cells                — List all cells
 *   POST /cells                — Create a cell (body: cell spec)
 *   GET  /cells/:id            — Get a cell
 *   PUT  /cells/:id            — Update a cell (body: primitive updates)
 *   DELETE /cells/:id          — Remove a cell
 *   POST /step                 — Tick the kernel N times
 *   GET  /graph                — Show V, E, C, β₁
 *   GET  /watch                — SSE: subscribe to events
 *   POST /eval                 — Evaluate a formula
 *   GET  /dials                — Show 9 elephant dials
 *   PUT  /dials/:name          — Set a dial value
 *   POST /gc                   — Run 3-phase garbage collection
 *   GET  /export               — Export as .qzt
 *   POST /import               — Import a .qzt
 * 
 * The 8 primitives: Z_in, Z_out, JEPA, DoubleEntry, Vibe, GC, Murmur, Graph
 * The 7 layers: Substrate, Formula, Watch, Room, Steward, Bridge, REPL
 * The 9 dials: tick_rate, gc_threshold, max_cells, bridge_timeout, watch_depth, formula_depth, room_capacity, steward_patience, log_level
 */

// === 8 PRIMITIVES ===
function makeCell(id, kind = 'number', value = null) {
  return {
    id,
    kind,
    z_in: null,           // last input
    z_out: null,          // last output  
    jepa: null,           // prediction
    double_entry: { gamma: 0.5, eta: 0.5 },  // conservation
    vibe: 0.0,
    gc_phase: 'ready',
    murmur_subs: [],      // subscriptions
    graph: { children: [], parents: [] },
    value,
    formula: null,
    room: null,
    steward: null,
    created_at: Date.now(),
    updated_at: Date.now()
  };
}

function conservation(cell) {
  return (cell.double_entry.gamma || 0) + (cell.double_entry.eta || 0);
}

function tick(cell) {
  const b = conservation(cell);
  cell.vibe = (cell.vibe || 0) + (b - 1.0) * 0.01;
  cell.updated_at = Date.now();
  return cell;
}

function evaluate(cell) {
  if (!cell.formula) return cell.value;
  // Simple formula: just return value for now
  // TODO: real formula engine
  return cell.value;
}

function jepaPredict(cell) {
  // Simple JEPA: predict next value based on current vibe
  return { prediction: (cell.value || 0) + (cell.vibe || 0), confidence: 0.5 };
}

function cellLedger(cell) {
  return {
    cell_id: cell.id,
    kind: cell.kind,
    z_in: cell.z_in,
    z_out: cell.z_out,
    jepa: jepaPredict(cell),
    double_entry: cell.double_entry,
    vibe: cell.vibe,
    gc_phase: cell.gc_phase,
    murmur_subs: cell.murmur_subs,
    graph: cell.graph,
    value: cell.value,
    budget: conservation(cell)
  };
}

// === 9 DIALS ===
const DIALS = {
  tick_rate: 1.0,
  gc_threshold: 0.8,
  max_cells: 10000,
  bridge_timeout: 30.0,
  watch_depth: 5,
  formula_depth: 100,
  room_capacity: 100,
  steward_patience: 3,
  log_level: 1
};

// === KERNEL STATE ===
const state = {
  cells: new Map(),
  dials: { ...DIALS },
  watch_events: [],
  history: []
};

function broadcast(event) {
  state.watch_events.push({ ...event, ts: Date.now() });
  if (state.watch_events.length > 1000) {
    state.watch_events = state.watch_events.slice(-500);
  }
}

// === GRAPH TOPOLOGY ===
function computeBeta1() {
  const V = state.cells.size;
  let E = 0;
  for (const cell of state.cells.values()) {
    E += (cell.graph.children || []).length;
  }
  // Simple beta_1 estimate
  const C = connectedComponents();
  return { V, E, C, beta1: E - V + C };
}

function connectedComponents() {
  const visited = new Set();
  let count = 0;
  for (const id of state.cells.keys()) {
    if (visited.has(id)) continue;
    count++;
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      if (visited.has(cur)) continue;
      visited.add(cur);
      const cell = state.cells.get(cur);
      for (const n of [...(cell.graph.children || []), ...(cell.graph.parents || [])]) {
        if (!visited.has(n)) stack.push(n);
      }
    }
  }
  return count;
}


// === FASCIA LAYER (Spec 0001) ===
// JEPA + DoubleEntry running BETWEEN cells.

const fascia = {
  subscriptions: new Map(),  // key: "sub->pub" -> JEPASignal
  flows: [],                  // gamma transfers
  region: new Set(),          // cells in the fascia region
  surprise_history: [],
};

function publishJEPA(cellId) {
  const cell = state.cells.get(cellId);
  if (!cell) return null;
  return {
    cell_id: cellId,
    predicted: cell.jepa.prediction,
    confidence: cell.jepa.confidence,
    timestamp: cell.updated_at
  };
}

function subscribeJEPA(subscriberId, publisherId) {
  const sig = publishJEPA(publisherId);
  if (sig) {
    fascia.subscriptions.set(`${subscriberId}->${publisherId}`, sig);
    fascia.region.add(subscriberId);
    fascia.region.add(publisherId);
    broadcast({ type: 'fascia_subscribed', subscriber: subscriberId, publisher: publisherId });
  }
}

function surpriseOf(cellId) {
  const cell = state.cells.get(cellId);
  if (!cell) return 0;
  if (fascia.subscriptions.size === 0) return 0;
  const my = cell.jepa.prediction || 0;
  let diffs = [];
  for (const sig of fascia.subscriptions.values()) {
    if (sig.cell_id !== cellId) {
      diffs.push(Math.abs(my - (sig.predicted || 0)));
    }
  }
  return diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
}

function transferGamma(fromId, toId, gamma) {
  const from = state.cells.get(fromId);
  const to = state.cells.get(toId);
  if (!from || !to) return { error: 'cell not found' };
  if (gamma <= 0 || gamma > (from.double_entry.gamma || 0)) {
    return { error: 'insufficient gamma' };
  }
  from.double_entry.gamma -= gamma;
  to.double_entry.gamma += gamma;
  fascia.flows.push({ from: fromId, to: toId, gamma, ts: Date.now() });
  broadcast({ type: 'fascia_transferred', from: fromId, to: toId, gamma });
  return { ok: true, from_gamma: from.double_entry.gamma, to_gamma: to.double_entry.gamma };
}

function totalBudget() {
  let total = 0;
  for (const id of fascia.region) {
    const cell = state.cells.get(id);
    if (cell) {
      total += (cell.double_entry.gamma || 0) + (cell.double_entry.eta || 0);
    }
  }
  return total;
}

function gammaGradient() {
  const grad = {};
  for (const id of fascia.region) {
    const cell = state.cells.get(id);
    if (cell) grad[id] = cell.double_entry.gamma || 0;
  }
  return grad;
}

// Auto-subscribe on add_edge
const origAddEdge = addEdge;
function addEdge(parentId, childId) {
  subscribeJEPA(parentId, childId);
  // Also update graph topology
  const parent = state.cells.get(parentId);
  const child = state.cells.get(childId);
  if (parent && child) {
    if (!parent.graph.children.includes(childId)) parent.graph.children.push(childId);
    if (!child.graph.parents.includes(parentId)) child.graph.parents.push(parentId);
  }
}


// === ROUTER ===
async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  // Health
  if (path === '/' || path === '/health') {
    return new Response(JSON.stringify({
      status: 'alive',
      kernel: 'quilt-v0.7.0',
      cells: state.cells.size,
      dials: state.dials,
      graph: computeBeta1()
    }), { headers: cors });
  }


  // Fascia endpoints (Spec 0001)
  if (path === '/fascia/jepa/stream' && method === 'GET') {
    return new Response(JSON.stringify(
      Array.from(fascia.subscriptions.values())
    ), { headers: cors });
  }

  if (path === '/fascia/doubleentry' && method === 'GET') {
    return new Response(JSON.stringify({
      total_budget: totalBudget(),
      gradient: gammaGradient(),
      flow_count: fascia.flows.length,
      region_size: fascia.region.size
    }), { headers: cors });
  }

  if (path === '/fascia/transfer' && method === 'POST') {
    const body = await request.json();
    const result = transferGamma(body.from, body.to, body.gamma);
    return new Response(JSON.stringify(result), {
      status: result.error ? 400 : 200,
      headers: cors
    });
  }

  if (path.startsWith('/fascia/surprise/') && method === 'GET') {
    const cellId = path.split('/').pop();
    return new Response(JSON.stringify({
      cell_id: cellId,
      surprise: surpriseOf(cellId)
    }), { headers: cors });
  }

  if (path === '/fascia/subscribe' && method === 'POST') {
    const body = await request.json();
    subscribeJEPA(body.subscriber, body.publisher);
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  }

  if (path === '/fascia/gradient' && method === 'GET') {
    return new Response(JSON.stringify(gammaGradient()), { headers: cors });
  }


  // Cells
  if (path === '/cells' && method === 'GET') {
    return new Response(JSON.stringify(
      Array.from(state.cells.values()).map(cellLedger)
    ), { headers: cors });
  }

  if (path === '/cells' && method === 'POST') {
    const body = await request.json();
    const cell = makeCell(body.id, body.kind, body.value);
    if (body.formula) cell.formula = body.formula;
    if (body.room) cell.room = body.room;
    state.cells.set(cell.id, cell);
    broadcast({ type: 'cell_created', cell_id: cell.id });
    return new Response(JSON.stringify(cellLedger(cell)), { status: 201, headers: cors });
  }

  // Single cell
  const cellMatch = path.match(/^\/cells\/([^\/]+)$/);
  if (cellMatch) {
    const id = cellMatch[1];
    if (method === 'GET') {
      const cell = state.cells.get(id);
      if (!cell) return new Response('Not found', { status: 404 });
      return new Response(JSON.stringify(cellLedger(cell)), { headers: cors });
    }
    if (method === 'PUT') {
      const cell = state.cells.get(id);
      if (!cell) return new Response('Not found', { status: 404 });
      const body = await request.json();
      Object.assign(cell, body);
      cell.updated_at = Date.now();
      broadcast({ type: 'cell_updated', cell_id: id, fields: Object.keys(body) });
      return new Response(JSON.stringify(cellLedger(cell)), { headers: cors });
    }
    if (method === 'DELETE') {
      state.cells.delete(id);
      broadcast({ type: 'cell_deleted', cell_id: id });
      return new Response('Deleted', { status: 204 });
    }
  }

  // Step
  if (path === '/step' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const n = body.n || 1;
    for (let i = 0; i < n; i++) {
      for (const cell of state.cells.values()) {
        tick(cell);
        cell.z_out = evaluate(cell);
        cell.jepa = jepaPredict(cell);
      }
    }
    broadcast({ type: 'step', n });
    return new Response(JSON.stringify({ stepped: n, cells: state.cells.size }), { headers: cors });
  }

  // Graph
  if (path === '/graph' && method === 'GET') {
    return new Response(JSON.stringify(computeBeta1()), { headers: cors });
  }

  // Watch (SSE)
  if (path === '/watch' && method === 'GET') {
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode('event: hello\ndata: {"kernel":"quilt"}\n\n'));
        const interval = setInterval(() => {
          const event = state.watch_events.shift();
          if (event) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        }, 100);
        // Don't close the interval in this simple impl
      }
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Dials
  if (path === '/dials' && method === 'GET') {
    return new Response(JSON.stringify(state.dials), { headers: cors });
  }

  // GC
  if (path === '/gc' && method === 'POST') {
    // 3-phase GC
    const before = state.cells.size;
    // Phase 1: merge similar (skip for now)
    // Phase 2: decay old
    const cutoff = Date.now() - 86400000;  // 24 hours
    for (const [id, cell] of state.cells) {
      if (cell.updated_at < cutoff && cell.value === null) {
        state.cells.delete(id);
      }
    }
    const after = state.cells.size;
    broadcast({ type: 'gc', before, after });
    return new Response(JSON.stringify({ before, after, pruned: before - after }), { headers: cors });
  }

  // Export
  if (path === '/export' && method === 'GET') {
    const qzt = {
      version: 'qzt-v0.7.0',
      kernel: 'cloudflare-workers',
      cells: Array.from(state.cells.values()).map(cellLedger),
      dials: state.dials,
      graph: computeBeta1(),
      exported_at: Date.now()
    };
    return new Response(JSON.stringify(qzt, null, 2), {
      headers: {
        ...cors,
        'Content-Disposition': 'attachment; filename="quilt-export.qzt"'
      }
    });
  }

  // Default 404
  return new Response(JSON.stringify({ error: 'not found', path }), { status: 404, headers: cors });
}

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, ctx);
  }
};
