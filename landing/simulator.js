/* =====================================================================
   Quilt Live Simulator — runs entirely in the browser.
   A vanilla-JS port of the engine for demo purposes.
   ===================================================================== */

// =====================================================================
//  PRESETS — the example sheets the user can pick from
// =====================================================================

const PRESETS = {
  'boat-autopilot': {
    source: `id: boat-autopilot
title: "Voice-Controlled Autopilot"

cells:
  - id: compass.heading
    kind: sensor
    source: "nmea:/dev/ttyUSB0"
    description: "Current boat heading"

  - id: desired.heading
    kind: value
    value: 180
    description: "Where we want to go"

  - id: heading.error
    kind: formula
    expr: "=((desired.heading - compass.heading + 540) % 360) - 180"
    description: "Signed shortest-path error"

  - id: rudder.gain
    kind: value
    value: 0.5

  - id: rudder.command
    kind: program
    code: |
      const e = (await runtime.get('heading.error')).data || 0;
      const g = (await runtime.get('rudder.gain')).data || 0.5;
      return { angle: clamp(e * g, -30, 30) };

  - id: alert.fired
    kind: listener
    watch: [heading.error]
    action: log.alert

  - id: log.alert
    kind: program
    code: |
      return { severity: 'warn', message: 'Off course!', at: Date.now() };

  - id: model.router
    kind: router
    rules:
      - when: 'caller.row > 10'
        route: { cell: 'models.precise' }
      - when: 'true'
        route: { cell: 'models.fast' }

  - id: models.fast
    kind: value
    value: "gpt-4o-mini"
  - id: models.precise
    kind: value
    value: "gpt-4o"
`,
    actions: [
      {
        title: 'Push compass reading',
        desc: 'Simulate a heading sensor push',
        fields: [
          { type: 'number', id: 'heading', label: 'Heading (deg)', value: 195 },
        ],
        run: (engine, values) => engine.push('compass.heading', parseFloat(values.heading)),
      },
      {
        title: 'Change desired heading',
        desc: 'Set where you want to go',
        fields: [
          { type: 'number', id: 'desired', label: 'Desired (deg)', value: 180 },
        ],
        run: (engine, values) => engine.set('desired.heading', parseFloat(values.desired)),
      },
      {
        title: 'Tune rudder gain',
        desc: 'Change the PID gain',
        fields: [
          { type: 'number', id: 'gain', label: 'Gain', value: 0.5, step: 0.1 },
        ],
        run: (engine, values) => engine.set('rudder.gain', parseFloat(values.gain)),
      },
    ],
  },

  'model-router': {
    source: `id: model-router
title: "Caller-Aware Model Router"

cells:
  - id: models.fast
    kind: value
    value: "gpt-4o-mini"

  - id: models.precise
    kind: value
    value: "gpt-4o"

  - id: models.premium
    kind: value
    value: "claude-opus-4"

  - id: prompts.system
    kind: value
    value: "You are a helpful assistant."

  - id: prompts.premium
    kind: value
    value: "You are an expert."

  - id: router.model
    kind: router
    rules:
      - when: 'caller.row > 100'
        route: { cell: 'models.premium' }
      - when: 'caller.row > 10'
        route: { cell: 'models.precise' }
      - when: 'true'
        route: { cell: 'models.fast' }

  - id: router.prompt
    kind: router
    rules:
      - when: 'caller.identity && caller.identity.tags && caller.identity.tags.includes("premium")'
        route: { cell: 'prompts.premium' }
      - when: 'true'
        route: { cell: 'prompts.system' }

  - id: ask
    kind: program
    code: |
      const model = await runtime.call('router.model');
      const prompt = await runtime.call('router.prompt');
      return {
        routed_model: model.data,
        routed_prompt: prompt.data,
      };
`,
    actions: [
      {
        title: 'Call router as different rows',
        desc: 'See how the model changes based on caller.row',
        fields: [
          { type: 'number', id: 'row', label: 'Caller row', value: 5 },
        ],
        run: async (engine, values) => {
          const row = parseInt(values.row);
          const result = await engine.call('router.model', undefined, { row, timestamp: Date.now() });
          alert(`Row ${row} → ${result.data}`);
        },
      },
      {
        title: 'Call as premium user',
        desc: 'Premium tag routes to expert prompt',
        fields: [],
        run: async (engine) => {
          const result = await engine.call('router.prompt', undefined, {
            identity: { id: 'u1', type: 'human', tags: ['premium'] },
            timestamp: Date.now(),
          });
          alert(`Premium user → "${result.data}"`);
        },
      },
    ],
  },

  'sensor-anomaly': {
    source: `id: sensor-anomaly
title: "Self-Tuning Anomaly Detector"

cells:
  - id: sensor.temp
    kind: sensor
    source: "simulated"

  - id: threshold
    kind: value
    value: 2.5

  - id: rolling.mean
    kind: program
    code: |
      const x = (await runtime.get('sensor.temp')).data || 0;
      const prev = (await runtime.get('rolling.mean')).data || 0;
      return prev * 0.95 + x * 0.05;

  - id: surprise
    kind: formula
    expr: "=abs(sensor.temp - rolling.mean) / 5"

  - id: should_escalate
    kind: formula
    expr: "=surprise > threshold"

  - id: alert
    kind: program
    code: |
      return {
        severity: 'critical',
        message: 'Anomaly detected',
        at: Date.now(),
      };

  - id: alert.listener
    kind: listener
    watch: [should_escalate]
    action: alert
`,
    actions: [
      {
        title: 'Push normal reading',
        desc: 'Around the running mean (e.g. 50)',
        fields: [
          { type: 'number', id: 'temp', label: 'Temperature', value: 50, step: 0.5 },
        ],
        run: (engine, values) => engine.push('sensor.temp', parseFloat(values.temp)),
      },
      {
        title: 'Push anomaly',
        desc: 'Far from the running mean',
        fields: [
          { type: 'number', id: 'temp', label: 'Temperature', value: 90, step: 1 },
        ],
        run: (engine, values) => engine.push('sensor.temp', parseFloat(values.temp)),
      },
      {
        title: 'Tune threshold',
        desc: 'Change when to escalate',
        fields: [
          { type: 'number', id: 'threshold', label: 'Z-score threshold', value: 2.5, step: 0.5 },
        ],
        run: (engine, values) => engine.set('threshold', parseFloat(values.threshold)),
      },
    ],
  },

  'agent-dashboard': {
    source: `id: agent-dashboard
title: "Agent Mission Control"

cells:
  - id: tasks.total
    kind: value
    value: 3

  - id: tasks.done
    kind: value
    value: 0

  - id: tasks.in_progress
    kind: value
    value: 0

  - id: progress.pct
    kind: formula
    expr: "=100 * tasks.done / tasks.total"

  - id: status
    kind: router
    rules:
      - when: 'progress.pct === 100'
        route: { value: "✅ All done" }
      - when: 'progress.pct > 50'
        route: { value: "🟢 On track" }
      - when: 'progress.pct > 0'
        route: { value: "🟡 Started" }
      - when: 'true'
        route: { value: "⚪ Not started" }

  - id: agent.name
    kind: value
    value: "Claude Code"
`,
    actions: [
      {
        title: 'Mark task done',
        desc: 'Increment done, decrement in_progress',
        fields: [],
        run: async (engine) => {
          const done = (await engine.get('tasks.done')).data || 0;
          const inProg = (await engine.get('tasks.in_progress')).data || 0;
          await engine.set('tasks.done', done + 1);
          await engine.set('tasks.in_progress', Math.max(0, inProg - 1));
        },
      },
      {
        title: 'Start a task',
        desc: 'Increment in_progress (if not all done)',
        fields: [],
        run: async (engine) => {
          const done = (await engine.get('tasks.done')).data || 0;
          const total = (await engine.get('tasks.total')).data || 0;
          if (done < total) {
            const inProg = (await engine.get('tasks.in_progress')).data || 0;
            await engine.set('tasks.in_progress', inProg + 1);
          }
        },
      },
      {
        title: 'Reset',
        desc: 'All tasks back to pending',
        fields: [],
        run: async (engine) => {
          await engine.set('tasks.done', 0);
          await engine.set('tasks.in_progress', 0);
        },
      },
    ],
  },
};

// =====================================================================
//  TINY ENGINE — vanilla JS, browser-only
// =====================================================================

class MiniEngine {
  constructor() {
    this.cells = new Map();
    this.evalCount = 0;
  }

  loadSheet(sheet) {
    this.cells.clear();
    for (const def of sheet.cells) {
      this.cells.set(def.id, {
        def,
        value: { data: undefined, status: 'idle' },
        deps: new Set(),
        dependents: new Set(),
        contextCache: new Map(),
      });
    }
    // Build deps
    for (const cell of this.cells.values()) {
      if (cell.def.kind === 'formula' && cell.def.expr) {
        for (const id of this.cells.keys()) {
          if (id === cell.def.id) continue;
          if (new RegExp('\\b' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(cell.def.expr)) {
            cell.deps.add(id);
            this.cells.get(id).dependents.add(cell.def.id);
          }
        }
      }
      for (const dep of cell.def.deps || []) {
        cell.deps.add(dep);
        if (this.cells.has(dep)) this.cells.get(dep).dependents.add(cell.def.id);
      }
    }
  }

  async get(id, ctx = {}) {
    ctx = { ...ctx, timestamp: Date.now() };
    const cell = this.cells.get(id);
    if (!cell) return { data: undefined, status: 'error', error: { message: 'no such cell' } };

    if (cell.def.kind === 'value') {
      return { data: cell.def.value, status: 'ready', computedAt: Date.now() };
    }

    if (cell.def.kind === 'formula') {
      const cellValues = {};
      for (const [cid, c] of this.cells) cellValues[cid] = c.value.data;
      const cellProxy = new Proxy(cellValues, {
        get(t, p) { return typeof p === 'string' && p in t ? t[p] : undefined; },
      });
      try {
        const body = cell.def.expr.startsWith('=') ? cell.def.expr.slice(1) : cell.def.expr;
        // Transform cell ids
        let transformed = body;
        for (const cid of this.cells.keys()) {
          const safe = cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          transformed = transformed.replace(
            new RegExp(`(?<![A-Za-z0-9_])${safe}(?![A-Za-z0-9_])`, 'g'),
            `cells[${JSON.stringify(cid)}]`,
          );
        }
        const fn = new Function('cells', 'clamp', 'abs', 'caller', `with (cells) { return (${transformed}); }`);
        const result = fn(cellProxy, (n, lo, hi) => Math.min(Math.max(n, lo), hi), Math.abs, ctx);
        this.evalCount++;
        cell.value = { data: result, status: 'ready', computedAt: Date.now() };
        return cell.value;
      } catch (err) {
        return { data: undefined, status: 'error', error: { message: err.message } };
      }
    }

    if (cell.def.kind === 'program') {
      try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction('input', 'caller', 'runtime', 'clamp', 'abs', cell.def.code);
        const runtime = {
          get: (id) => this.get(id, ctx),
          set: (id, v) => this.set(id, v, ctx),
          call: (id, input) => this.call(id, input, ctx),
        };
        const result = await fn(undefined, ctx, runtime, (n, lo, hi) => Math.min(Math.max(n, lo), hi), Math.abs);
        this.evalCount++;
        cell.value = { data: result, status: 'ready', computedAt: Date.now() };
        return cell.value;
      } catch (err) {
        return { data: undefined, status: 'error', error: { message: err.message } };
      }
    }

    if (cell.def.kind === 'router') {
      for (const rule of cell.def.rules || []) {
        if (this.evalWhen(rule.when, ctx)) {
          if (typeof rule.route === 'object' && 'cell' in rule.route) {
            return await this.call(rule.route.cell, undefined, ctx);
          }
          if (typeof rule.route === 'object' && 'value' in rule.route) {
            cell.value = { data: rule.route.value, status: 'ready', computedAt: Date.now() };
            return cell.value;
          }
        }
      }
      cell.value = { data: undefined, status: 'ready', computedAt: Date.now() };
      return cell.value;
    }

    return cell.value;
  }

  evalWhen(when, ctx) {
    try {
      const caller = { row: ctx.row, column: ctx.column, identity: ctx.identity, metadata: ctx.metadata };
      const expr = when.replace(/(\w+)\s+contains\s+"([^"]+)"/g, 'Array.isArray($1) && $1.includes("$2")');
      const fn = new Function('caller', `return (${expr});`);
      return Boolean(fn(caller));
    } catch { return false; }
  }

  async set(id, value, ctx = {}) {
    const cell = this.cells.get(id);
    if (!cell) return;
    cell.value = { data: value, status: 'ready', computedAt: Date.now() };
    cell.contextCache.clear();
    this.propagate(id);
  }

  async push(id, data) {
    const cell = this.cells.get(id);
    if (!cell) return;
    cell.value = { data, status: 'ready', computedAt: Date.now() };
    this.propagate(id);
  }

  async call(id, input, ctx = {}) {
    return this.get(id, ctx);
  }

  propagate(changedId) {
    const cell = this.cells.get(changedId);
    if (!cell) return;
    for (const depId of cell.dependents) {
      const dep = this.cells.get(depId);
      if (!dep) continue;
      if (dep.def.kind === 'formula' || dep.def.kind === 'value') {
        dep.value = { ...dep.value, status: 'stale' };
      }
      this.propagate(depId);
    }
  }

  // Tiny YAML parser (handles the small subset we use)
  parseYAML(source) {
    const lines = source.split('\n');
    let id = 'untitled';
    let title = '';
    const cells = [];
    let current = null;
    let currentArray = null;
    let inMultiline = false;
    let multilineBuf = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.replace(/#.*$/, '').trimEnd();

      if (trimmed.startsWith('id:')) id = trimmed.slice(3).trim();
      else if (trimmed.startsWith('title:')) title = trimmed.slice(6).trim().replace(/^"|"$/g, '');
      else if (trimmed.match(/^-\s*id:/)) {
        if (current) cells.push(current);
        current = { id: trimmed.replace(/^-\s*id:\s*/, '').trim() };
        currentArray = current;
      } else if (current && trimmed.match(/^\s+\w+:/)) {
        const m = trimmed.match(/^\s+(\w+):\s*(.*)$/);
        if (m) {
          const [, key, value] = m;
          if (value === '|' || value === '>') {
            inMultiline = true;
            multilineBuf = [];
            current[key] = '';
            current._multiKey = key;
          } else if (value) {
            current[key] = this.parseValue(value);
          } else {
            current[key] = '';
          }
        }
      } else if (inMultiline && trimmed && !trimmed.match(/^\s{8,}/)) {
        // End of multiline
        inMultiline = false;
        if (current._multiKey) {
          current[current._multiKey] = multilineBuf.join('\n');
          delete current._multiKey;
        }
      } else if (inMultiline) {
        multilineBuf.push(trimmed.replace(/^\s{6}/, ''));
      }
    }
    if (current) cells.push(current);
    return { id, title, cells };
  }

  parseValue(s) {
    s = s.trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~') return null;
    if (s.match(/^-?\d+$/)) return parseInt(s);
    if (s.match(/^-?\d+\.\d+$/)) return parseFloat(s);
    if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
    if (s.startsWith('[') && s.endsWith(']')) {
      try { return JSON.parse(s.replace(/'/g, '"')); } catch { return s; }
    }
    if (s.startsWith('{') && s.endsWith('}')) {
      try { return JSON.parse(s); } catch { return s; }
    }
    return s;
  }
}

// =====================================================================
//  RENDER — the visual side
// =====================================================================

let engine = new MiniEngine();
let currentPreset = 'boat-autopilot';

function render() {
  renderRuntime();
  renderGraph();
  renderStats();
  renderActions();
}

function renderRuntime() {
  const grid = document.getElementById('runtime-grid');
  grid.innerHTML = '';
  for (const cell of engine.cells.values()) {
    const div = document.createElement('div');
    div.className = 'runtime-cell';
    div.dataset.id = cell.def.id;
    const kindClass = `kind-${cell.def.kind}`;
    const statusClass = `status-${cell.value.status}`;
    const valueStr = formatValue(cell.value);
    div.innerHTML = `
      <div class="runtime-cell-id">
        <span class="runtime-cell-kind ${kindClass}">${cell.def.kind}</span>
        ${escapeHtml(cell.def.id)}
      </div>
      <div class="runtime-cell-value">${escapeHtml(valueStr)}</div>
      <div class="runtime-cell-status ${statusClass}"></div>
    `;
    grid.appendChild(div);
  }
}

function formatValue(v) {
  if (v === undefined) return '∅';
  if (v === null) return 'null';
  if (typeof v === 'string') return v.length > 60 ? v.slice(0, 60) + '…' : v;
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
  }
  return String(v);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderGraph() {
  const svg = document.getElementById('graph-svg');
  const cells = Array.from(engine.cells.values());
  if (cells.length === 0) {
    svg.innerHTML = '<text x="600" y="200" text-anchor="middle" fill="#7a7c8a" font-family="JetBrains Mono" font-size="14">No cells</text>';
    return;
  }

  // Layout: simple grid
  const cols = Math.ceil(Math.sqrt(cells.length * 1.5));
  const cellW = 120, cellH = 50;
  const padX = 30, padY = 30;
  const positions = new Map();

  cells.forEach((cell, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(cell.def.id, {
      x: padX + col * (cellW + 40),
      y: padY + row * (cellH + 60),
    });
  });

  const svgW = padX * 2 + cols * (cellW + 40);
  const svgH = padY * 2 + Math.ceil(cells.length / cols) * (cellH + 60);
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);

  let html = '';

  // Edges first (under nodes)
  for (const cell of cells) {
    const from = positions.get(cell.def.id);
    if (!from) continue;
    for (const depId of cell.deps) {
      const to = positions.get(depId);
      if (!to) continue;
      const x1 = from.x + cellW / 2;
      const y1 = from.y;
      const x2 = to.x + cellW / 2;
      const y2 = to.y + cellH;
      const midY = (y1 + y2) / 2;
      html += `<path class="graph-edge" d="M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}"/>`;
    }
  }

  // Nodes
  const kindColors = {
    value: '#7c5cff',
    formula: '#00d4aa',
    api: '#ff7a59',
    program: '#ffc700',
    sensor: '#7a7c8a',
    listener: '#00d4aa',
    router: '#ff7a59',
    io: '#7a7c8a',
  };

  for (const cell of cells) {
    const pos = positions.get(cell.def.id);
    if (!pos) continue;
    const color = kindColors[cell.def.kind] || '#7a7c8a';
    const status = cell.value.status;
    const opacity = status === 'ready' ? 1 : 0.5;
    html += `
      <g class="graph-node" data-id="${escapeHtml(cell.def.id)}" transform="translate(${pos.x},${pos.y})" opacity="${opacity}">
        <rect class="graph-node-circle" x="0" y="0" width="${cellW}" height="${cellH}" rx="6" stroke="${color}" fill="var(--bg-2)"/>
        <text class="graph-node-label" x="${cellW / 2}" y="22">${escapeHtml(truncate(cell.def.id, 14))}</text>
        <text class="graph-node-sublabel" x="${cellW / 2}" y="38">${cell.def.kind}</text>
      </g>
    `;
  }

  svg.innerHTML = html;

  // Highlight edges on hover
  svg.querySelectorAll('.graph-node').forEach(node => {
    node.addEventListener('mouseenter', () => {
      const id = node.dataset.id;
      const cell = engine.cells.get(id);
      if (!cell) return;
      // Highlight this node and its edges
      svg.querySelectorAll('.graph-edge').forEach(edge => {
        edge.classList.add('active');
      });
    });
    node.addEventListener('mouseleave', () => {
      svg.querySelectorAll('.graph-edge').forEach(edge => {
        edge.classList.remove('active');
      });
    });
  });
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function renderStats() {
  document.getElementById('stat-cells').textContent = `${engine.cells.size} cells`;
  document.getElementById('stat-eval').textContent = `${engine.evalCount} evals`;
}

function renderActions() {
  const actions = PRESETS[currentPreset].actions || [];
  const container = document.getElementById('actions');
  if (actions.length === 0) {
    container.innerHTML = '<p class="empty-state">No actions for this preset.</p>';
    return;
  }
  container.innerHTML = '';
  for (const action of actions) {
    const div = document.createElement('div');
    div.className = 'action-item';
    let fieldsHtml = '';
    for (const field of action.fields || []) {
      fieldsHtml += `<input type="${field.type || 'text'}" data-field="${field.id}" value="${field.value}" step="${field.step || ''}" placeholder="${field.label}">`;
    }
    div.innerHTML = `
      <div class="action-item-title">${escapeHtml(action.title)}</div>
      <div class="action-item-desc">${escapeHtml(action.desc)}</div>
      ${fieldsHtml}
      <button data-action="${escapeHtml(action.title)}">Run</button>
    `;
    const btn = div.querySelector('button');
    btn.addEventListener('click', async () => {
      const values = {};
      for (const field of action.fields || []) {
        const input = div.querySelector(`[data-field="${field.id}"]`);
        values[field.id] = input.value;
      }
      try {
        await action.run(engine, values);
        render();
        flashCells();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
    container.appendChild(div);
  }
}

function flashCells() {
  document.querySelectorAll('.runtime-cell').forEach(cell => {
    cell.classList.add('flash');
    setTimeout(() => cell.classList.remove('flash'), 600);
  });
}

// =====================================================================
//  WIRING — connect UI to engine
// =====================================================================

function loadPreset(name) {
  currentPreset = name;
  const preset = PRESETS[name];
  document.getElementById('source').value = preset.source;
  applySource();
}

function applySource() {
  const source = document.getElementById('source').value;
  const sheet = engine.parseYAML(source);
  engine.loadSheet(sheet);
  render();
}

function setupUI() {
  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPreset(btn.dataset.preset);
    });
  });

  // Apply button
  document.getElementById('apply-btn').addEventListener('click', applySource);

  // Auto-apply on Ctrl+Enter in textarea
  document.getElementById('source').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      applySource();
    }
  });
}

setupUI();
loadPreset('boat-autopilot');
