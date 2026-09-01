# QUILT-JUPYTER BRIEF — Conception Lane

You are the QUILT-JUPYTER conception lane. Casey's directive (2026-08-31 19:58): "Think of a quilt-jupyter that has the full power of Jupyter but with the coordinate systems of quilt and origin-centric cellular designs for deep meshing."

Work dir: /home/eileen/projects/quilt (create if needed), branch `quilt-jupyter-conception`. DeepSeek/DeepInfra REVOKED. `claude -p` for one adversarial design-review pass on the coordinate spec before commit.

## Read first (substrate)
- /home/eileen/projects/quilt-rust (grid runtime), /home/eileen/projects/quilt-llvm (fabric IR/interpreter), /home/eileen/projects/quilt-verilog (silicon expression; docs/coherence-arena/VERDICT.md now landed — read its synthesis: B's admission core + A's decay-in-readout learning plane; the readout semantics matter to you)
- /home/eileen/projects/zeroclaw-dissertation/research/dissertation/drafts/THESIS-V3.2-2026-08-31.md §2.0 (observable ladder — the notebook view IS an H-observable choice made interactive)
- github.com/SuperInstance/SuperInstance-papers (origin-centric math prior art — read-only via `gh repo view`)

## What quilt-jupyter IS
- **The kernel is the fabric**: a Jupyter kernel (jupyter_client protocol) backed by a live quilt fabric. `In[]` dispatches opcodes/programs; outputs are cell-state deltas, egress flit traces, dial readings. Rich display: SVG fabric grids, dial-heat widgets that are OP dial-writes, %magics (%fire, %probe, %bind).
- **Cells are cells, addressed relatively**: origin-centric addressing — "+3 ringward of my origin" — surviving re-anchoring. NO absolute coordinates. Moving-origin mode: switching origin re-frames every stored output WITHOUT recomputation (outputs stored relative).
- **Deep meshing**: one conserved fabric, N observers (second notebook on a sub-region, matplotlib dial view, flit-log pane) — sharing state, not copies. Region-scoped sub-notebooks. Readout decay semantics per the arena's landed synthesis (decay-in-readout).

## Deliverable — docs/CONCEPTION.md in the work dir
1. One-sentence soul + why origin-centric addressing in a notebook is new.
2. Architecture route decision: (a) Python kernel wrapping quilt-rust via pyo3, (b) Rust kernel, (c) kernel on the existing cosim model layer (cosim_fabric.py is proven). Recommend ONE with honest costs. Existing-solutions preflight: ipykernel custom kernels, kernel-per-fabric vs multiplexing regions.
3. Coordinate system spec: origin declaration grammar, relative addressing, the re-frame operation, interaction with ℤ₂/phase-shift symmetries (notebook as interactive observable).
4. Deep meshing spec: multi-view consistency, decay-in-readout semantics, region-scoped sub-notebooks.
5. Spike plan (2 weeks): kernel boots 4-cell fabric, %fire a flit, dial delta as rich output. Kill condition registered.
6. Honest risks: cell execution order vs ring asynchrony (define tick semantics under REPL), conservation vs notebook mutability.

## Report back
Chosen route, the re-frame operation in one paragraph, spike definition, biggest risk.
