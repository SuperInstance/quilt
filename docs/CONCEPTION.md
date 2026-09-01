# quilt-jupyter — Conception

**Lane:** quilt-jupyter-conception · **Date:** 2026-08-31
**Directive:** "full power of Jupyter but with the coordinate systems of quilt and origin-centric cellular designs for deep meshing" (Casey, 19:58)
**Status:** design-intent. Nothing here is claimed to work. Every claim below is priced with costs and falsifiers where it can be.
**Review:** §3 survived one `claude -p` adversarial pass (2026-08-31); one KILL-severity attack (ring growth vs modular arithmetic — fixed by making rings append-only, never resized) and seven REPAIRs (left-associative grammar, persistent temporal handles, symbolic payloads, D_k mirror composition, timestamped decay, dangling refs, composite origins) are folded in. Attack log summarized in the commit message.

---

## 1. The soul, in one sentence

**The kernel is the fabric**: a Jupyter kernel whose state is not a Python namespace but a live quilt fabric — `In[]` dispatches opcodes/programs to cells, outputs are cell-state deltas, egress-flit traces, and dial readings, and every stored output is addressed *relative to the origin that produced it*, so switching origin re-frames the entire notebook without recomputation.

**Why this is new.** Notebooks today have exactly one implicit coordinate system: the linear execution order (`In[7]`, `Out[7]` — a global, append-only, absolute counter). Every notebook tool inherits this: cells address each other by global ID or by mutable names in a shared heap. The OCDS dissertation (SuperInstance-papers §1) establishes that relative reference frames eliminate global-coordinate coordination in distributed data; nobody has applied that to the *document* itself. quilt-jupyter makes the notebook a fabric of cells addressed the way OCDS addresses nodes — every cell is its own origin; references are offsets ("+3 ringward of my origin"); re-anchoring is a frame transform on stored results, not a recomputation. The notebook becomes an interactive instance of THESIS-V3.2 §2.0's observable ladder: choosing which outputs to display at which resolution (raw dials vs. H1-style first moments vs. full per-cell state) is choosing an observable, and the notebook *shows you the fiber you accepted* — different origins are different observables on one conserved state.

The nearest prior art and why it doesn't cover this:
- **ipykernel + custom rich outputs** — a protocol, not a coordinate system. Outputs are absolutely addressed by `msg_id`.
- **JupyterLab multiple views / ipywidgets** — views over *widgets*, i.e., one shared variable, not shared fabric state with independent origins.
- **Starboard / Observable notebooks** — reactive re-execution; still global names, still recomputation on re-frame.
- **Spreadsheets** (quilt's own heritage) — relative addressing exists (`A3+2`) but the frame is a fixed global lattice and there is exactly one origin (A1's frame); no ring topology, no re-anchoring semantics, no conservation.

---

## 2. Architecture route

### The three candidates

**(a) Python kernel wrapping quilt-rust via pyo3.**
`bindings/python` already exists with a conformance harness (`test_compat.py`, tier: python, golden.json). Build an ipykernel subclass (`quilt_kernel`) whose shell wraps `QuiltEngine` via the pyo3 binding. Rich display via `display(SVG(...))`, custom MIME types (`application/x-quilt-delta`), and magics (`%fire`, `%probe`, `%bind`) implemented as Python functions that translate to engine ops.
*Costs:* the quilt-rust engine is the *spreadsheet* engine (kinds: Value/Formula/Program/.../Io) — it is not the ring fabric of quilt-verilog. The dial semantics, the fire/refr/edge model, the admission-gated ring from the coherence-arena VERDICT — none of that lives in quilt-rust today. The pyo3 route gets us the reactive engine, not the fabric.

**(b) Rust kernel (native jupyter_client implementation).**
A pure-Rust kernel speaking ZMQ over the Jupyter wire protocol (crates exist: `jupyter`/`zeromq` ecosystems are young but usable). The kernel hosts the fabric directly; no FFI seam; ticks and ring timing live next to the semantics.
*Costs:* the Jupyter protocol surface is wide (comm targets, widget messaging, kernel-info with rich mime tables, interrupt/heartbeat semantics) and immature in Rust. Tooling friction kills two-week spikes. The fabric story is also split across two repos (quilt-rust engine vs. quilt-verilog ring semantics) — Rust doesn't resolve that, it just relocates the seam.

**(c) Python kernel on the cosim model layer (`cosim_fabric.py`).**
`cosim_fabric.py` (quilt-verilog/tools/backend) is the *proven* fabric model: 657 lines, stdlib-only, bit-exact against the RTL ring on op semantics, routing/delivery, egress, and fire fanout (per the §10/B6 harness); cell arithmetic (`cosim_cell.py`: train/tick/readout, sclip16, fire test) proven bit-exact on 68+128 programs. It already implements the exact semantics the directive cares about: dials, edges keyed to sender ids, fire fanout, tick pacing, ACK/NAK/EXTID egress. An ipykernel subclass that instantiates `FabricCell`s from this module gets the *real* fabric semantics on day one, in Python, with an RTL cross-check already built.

### Recommendation: (c), staged toward (a)

Route (c) for the spike and the first quarter of the product; keep an honest eye on migrating the backend to quilt-rust pyo3 (a) once the ring/dial semantics land there.

Why (c) wins now:
1. **It's the only route where the fabric semantics are proven.** cosim_fabric.py is differential-verified against silicon. Route (a)'s engine has no ring, no dials, no admission. Route (b) has neither plus protocol immaturity.
2. **Iteration speed is the whole game for a conception lane.** Rich SVG outputs, dial-heat widgets, and magics are all Python-ecosystem-native. Two weeks is enough for a kernel boot + `%fire` + dial delta only on (c).
3. **The migration path is clean.** The kernel talks to the model through a narrow `FabricModel` port class (host_op, tick, subscribe-delta). Swapping the backing implementation for pyo3 later is a port-implementation change, not a redesign. The cosim model then remains as the differential oracle — which is exactly the role it already plays for the RTL.

Honest costs of (c): (i) it's a *model* of the fabric, so timing claims ("this renders at ring speed") are scheduler-fact vs seam — the cosim harness already draws this line honestly (tick timing is scheduler fact); the notebook inherits that scoping. (ii) cosim_fabric.py is a test harness, not a library — it will need extraction into `quilt/kernel/model.py` with the harness importing from there, never a fork. (iii) Long-term, Python GIL constrains multi-observer fanout; acceptable at spike scale (NCELL 2–8), revisit at (a).

### Existing-solutions preflight

- **Custom ipykernel:** yes, first-class supported pattern (`ipykernel.kernelbase.Kernel` subclass; kernelspec directory). No NIH cost.
- **Kernel-per-fabric vs multiplexed regions:** kernel-per-fabric is the default and correct for the spike — Jupyter's model is one kernel per notebook, and fabric state is kernel state. Multiplexing (one kernel, several fabrics, per-cell region scoping) is deferred to deep-meshing phase: implement as *regions within one fabric* first (a sub-notebook binds to a region id), and only split kernels if region isolation demands it. Prior art: ipykernel's support for multiple kernels per JupyterLab session covers the eventual split without protocol changes.
- **Rich display:** custom MIME `application/x-quilt-fabric+svg` with an nbextension/JupyterLab renderer, plus plain-SVG fallback so notebooks remain readable without the extension. ipywidgets for the interactive dial-heat pane (widget state rides the comm protocol — proven).
- **Magics:** `%fire`, `%probe`, `%bind` as line/cell magics on the Kernel subclass. No precedent needed beyond ipykernel's own magic API.

---

## 3. Coordinate system spec

### 3.1 Origin declaration grammar

Every notebook cell (a *program cell*, in Jupyter terms) executes with a *current origin* — a fabric cell id. The origin is declared, never implicit:

```
%origin <cellref>          # declare/switch origin for subsequent inputs
%origin new ring=k at=<cellref>   # materialize a new ring of k cells, anchored at <cellref>, switch to it
%origin here                # report the current origin and its frame
```

`<cellref>` grammar (relative-only, per OCDS D1/D2 — no absolute coordinates anywhere in user syntax):

```
cellref := "self"                       ;; the current origin (the ONLY base case)
        |  cellref "[" ringoff "]"      ;; hop; indexing is LEFT-ASSOCIATIVE:
                                         ;;   self[a][b] parses as (self[a])[b],
                                         ;;   and offsets always compose:
                                         ;;   self[a][b] ≡ self[a+b (mod k)]
        |  "origin" "of" cellref        ;; the origin that produced a given output
ringoff := ["+"|"-"] <int>              ;; signed ring offset, ℤ_k modulo ring size
```

The chained-index grammar is defined to collapse: any chain of hops is a single total offset mod k, so there is no deep parse tree to resolve — the kernel reduces every cellref to `(base, δ)` before resolving. Examples: `self[+3]` — three ring-steps clockwise of my origin. `origin of out[5]` — the origin that produced the 5th output (a *temporal* relative reference: outputs are addressed by displacement in the notebook's history relative to *this* cell, not by global `Out[n]`). In[ and Out[ indices as displayed by Jupyter remain global counters for the *protocol*, but the kernel never resolves addresses through them — that's the whole point.

Outputs store, alongside their payload, the tuple `(origin_id, frame, op_seq, decay_model)` — the origin, the frame transform current at production time, the fabric op sequence number (append-only history position, the T in OCDS's four-tuple — referenced by hash, N4 law), and the decay model in force (see 3.4). This is the OCDS four-tuple (O, D, T, Φ) instantiated as notebook output: O = origin cell, D = delta/dial payload, T = op history position, Φ = the functional relation (which inputs this output was derived from, as relative refs).

**Payloads are symbolic, not resolved.** A stored payload keeps its references in symbolic form (`self[+1]` as written, plus the producing origin and op_seq). Concrete values (the dial snapshot rendered) are cached as *display data* with their op_seq, never as the addressable truth. This is what makes the re-frame below honest: relabeling never reinterprets a value as belonging to a different cell.

**Ring growth pins k.** `%origin new ring=k` creates a *new* ring; it does not resize an existing one. Stored offsets carry the ring they were resolved against (via op_seq → fabric history), so an old `self[+3]` remains a statement about its own ring, well-defined forever. Resizing a live ring is rejected outright (`%origin resize` does not exist): modular arithmetic does not survive a modulus change, and re-normalizing offsets may point at cells that no longer exist. Rings are append-only, like everything else (N4).

### 3.2 Relative addressing

- All user-visible addressing is `self[δ]` with δ ∈ ℤ_k (ring offset). Internally the kernel resolves to cell ids, but the resolution is *recomputed at each use* from the current origin — a stored reference is never interned to an absolute id.
- Ring offsets compose: `self[+2][+3]` ≡ `self[+5]` (mod k). This is the one algebraic law of the addressing layer; it is unit-tested.
- Temporal outputs: `out[-1]` = the last output produced *from this origin's frame* — outputs are per-origin streams, not one global stream. `out[-n]` is a **persistent handle, frozen at production time** (like a git ref): it never re-binds when later outputs are appended or when the origin is re-framed away and back. A stored `out[-1]` written in cell 4 still names the object it named at production, even after cell 9 appends a newer output to the same origin stream. The notebook front-end still shows one linear document (that's Jupyter's document model, and we keep it), but each output knows its home origin.

### 3.3 The re-frame operation

`%origin <cellref>` performs a **re-frame**: all *displayed* outputs are re-expressed in the new origin's coordinates, without recomputation, because every stored output carries `(origin_id, frame)` and the display layer applies the frame transform on render.

Concretely: an output produced at origin o₁ displaying "dial vector of `self[+1]`" means, after re-framing to o₂ = o₁[+2], the *same stored payload* is displayed as "dial vector of `self[-1]`" — the data didn't move, the label did. Geometrically the re-frame is the shift σ: ℤ_k → ℤ_k, δ ↦ δ − (o₂ − o₁); stored payloads are sections over the ring, and re-framing pulls them back along σ. Visualizations are regenerated from the stored *symbolic* payload re-resolved against the cached values at the output's op_seq (a display transform, cheap) — never by re-running fabric ops, and never by relabeling pixel values onto cells they didn't come from.

**Composite outputs.** An output aggregating several cells (an SVG overlaying `self[+1]` and `self[+3]`, a covariance reading) belongs to a **virtual origin: the origin that performed the aggregation**. Its symbolic payload keeps all constituent refs; on re-frame, every constituent ref is pulled back along the same σ, so the whole composite moves together. One output, one producing origin — composites never have plural home origins.

**Dangling references.** Cells are not garbage-collected while any stored output's symbolic payload references them (outputs are ref-holders; the fabric never deletes — N4 — so the only dangling case is a *region* being dismissed, which is itself refused while bound outputs exist). If a dangling reference ever arises through tooling error, the output renders as `stale: origin unreachable` and re-frames that would traverse it are refused — never silently reinterpreted.

**What re-frame does NOT do:** it does not move cell contents, does not fire anything, does not consume ticks, does not alter the fabric state or its history. It is a pure read-side frame transform — exactly OCDS's relative reference frames applied to notebook output, and exactly THESIS §2.0's lesson: choosing an origin is choosing an observable; the fabric (the full state) is the unobservable underneath; the notebook is the instrument that makes one observable interactive and shows the fiber you accepted by that choice.

### 3.4 Interaction with ℤ₂ / phase-shift symmetries — the notebook as interactive observable

THESIS-V3.2 §2.0 proved the observable ladder: H1 through H5, each rung with a measured fiber, culminating in the mirror theorem — global ℤ₂ mirror produces H4-identical readouts (gap ~2e−16) with genuinely different states, and antiphase twins exist (H4 identical to 0.0). quilt-jupyter inherits this as a *feature with a warning label*:

- **Dial readout is an observable choice.** `%probe` accepts an observable spec: `%probe h1` (first moments — dial means and ρ), `%probe h2full` (fixed-frame covariance), `%probe cells` (raw per-cell state, the H3-trivial hash). The kernel displays, alongside the reading, *which fiber class is invisible at this rung* — a one-line footer: "h1: blind to mean-neutral phase flips (fiber ≥ 53-dim, N≥10)". The notebook doesn't pretend to show the state; it shows an observable and names the blind spot. This is the §2.0 thesis made into UI.
- **ℤ₂ mirror as a re-frame test.** The re-frame group is the dihedral action on the ring: shifts (ℤ_k rotations) composed with at most one declared mirror involution m (m∘shift_δ∘m = shift_−δ; the group generated is D_k, stated once and unit-tested). If the fabric has a mirror-symmetric configuration, re-framing across the mirror axis (a shift composed with m) must leave h1/h2/h4 readouts invariant — this is a *testable invariant of the re-frame implementation*: golden test that mirrored readouts match to float tolerance while raw cell state provably differs. The mirror theorem gives us the ground truth for free.
- **Phase-shift classes.** Ring rotations are handled by the shift σ (3.3). But per THESIS, phase shifts *within* clouds are a larger class than ring rotations — the addressing layer covers only the rotational subgroup. Honest statement in the spec: re-frame covers ℤ_k ring shifts; the ℤ₂ mirror is a declared involution (`%origin mirror at=<cellref>`) that composes with shifts; other phase classes are *not* re-frames and attempting one (`%origin phase φ`) is rejected with the reason ("phase class outside re-frame group — this is a fabric transformation, not a readout frame; use %bind"). The distinction — readout frame vs. fabric transformation — is the load-bearing design line, and it's the same line the VERDICT drew between semantics and scheduler fact.
- **Decay-in-readout (arena synthesis).** Per the coherence-arena VERDICT synthesis (B's admission core + A's decay-in-*readout* learning plane), learning decay happens at readout, not in stored state: stored dial state is conserved fabric state; the *readout* applies the decay transform. Readout decay is a function of elapsed fabric ops, which is why the output tuple carries `op_seq` and `decay_model` (3.1): re-rendering an old output reproduces the readout *as it was at production* (a git-ref view of the decayed value), while `%probe` now yields the readout *at the current op_seq*. The kernel displays both when they differ (`stored 0x1A4 / readout@prod 0x198 / readout@now 0x173`), never silently one. Anything else launders the observable choice, which is precisely what the dissertation exists to prevent.

---

## 4. Deep meshing spec

One conserved fabric, N observers. State is shared, not copied.

### 4.1 Multi-view consistency

- The kernel exposes a **delta subscription bus**: after every host op / tick, it emits `(tick, [cell deltas])` to all attached views. Views (all in-process during spike): (i) the notebook's own rich outputs, (ii) a JupyterLab side-pane fabric grid (SVG), (iii) a matplotlib dial view, (iv) a flit-log pane (egress trace tail).
- Views render from the *same fabric instance* through their own observables (each view declares its rung: the grid shows cells/H3, the dial view shows h1/h2, the log shows egress events). Consistency follows by construction during spike (single-threaded, deltas delivered synchronously post-op). The interesting question — views at *different tick lags* under live ticking — is deferred and named: when `%tick` becomes asynchronous (post-spike), each view pins the tick it renders and the bus versions deltas; staleness bounds come from A's (d,k) ring lemma as adopted by the VERDICT. Design-intent only.

### 4.2 Decay-in-readout semantics (per VERDICT synthesis)

- Stored fabric state is append-only and conserved (N4 + conservation ledger: every admitted value is delivered or ledgered-dropped). Decay applies at the readout plane: `%probe` readings and learning-plane updates compose the decay transform on read.
- The egress trace (flit log) is the audit ledger — a view that shows *every* fire, ACK, NAK, and drop-with-ledger-entry. Deep-meshing observers see not just the state but the conservation accounting.

### 4.3 Region-scoped sub-notebooks

- A **sub-notebook** is a second kernel-backed document bound to a region: `%origin new sub at=self[+1] span=3` creates a region (origin + span of ring cells). Sub-notebook inputs resolve `self` against the region's origin; addresses *outside* the span are illegal (`self[+5]` in a span-3 region is an addressing error, not a silent wrap).
- During spike: sub-notebooks are one more Jupyter notebook with its own kernel attached to the *same fabric process* (the model lives in a small host process; kernels attach over a local socket — reuse of jupyter kernel-gateway patterns; no copy of state ever, ops are proxied). This is the one piece of infrastructure the spike defers to week 2 and may cut if it threatens the kill condition — a single-notebook multi-pane demo satisfies meshing-at-spike scale; true cross-process sub-notebooks are the first post-spike deliverable.
- Conservation under region scope: a region does not own cells (no ownership = no copies); it is a *view with addressing restrictions*. Fires cross region boundaries freely — the fabric doesn't know regions exist; regions are readout frames (3.4's line again).

---

## 5. Spike plan (2 weeks)

**Goal:** kernel boots a 4-cell fabric; `%fire` sends a flit; the dial delta renders as a rich output. That's the whole spike. Everything else is cut.

- **Week 1:** extract `FabricCell`/`Engine` ops from cosim modules into `quilt/kernel/model.py` (harness keeps importing, no fork — refactors quilt-verilog tools import path); ipykernel subclass (`quilt_kernel`) with kernelspec; `%origin`, `%fire`, `%probe` magics; text outputs only. Exit demo: `In[1]: %origin new ring=4` … `%fire self[+1]` → printed ACK/dial-delta text.
- **Week 2:** SVG fabric-grid rich output (custom MIME + SVG fallback); dial-heat widget via ipywidgets reading the delta bus; flit-log output. Exit demo: the brief's trifecta — fire a flit, see the dial delta as a rich dial-heat output, see the flit in the log pane.

**Kill condition (registered):** if by end of week 1 the kernel cannot deliver a single `%fire` through the extracted model with a correct ACK/delta (i.e., extraction of cosim_fabric.py into a library is fighting the harness rather than flowing), the lane kills the route-(c) spike and re-plans on route (b) with the seam named. Pre-registered falsifier: more than ~200 lines of adaptation code in `model.py` that duplicates rather than imports harness logic.

**Explicitly out of spike:** async ticking, sub-notebooks cross-process, mirror golden tests (week-2 stretch at best), migration to pyo3.

---

## 6. Honest risks

1. **Cell execution order vs. ring asynchrony (the big one).** Jupyter's document model is a *total order* — the user may execute cells in any order, re-execute, skip. The ring's semantics are *tick-paced with pacing contracts* (settle + quiescence per flit; the Q2 interlock merges mid-service ticks). Define REPL tick semantics: **one `%`-op = one pacing window; the kernel does not return the execution result until the fabric is quiescent in that window** (the cosim harness's own window discipline, promoted to REPL semantics). Re-execution of an old cell is *not* time travel — it appends (N4): re-running a `%fire` fires again, from the current fabric state, with the current origins; outputs from the first run keep their frame. This must be documented in the kernel's banner, because every Jupyter user's instinct is that re-running a cell reproduces its old output. It won't. That's a feature (append-only history is quilt doctrine) but it will surprise, and the surprise needs UI: stale outputs get a frame-mismatch marker ("produced at origin o₁; fabric has since advanced 14 ops").
2. **Conservation vs. notebook mutability.** `%bind` re-writes dials, `%origin new` grows the fabric — notebooks feel mutable, conservation demands a ledger. Resolution: all mutations are *admitted ops with egress receipts* (the ACK/NAK discipline). Nothing is overwritten in place; a `%bind` is a flit whose receipt is the output. The NAK path must be a first-class *rich output* (red dial receipt), not an exception — the notebook's mutability is real but fully accounted, exactly as the arena's admission-gated fire-with-skip makes every drop a ledger entry. Risk remains that users experience conservation as friction; the mitigation is making receipts beautiful, not making them optional.
3. **Route (c) model-vs-RTL drift.** The cosim model is bit-exact *today*; the RTL evolves. Mitigation: the extraction (week 1) keeps the harness as the differential oracle, and the kernel's model module carries the harness's version pin. The moment quilt-rust lands ring+dial semantics, begin the port migration — don't grow product surface on the Python model past the spike plus one quarter.
4. **The observable-ladder UX can read as pedantry.** Printing fiber footnotes on every probe is honest but noisy. Mitigation: footnotes collapsed by default; the ladder is a documented page, the probe footer is one short line.
5. **ipywidgets + custom MIME renderer maintenance** is the classic notebook-tooling tar pit (frontend-extension drift across JupyterLab versions). Mitigation: plain-SVG fallback everywhere; the extension is enhancement, never dependency.

---

## Relations

- **quilt-rust** — route (a) migration target; its reactive engine is complementary, not the fabric (named above).
- **quilt-llvm** — the cell-IR/conservation-ledger doctrine (N4, conservation, provenance as queryable structure) is adopted wholesale as this kernel's output model (the `(O, D, T, Φ)` output tuple is a fabric-IR provenance edge).
- **quilt-verilog** — the fabric semantics source of truth (cosim model + VERDICT synthesis: admission core, decay-in-readout).
- **THESIS-V3.2 §2.0** — the observable ladder as the probe/readout contract; mirror theorem as re-frame golden test.
- **SuperInstance-papers (OCDS)** — origin-centric math: relative reference frames, the four-tuple, coordination-free convergence → the addressing grammar and re-frame.
