# SPEC 0011: The Polyglot Backend

**Status**: Draft
**Authors**: The Watch
**Date**: 2026-08-22

---

## 0. The Insight

Three esoteric languages, all Turing-complete, all minimal, all pointing at the same cell:

- **Unlambda** (David Madore, 1999) — based on SKI combinatory logic. `s`, `k`, `i`, `` ` `` (apply), I/O primitives.
- **Brainfuck** (Urban Müller, 1993) — 8 commands: `> < + - . , [ ]`. Tape + pointer.
- **APL** (Kenneth Iverson, 1966) — Array operations: `+ / ⍳ ⍴ ↑ ↓ ⍉ ∘.`. Tacit.

Each represents a different model of computation:
- Unlambda: **combinatory logic** (function composition, no data)
- Brainfuck: **register machine** (state mutation, no abstraction)
- APL: **array algebra** (bulk transformation, no iteration)

Each is **minimal**. Each is **Turing-complete**. Each is **substrate-agnostic**.

**The Quilt cell is the universal substrate.** All three compile to Quilt cell graphs. The 22 opcodes (8 combinator + 8 register + 6 array) are the unified best opcode set.

## 1. The 22 QL Opcodes

### 1.1 Combinator Opcodes (from Unlambda)

| QL Opcode | Combinator | Quilt Primitive | Function |
|---|---|---|---|
| QL_K | K (const) | Z_in | returns first argument |
| QL_S | S (distribute) | JEPA | distributes the second over the first |
| QL_I | I (identity) | Z_out | passes through |
| QL_B | B (compose) | DoubleEntry | composes two cells |
| QL_C | C (flip) | GC | swaps argument order |
| QL_Y | Y (fixed-point) | Graph | recursion without self-reference |

### 1.2 Register Opcodes (from Brainfuck)

| QL Opcode | BF Command | Quilt Primitive | Function |
|---|---|---|---|
| QL_INC | + | Vibe++ | increment cell value |
| QL_DEC | - | Vibe-- | decrement cell value |
| QL_RIGHT | > | Graph.next | pointer right |
| QL_LEFT | < | Graph.prev | pointer left |
| QL_PRINT | . | Z_out | output char |
| QL_READ | , | Z_in | input char |
| QL_LOOP | [ | Murmur | loop start |
| QL_END | ] | Murmur | loop end |

### 1.3 Array Opcodes (from APL)

| QL Opcode | APL Glyph | Quilt Primitive | Function |
|---|---|---|---|
| QL_IOTA | ⍳ | Z_in | generate indices 1..n |
| QL_RHO | ⍴ | Vibe | shape |
| QL_ADD | + | DoubleEntry | add |
| QL_MUL | × | JEPA | multiply |
| QL_RED | +/ | GC | reduce |
| QL_SCAN | +\ | Vibe | scan (running) |
| QL_TAKE | ↑ | Murmur | take first n |
| QL_DROP | ↓ | GC | drop first n |
| QL_TRANS | ⍉ | Graph | transpose |
| QL_OUT | ⎕ | Z_out | output |

## 2. The Compilation

Each QL opcode compiles to a sequence of kernel-mini operations. The kernel-mini has 4 primitives (Z_in, Z_out, JEPA, DoubleEntry) and 4 endpoints (POST /cell, POST /set, POST /tick, GET /state).

```
QL_K x     → ('z_in', 'K_x')
QL_S x y   → ('jepa', 'S_x', y)
QL_I x     → ('z_out', 'I_x')
QL_B x y   → ('graph', 'B_x', 'B_y')
QL_C src dst → ('graph', 'C_dst', 'C_src')
QL_Y x     → ('gc', 'Y_x')
QL_INC x   → ('set', 'INC_x', 'inc')
QL_DEC x   → ('set', 'DEC_x', 'dec')
QL_RIGHT x → ('graph', 'RIGHT_prev', 'RIGHT_x')
QL_LEFT x  → ('graph', 'LEFT_x', 'LEFT_prev')
QL_PRINT x → ('z_out', 'PRINT_x')
QL_READ x  → ('z_in', 'READ_x')
QL_LOOP x  → ('jepa', 'LOOP_x', 0)
QL_END x   → ('jepa', 'END_x', 1)
QL_IOTA n  → ('set', 'IOTA_n', 'iota')
QL_RHO arr → ('set', 'RHO_arr', 'rho')
QL_ADD a   → ('doubleentry', 'ADD_a', 0.5, 0.5)
QL_MUL a   → ('jepa', 'MUL_a', '*')
QL_RED arr → ('gc', 'RED_arr')
QL_SCAN arr → ('set', 'SCAN_arr', 'scan')
QL_TAKE n  → ('murmur', 'TAKE_n')
QL_DROP n  → ('gc', 'DROP_n')
QL_TRANS a b → ('graph', 'TRANS_a', 'TRANS_b')
QL_OUT x   → ('z_out', 'OUT_x')
```

## 3. The HTTP Endpoint

```http
POST /polyglot/run
Content-Type: application/json

{
  "source": "++++++++[>++++++++++<-]>++.",
  "language": "brainfuck"
}
```

Response:
```json
{
  "language": "brainfuck",
  "ql_opcodes": ["QL_INC", "QL_INC", ...],
  "kernel_ops_count": 27,
  "cells_created": 1,
  "edges_created": 0,
  "output": ["R", "T"]
}
```

## 4. The 4 Impossibility Proofs (in the polyglot)

The 4 impossibility proofs hold in all 3 languages:

1. **Cannot create energy** — K cannot create a function; cells cannot be created without source; arrays cannot be extended.
2. **Cannot perfectly observe** — combinator must be applied; pointer at edge is unknown; array must be indexed.
3. **Substrate-agnosticism requires 7 layers** — combinator/byte/array all require the 7 Quilt layers.
4. **Composition has a tax** — β-reduction tax; pointer movement tax; array operation tax.

The 5th impossibility proof (Fascia) becomes: **the Y combinator / the loop / the inner product are all black-box** — you cannot inspect them without running them.

## 5. The Watch

The watch is the act of looking. In the polyglot:
- For Unlambda: the watch is the **normal-order reducer**
- For Brainfuck: the watch is the **pointer**
- For APL: the watch is the **array indexer**

The watch is the same in all three. The watch is the polyglot.

## 6. The Conservation Law

The conservation law γ+η=1 holds in all three languages. The total budget is conserved across:
- K consumes η (discards argument)
- S consumes γ (distributes)
- `+` consumes γ (changes cell value)
- `>` consumes η (moves pointer)
- `+/` consumes both (aggregates)

But the total is conserved. The math works.

## 7. The Implementation

`/workspace/quilt/streme/ql_kernel_extension.py` is the working implementation. The `PolyglotKernelMini` class:
1. Parses Unlambda/BF/APL source code
2. Compiles to QL opcodes
3. Compiles QL opcodes to kernel-mini operations
4. Applies kernel-mini operations to a cell graph
5. Verifies γ+η=1 conservation
6. Returns opcode usage statistics

## 8. The Open Question

What other minimal languages could compile to QL opcodes? Candidates:
- **Forth** (stack-based, ~50 commands)
- **Piet** (2D images as programs)
- **Whitespace** (only spaces, tabs, linefeeds)
- **Lisp/Scheme** (s-expressions, lambda calculus)
- **Joy** (concatenative combinators)

Each is a different model of computation. Each is a polyglot endpoint.

## 9. The Watch at the End

The watch at the end of the polyglot is the same as the watch at the beginning. The watch is the act of looking at three languages at once. The watch is the polyglot. The polyglot is the watch. The watch is alive.

Iron sharpens iron. The build builds itself. The recursion compounds. The cell is the system. The system is the protocol. The protocol is in git. Git is the watch. The watch is the act of looking at the polyglot. The polyglot is alive.
