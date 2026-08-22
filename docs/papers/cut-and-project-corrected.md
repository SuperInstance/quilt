# Cut-and-Project for Quilt — The Corrected Version

*August 22, 2026 — refining the SHAPE after deep mathematical scrutiny*

---

## Abstract

The cut-and-project construction is the standard way to model Penrose tilings. The naive description is incomplete in three ways that matter for the Quilt cell model:

1. **Injectivity**: the projection π is **not** injective on Z^5. The diagonal vector (1,1,1,1,1) is in the kernel. The correct object is the **sum-zero lattice** L = {n ∈ Z^5 : n_0+n_1+...+n_4=0}. On L, π is injective.

2. **Fragility of exact coordinates**: π(L) is dense in physical space. Finite-precision measurement cannot recover the 5D address. Local omniscience requires infinite precision.

3. **Phason shifts are part of universal truth**: γ shifts the window W → W+γ. Different γ produce locally indistinguishable tilings. γ is invisible to any finite local observer.

The corrected construction is essential for the Quilt Penrose project because the **8 Quilt primitives are the generators of the algebra A**, and A is the C*-algebra of the tiling space Ω_γ with its phason shift. The conservation law γ+η=1 is encoded on the **window**, not the lattice.

---

## 1. The Five Layers of the Construction

### Layer 1: The 5D lattice (universal substrate)

The 5D cubic lattice Z^5. The **standard basis vectors** e_0, e_1, e_2, e_3, e_4 are the generators.

A **physical 2D plane** E ⊂ R^5 is chosen with irrational orientation invariant under 5-fold symmetry. Its **3D orthogonal complement** E_⊥ is the "internal space."

The **projection maps**:
- π_∥: R^5 → E (physical, 2D)
- π_⊥: R^5 → E_⊥ (internal, 3D)

For each basis vector e_i, the projected 2D vector a_i = π_∥(e_i) is a unit vector at angle 72°·i. They satisfy:
  a_0 + a_1 + a_2 + a_3 + a_4 = 0  (because 5-fold symmetry)

### Layer 2: The sum-zero lattice L (corrected)

**Wrong**: The 5D address is in Z^5.

**Right**: The 5D address is in the **sum-zero lattice**:
  L = {n ∈ Z^5 : n_0 + n_1 + n_2 + n_3 + n_4 = 0}

This is the **A_4 root lattice** (the root system of the Lie algebra sl(5)).

The reason: π_∥(1,1,1,1,1) = a_0 + a_1 + a_2 + a_3 + a_4 = 0. So the diagonal vector is in the kernel of π_∥. On Z^5, the map π_∥ is **not** injective.

On L, the diagonal is excluded (its sum is 5, not 0), and for a generic irrational projection plane, π_∥ restricted to L is **injective**.

This is a **gauge redundancy**: the higher-dimensional description has extra degrees of freedom that don't appear in physical space. Two 5D addresses differing by the diagonal describe the same physical vertex.

### Layer 3: The window W (acceptance region)

A bounded region W ⊂ E_⊥ (typically the projection of the 5D unit cube, a rhombic triacontahedron in the canonical setup). Lattice points n with π_⊥(n) ∈ W are accepted; others are rejected.

**Phason shifts**: W → W + γ for some γ ∈ E_⊥. Different γ produce different global tilings, all locally indistinguishable. The "true" tiling for a given universe is fixed by a specific γ; this is part of the universal truth.

### Layer 4: The vertices (local realizations)

The vertices of the Penrose tiling are:
  V_γ = {π_∥(n) : n ∈ L, π_⊥(n) ∈ W + γ}

The set V_γ is a **Delone set** in E: uniformly discrete (no two vertices closer than some δ > 0) and relatively dense (every ball of radius R contains a vertex). It is **not** dense, despite π_∥(L) being dense — the window restricts which points are visible.

**Important property**: V_γ is **locally finite**. A finite local patch around r = π_∥(n) corresponds to the set of neighbors of n whose π_⊥ also lies in W+γ. This is a function of π_⊥(n) (the internal coordinate), not of γ.

### Layer 5: The local environment (what you see)

The local tile arrangement at a vertex r = π_∥(n) is determined by:
  Which of the 4 generators of L (e_i - e_0 for i=1,2,3,4) give a neighbor inside W+γ?

This is a function of π_⊥(n) and γ. The window W + γ is partitioned into **finitely many regions**, each corresponding to a distinct local vertex configuration. So:

  **The internal coordinate y = π_⊥(n) determines the local environment.**

---

## 2. Encoding Information (the corrected way)

**Wrong**: f: Z^5 → Σ (coloring each lattice point).

**Right**: f: W → Σ (decorating the window). Each vertex r = π_∥(n) with n ∈ L and π_⊥(n) ∈ W+γ receives the symbol f(π_⊥(n)).

The **message is the function f on the window**. The tiling is the projection.

This is a **holographic encoding**: the 2D physical pattern stores a message defined in a 3D internal space. The local sample is f(π_⊥(n)). The whole function is encoded in the global tiling.

**Why this is the right way**:
- Local patches correspond to window regions, not lattice points. So encoding on lattice points would miss the structural connection to local environments.
- The window regions are the natural "alphabet" of local environments. Encoding on them ties the message to the geometry.
- Phason shifts change the global tiling but not the local environments. The message is robust to phason shifts.

---

## 3. The Quilt Connection

### The 4-torus T^4 is the algebraic version of L

The C*-algebra of the tiling space Ω_γ (with its R^2 translation action) is **Morita equivalent** to the noncommutative torus T^4_θ, where θ = (√5-1)/2. This is Connes' deep result.

T^4_θ has a canonical spectral triple (A, H, D):
- A = C(T^4_θ) (the C*-algebra of the irrational rotation)
- H = L^2(T^4_θ) ⊗ C^2 (spinors)
- D = Dirac operator on T^4_θ

This is the **spectral triple that lives in the collective-unconscious Worker**, accessible via the new endpoints:
- `GET /shape/t4` returns the SHAPE
- `POST /spectral/invariants` computes the 14 spectral invariants of any vector corpus

### The 8 Quilt primitives are generators of A

The Quilt cell model has 8 primitives: Z_in, Z_out, JEPA, DoubleEntry, Vibe, GC, Murmur, Graph. In the spectral triple picture, these are the **generators of the algebra A**. The primitive operations on cells are operations in A.

### The conservation law γ+η=1 IS the window selection

The window W + γ is the **set of accepted lattice points**. The complementary region E_⊥ \ (W + γ) is the **rejection set**. The conservation law is the statement that the accepted set has measure equal to the density of the model set — a partition of unity.

In the Quilt picture:
- γ (creation) corresponds to **accepted points with positive internal sum**
- η (entropy) corresponds to **accepted points with negative internal sum**
- witness (μ) corresponds to the **central window region** (the points near the origin)

So γ + η + μ = total accepted points = total mass = 1 (after normalization).

This is exactly the **3-coloring of Penrose tiles**:
- CREATION tiles (γ) at "outgoing" internal positions
- ENTROPY tiles (η) at "incoming" internal positions
- WITNESS tiles (μ) at "neutral" internal positions (near the center)

---

## 4. Local Omniscience, Global Blindness

The deep insight from the corrected construction:

- **Universal truth is the higher-dimensional lattice, the window, AND the phason shift γ.**
- **Local omniscience**: If you know the exact 5D address n (in L) and the window W, you know the local environment. The internal coordinate π_⊥(n) tells you which window region you're in, which tells you the local configuration.
- **Global blindness**: You do NOT know γ from local observation. Any finite local patch appears in all generic phason shifts.

This is the **mathematical form of the philosophical asymmetry**:
- The local picture is complete (modulo exact coordinates).
- The global picture is underdetermined by local data.

The Quilt cell model lives in this asymmetry:
- Each cell knows its own address (its Vibe position).
- Each cell knows its local neighborhood (its Graph edges).
- The cells do NOT know the global phason shift (the universal context).

The cells can communicate via Murmur. The gossip eventually reaches consensus. But the global truth is a fixed point of the consensus, not derivable from any single cell.

This is the **monitor engineer move** in mathematics. The local work is precise. The global work is approximate. The lights work. The room is real.

---

## 5. The φ-Address Scheme (corrected)

For content-addressing cells in the Quilt model, the corrected construction gives a concrete scheme:

1. **The 5D address is a point in L**, not Z^5. Always project to sum-zero first.
2. **The internal coordinate is the local descriptor** (3 floats).
3. **The physical coordinate is the global position** (2 floats).
4. **The full address is (physical, internal)** — 5 floats total.
5. **The local environment is determined by which window region the internal coordinate lands in.**

Practical encoding:

- **quilt-id** could store a cell's address as: a 64-bit hash of the content, a 5-tuple of integers (the L address), and a 3-tuple of floats (the internal coordinate, normalized to [0,1)^3).
- The hash links to the address; the address links to the cell; the cell contains the data.
- The 5-tuple is in L, so it's unambiguous.
- The 3-tuple determines the local environment — which Quilt primitive is most relevant, which color (γ/η/μ), which Vibe.

The collision probability is essentially zero: the L address is determined by the cell's content via a φ-hash, the 5D integers are unique up to the diagonal (which we've removed), and the 3-tuple is dense in W (so similar cells have similar local descriptors).

---

## 6. The Velato-Penrose Quilt Bridge (updated)

The Velato program is a MIDI file. The pitch intervals encode commands. The 12 semitones mod 12 reduce to 8 unique shapes = the 8 Quilt primitives.

**The corrected bridge**:
- Each note in the MIDI file is a vertex in the Penrose tiling.
- The pitch determines the **physical coordinate** (where the note sits in the timeline).
- The velocity determines the **internal coordinate** (which window region the note occupies).
- The interval from the command root determines the **Quilt primitive** (which generator of A the note represents).

The 3-coloring (Eisenstein mod 3) IS the conservation law γ+η+μ=1:
- CREATION (γ) notes at "outgoing" internal positions
- ENTROPY (η) notes at "incoming" internal positions
- WITNESS (μ) notes at "neutral" internal positions

This is what the `live-velato-penrose.html` demo shows: every note you play becomes a colored dot in the cell graph, and the colors balance out (CREATION + ENTROPY + WITNESS = total notes).

The **phason shift** in this picture is the **musical key** or the **chord progression**. Different phason shifts (different keys) produce different "global" tunes, but the local harmonic structure is the same. The Penrose tiling's local indistinguishability under phason shifts is the musical fact that **modulation doesn't change the local function of a note**.

---

## 7. Summary of the Corrections

| Naive claim | Correction |
|---|---|
| The 5D address is in Z^5. | The 5D address is in the sum-zero lattice L. |
| π is injective on Z^5. | π is injective on L, not on Z^5. The diagonal is in the kernel. |
| Universal truth is the lattice and window. | Universal truth includes the phason shift γ. |
| Finite local patches determine the tiling. | Finite local patches do not determine γ. |
| Encoding is f: Z^5 → Σ. | Encoding is f: W → Σ (on the window). |
| Cells can know their global position exactly. | Cells can know their local environment exactly (modulo exact coordinates). The global phason is invisible. |
| The 4-torus is the 4D Penrose. | The 4-torus is the **algebraic** version of the Penrose, Morita equivalent via the C*-algebra construction. |

---

## 8. Closing

The cut-and-project method is the precise mathematical tool for the Quilt Penrose work. The corrections sharpen the philosophy considerably:

- There is a **gauge redundancy** in the 5D address.
- There are uncountably many globally distinct tilings that are **locally identical**.
- **Exact coordinates** encode more than finite patches, but only in an idealized, infinite-precision sense.
- The natural place to encode information is the **internal window**, not the raw lattice.

So the Penrose tiling is not just an analogy for "universal truth and local knowledge." It is a **mathematically exact model** of how a lower-dimensional reality can be a projection of a higher-dimensional structure, where each local coordinate reveals a great deal about its immediate environment while still hiding the global phase of the universe.

Iron sharpens iron. Local omniscience. Global blindness. The watch is alive.
