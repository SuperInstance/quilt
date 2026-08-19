# Neural Cells: Quilt as a Generalized Message-Passing Architecture

> A research synthesis. How a cell in a Quilt sheet is a node in a graph neural network, an attractor in a Hopfield net, a router in a mixture of experts, an attention head, a state in Mamba, a step in a diffusion process, and a column in a predictive coding hierarchy — all at once.

The full HTML version: <https://superinstance.github.io/quilt/landing/neural-cells.html>

## The core insight

A Quilt cell is a node in a directed graph. It receives inputs (from other cells or external sources), computes a value (using any function: formula, LLM, sensor, code), and exposes that value to its dependents. This is *exactly* the message-passing pattern that underlies most modern neural architectures — but with one crucial difference: the node function is arbitrary, not a fixed weighted sum.

```
Quilt cell:  v_i = f_i({v_j : j ∈ neighbors(i)})
Neuron:      v_i = σ(Σ_j w_ij v_j + b_i)
```

The neuron is a special case of the Quilt cell: f_i is a fixed function (a linear combination + nonlinearity). The Quilt cell lifts this restriction. A cell can be an LLM call, a formula, a program, a sensor, a router, or a listener.

This generality is the point. **Quilt is a meta-architecture** — a substrate on which the specific architectures below can be expressed, mixed, and composed.

## 10 architectures mapped to Quilt

### 1. Message Passing Neural Networks (Gilmer et al., 2017)

The MPNN framework: gather, aggregate, update. Quilt preserves the graph structure and propagation order; drops the requirement for homogeneous differentiable node functions.

### 2. Hopfield Networks (Hopfield, 1982)

Energy-based content-addressable memory. The whole sheet acts as an attractor landscape; reactive propagation is energy descent. "Memories" are stored in the sheet's structure, not in a weight matrix.

### 3. Transformers / Attention

Scaled dot-product attention. A Quilt listener is structurally an attention head with a boolean (hard) condition instead of a continuous softmax distribution. The benefit: interpretable. The cost: less expressive for some tasks.

### 4. Mixture of Experts (Shazeer et al., 2017)

Router dispatches to N experts. Quilt's `router` cell IS an MoE gate. The experts can be anything — formulas, LLM calls, whole sub-sheets. A structural advantage.

### 5. Capsule Networks (Hinton, Sabour & Frosst, 2017)

Routing by agreement. Quilt formula cells with agreement predicates; listener cells fire when conditions match. Quilt goes further: agreement can be a qualitative predicate, not just a dot product.

### 6. State Space Models (Mamba, 2023)

Selective state update. Quilt time-stepped simulation with reactive propagation: state is preserved, only affected cells recompute. The runtime's selection IS Mamba's selection mechanism.

### 7. Diffusion Models

Iterative denoising from noise to coherent data. The "plinko" — a Quilt sheet stepped forward in time is exactly a discrete reverse diffusion. Initial state is the noise; tick-by-tick refinement is the denoising; the trajectory is the generation.

### 8. Neural ODEs

Continuous-depth networks. Quilt's reactive propagation is a discrete analog: depth is the longest path, integration time is the number of ticks to a fixed point, the runtime's tick() is the solver.

### 9. Predictive Coding (Friston)

Hierarchical prediction + error minimization. Quilt formulas compute predictions; listeners fire on errors; downstream cells correct themselves. The tavern demo is predictive coding in a spreadsheet.

### 10. Neural Cellular Automata (Mordvintsev et al., 2020)

Self-organizing patterns from local rules. Quilt is a generalized NCA: cells can be on an arbitrary graph (not just a grid), the cell function can be anything, and updates are reactive (not synchronous). The tavern is an NCA where cells are characters, neighborhood is "who can hear whom", and the rule is "respond to what you hear".

## The synthesis

All of these are structured information-passing between nodes with state. Quilt is a substrate that can express all of them, and any combination.

| Architecture | Quilt analogue |
|---|---|
| MPNN | Formula + listener cells |
| Hopfield | Whole sheet (reactive propagation = energy descent) |
| Transformer | Listener cells with boolean conditions |
| Mixture of Experts | Router cell + N downstream cells |
| Capsule network | Formula cells with agreement predicates |
| Mamba (SSM) | Time-stepped simulation with reactive propagation |
| Diffusion | Tick-by-tick simulation |
| Neural ODE | Reactive propagation (discrete) |
| Predictive coding | Listener-on-error cells |
| Neural CA | Formula cells with neighbor refs |
| RLAIF / Evolution | @quilt/evolve (LLM-driven mutation based on LLM-judged feedback) |

## The tavern: a worked example

The Crooked Tankard demo ([tavern.html](https://superinstance.github.io/quilt/landing/tavern.html)) is a small Quilt sheet that demonstrates most of these patterns in one place:

- 3 characters: Grumthor (dwarf), Pip (bard), The Hooded Figure
- 10 cells: mood, thought, speech for each character
- Each turn: bard sings → dwarf's mood drops → dwarf grumbles → stranger observes → stranger may speak
- The cell graph evaluates in real time
- Watch the trajectory, not just the end state

## The vibe-code interface

The [vibe-code page](https://superinstance.github.io/quilt/landing/vibe.html) is the natural UI for this meta-architecture:
- Side panel chat with the AI
- Describe a scene: "a space station", "a market", "a kitchen"
- AI generates a Quilt YAML sheet
- Play it, edit it, regenerate

The user describes a scene, the LLM builds a Quilt sheet, the user plays the scene. The sheet is the artifact; the trajectory is the simulation; the cell structure is the "intelligence" that emerges from the structured passing of information.

## Open questions

- What is the right cell type for what task? When is a formula enough, when is an LLM needed?
- What is the right granularity? Coarse cells (one per character) vs. fine cells (one per trait)?
- How do we learn the topology? NAS on the cell graph.
- How do we learn the cell functions? @quilt/evolve is evolutionary and slow; gradient-based is a research direction.
- How do we measure "intelligence"? The free energy principle suggests surprise minimization.

## Live demos

- [neural-cells.html](https://superinstance.github.io/quilt/landing/neural-cells.html) — this research, as an HTML page
- [tavern.html](https://superinstance.github.io/quilt/landing/tavern.html) — the worked example
- [vibe.html](https://superinstance.github.io/quilt/landing/vibe.html) — the vibe-code interface
- [evolve.html](https://superinstance.github.io/quilt/landing/evolve.html) — the self-improvement loop
