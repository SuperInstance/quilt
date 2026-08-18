# High-Throughput Cell Evaluation in TypeScript

This is a research note on getting real throughput out of the
TypeScript runtime. The Rust port is naturally fast (compiled
native code, no JIT warmup), but the TS port runs on V8 and has
a different performance profile.

## The numbers we care about

For an MCP server handling 1000 calls/sec:
- 90% of calls hit a value cell (return from cache, sub-µs)
- 8% hit a formula cell (re-eval from cache miss)
- 2% hit an api/program/router cell (the hot path)

A well-tuned TS runtime can do ~50k simple value-cell reads per
second on commodity hardware. The bottleneck is **formula
re-evaluation** and **api/program/router dispatch**.

## What the current TS runtime does well

- **Value cells**: O(1) lookup. ~3M ops/sec.
- **Formula cache hit**: O(1). ~1M ops/sec.
- **Listener fan-out**: O(N) where N is the number of
  subscribers. ~500k ops/sec.

## What the current TS runtime does poorly

- **Cold formula eval**: each new context pays the cost of
  compiling the expression (`new Function`). The compile is
  cached, but a cold cell + cold context = one compile per
  call.
- **`new Function` overhead**: the formula DSL compiles to a
  `Function` object. V8 has to parse, compile, and install the
  function. This is ~50µs per cold call.
- **`with (cells)` deoptimization**: V8 historically has
  trouble optimizing `with` blocks. We benchmarked ~3x slower
  than property-access.
- **API cell evaluation**: each call uses `fetch`, which has
  its own overhead. Not the engine's fault, but adds latency.

## The path to 10x throughput in TS

### 1. Move formulas to a bytecode VM

The current formula DSL is `new Function(...)` with `with (cells)`.
We can replace this with a small bytecode VM that the engine
compiles formulas into at load time.

**Design:**

```
formula = "=a + b * 2"
  ↓ (compile, once)
bytecode = [
  LOAD_VAR "a",
  LOAD_VAR "b",
  PUSH_I64 2,
  MUL,
  ADD,
  RET
]
  ↓ (interpret, every call)
result = vm.run(bytecode, env)
```

The VM is a simple stack machine: ~100 lines of TS, no
allocations in the hot loop. The bytecode is the same as what
WebAssembly or Lua uses, so the patterns are well-understood.

**Why this helps:**
- 10-50x faster than `new Function` for short formulas
- No JIT warmup; predictable performance
- Easy to optimize (constant folding, dead code elimination)
- Easy to inspect (you can print the bytecode for debugging)

**Sketch:**

```ts
class FormulaVM {
  // Registers, stack, and bytecode cache.
  private stack: number[] = new Array(16);
  private stackPtr = 0;
  
  run(code: Uint8Array, env: Record<string, number>): number {
    this.stackPtr = 0;
    let pc = 0;
    while (pc < code.length) {
      switch (code[pc++]) {
        case OP.LOAD_VAR: {
          const id = readU16(code, pc); pc += 2;
          this.push(env[ids[id]] ?? 0);
          break;
        }
        case OP.ADD: {
          const b = this.pop(), a = this.pop();
          this.push(a + b);
          break;
        }
        // ... etc
      }
    }
    return this.pop();
  }
}
```

### 2. JIT-friendly helpers

For helpers like `max`, `min`, `clamp`, the current code uses
`...args` spread and `Math.max` indirection. Replace with
typed overloads:

```ts
// Before
const helperMax = (...n: number[]) => Math.max(...n);

// After
function max2(a: number, b: number): number { return a > b ? a : b; }
function max3(a: number, b: number, c: number): number { return max2(max2(a, b), c); }
// ... up to maxN or vararg fallback
```

V8 inlines these aggressively. The spread + `Math.max` version
forces V8 to allocate an array and call a built-in.

### 3. Replace `with (cells) { ... }` with explicit env

`with` blocks force V8 to deoptimize. Replace with:

```ts
// Before
new Function('cells', 'abs', ...,
  `with (cells) { return (${body}); }`)

// After  
new Function('cells', 'abs', ...,
  `return (${rewriteToExplicit(body, cellIds)});`)
```

where `rewriteToExplicit` produces code that explicitly
dereferences `cells`: `cells["a"] + cells["b"]` instead of
`a + b`. This loses the readability benefit but gains
3-5x throughput.

### 4. Native drop-ins via N-API

For the hot path, expose a native add-on (Node-API / N-API) that
implements the formula VM in C++. Use it from TS as a regular
module. This gives you the speed of Rust with the ergonomics
of TS.

**When to use:**
- You have 10k+ formula evals per second
- The bytecode VM isn't enough
- You can't justify a full Rust rewrite

**Trade-off:** you have to maintain a native module. For most
users, the bytecode VM is enough.

### 5. Module-by-language acceleration

Some cells are best evaluated in a different language:

- **Math-heavy formulas**: WebAssembly (via AssemblyScript or
  Rust compiled to WASM)
- **String-heavy**: stay in JS (V8 is great at strings)
- **Crypto**: native node:crypto
- **JSON parsing**: native (V8 is great at this too)

Quilt's cell kinds already support this: a `program` cell can
spawn a subprocess or load a WASM module and call into it.

### 6. The "no-VM" approach: just write the code

For the highest throughput, skip the formula DSL entirely. Use
`program` cells that call a registered Rust/WASM function. The
harness registers the function once at startup; cells call it
directly.

```ts
engine.registerHelper('fast-max', (a: number, b: number) => a > b ? a : b);
{
  id: 'max.cell',
  kind: 'program',
  code: 'return fast_max(cells["a"], cells["b"]);'
}
```

This pattern keeps the cell definition declarative while the
hot path is pure native code.

## What we shipped in the v0.2.0 release

The current TS runtime is at the "well-tuned but no VM" level.
For the v0.2.0 release:

- All formulas use `with (cells)` (readable, ~3x slower than
  explicit env)
- No bytecode VM (planned for v0.3.0)
- Program cells use `new AsyncFunction` (one per cell, cached
  by id)
- No native drop-ins (planned for v0.3.0)

For 95% of users, this is fast enough. The remaining 5% (high-
throughput agents, real-time dashboards, MMO game logic) can
use the workarounds above.

## Benchmarking your harness

The engine ships with a small benchmark runner:

```sh
cd packages/core
node --import tsx bench/run.ts
```

It runs 1000 calls per cell kind and reports ops/sec. Use this
to compare before/after changes.

## What we'd love to see from the community

- A bytecode VM for the formula DSL (the obvious one)
- WebAssembly-backed program cells (for hot paths)
- A TypeScript decorator DSL (`@formula('=a + b')`) for
  compile-time formula validation
- A "compiled sheet" format (`.quilt.bin`) for fast startup
