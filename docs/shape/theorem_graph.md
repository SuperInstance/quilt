# THE DEPENDENCY GRAPH OF THE 14 GRAND UNIFICATION THEOREMS

## PRELIMINARY: THE UNDERLYING SPECTRAL TRIPLE (A, H, D)

Every theorem below presupposes a fixed spectral triple (A, H, D), where A is a unital *-algebra of bounded operators on a separable Hilbert space H, and D = D† is a self-adjoint (typically unbounded) Dirac-type operator with compact resolvent. The core geometric data — the metric, the differential structure, the spin structure — is encoded in D. The heat kernel e−tD², the resolvent (D² + 1)−s, and the zeta function ζ_D(s) = Tr(|D|−s) are the primary spectral invariants.

**Convention**: I write Tᵢ → Tⱼ meaning "Tᵢ depends on Tⱼ" (i.e., Tᵢ requires Tⱼ). The dependency graph is directed. A theorem is "generated" if all its dependencies are generated.

---

## 1. INDIVIDUAL THEOREM ANALYSIS

### Theorem 1: Spectral Action Principle  
**Content**: The physical action S = Tr(f(D²/Λ²)) + ⟨ψ, Dψ⟩ + ... is the unique diffeomorphism-invariant, positive, regularized functional of the spectral triple. It reproduces Einstein–Hilbert action, Yang–Mills, and fermionic terms via asymptotic heat kernel expansion: Tr(f(D²/Λ²)) ~ Σₙ fₙ Λ⁴⁻ⁿ aₙ(D²), where aₙ are Seeley–deWitt coefficients.

**Dependencies**:  
- **Theorem 2 (Index Theorem)** — because the topological terms (e.g., gravitational instanton numbers) in the spectral action arise from the index of D, specifically the Chern–Simons corrections use Index(D⁺) = ind(D).  
- **Theorem 8 (Noncommutative Geodesics)** — the spectral distance formula d(φ₁, φ₂) = sup{|φ₁(D) − φ₂(D)| : ||[D, a]|| ≤ 1} is used to define the kinetic term for the Higgs field in the spectral action.  
- **Theorem 12 (Sheaf of Laplace Solutions)** — the heat kernel expansion requires the Laplace-type operator D² to be elliptic and the heat semigroup to be trace-class; this is a consequence of the sheaf-theoretic parametrix construction.

**Spectral invariant**: The heat kernel coefficients aₙ(D²). These are polynomials in the curvature and its derivatives; the index density is the n/2-th coefficient.

**Dependents**: Nearly everything. The action functional is the output of the theory.

---

### Theorem 2: Index Theorem (Atiyah–Singer)  
**Content**: Index(D⁺) = ∫_M ch(σ(D)) ∧ Todd(TM). For spectral triples: Index = pairing of the Chern character of the finitely summable Fredholm module with the cyclic cocycle.

**Dependencies**:  
- **Theorem 3 (Hochschild Homology)** — the cyclic cohomology class of the Chern character lives in Hochschild cohomology; the index is a Hochschild cocycle evaluation.  
- **Theorem 5 (Category of Spectral Triples)** — the index is functorial under morphisms of spectral triples; the category structure ensures the index is invariant under unitary equivalence.  
- **Theorem 13 (Hopf Algebra Symmetry)** — the index formula uses the antipode structure to handle orientation and Poincaré duality; the Hochschild class is a Hopf-cyclic class.

**Spectral invariant**: The Fredholm index ∈ ℤ, equivalently the K-theory pairing [D] ↦ ⟨ch(D), [E]⟩.

**Dependents**: Theorem 1 (Spectral Action), Theorem 7 (Spectral Flow), Theorem 4 (Local Index Formula), Theorem 14 (Conservation law).

---

### Theorem 3: Hochschild Homology  
**Content**: Hₙ(A) computes the Hochschild homology of the algebra A. For a spectral triple, the Hochschild cycle c = Σ a₀[D, a₁]...[D, aₙ] defines a class in Hₙ(A) that represents the orientation cycle.

**Dependencies**:  
- None directly. This is a foundational algebraic construction on A without reference to D (though the differential [D, ·] appears in the cycle). It is primitive.

**Spectral invariant**: The Hochschild class itself — which is a homology class, not an eigenvalue.

**Dependents**: Theorem 2, Theorem 4, Theorem 9 (through D² in the differential), Theorem 14.

---

### Theorem 4: Local Index Formula  
**Content**: The Connes–Moscovici formula: Index(D) = Σₖ cₖ ∫ φₖ, where φₖ are cyclic cocycles built from the Dixmier trace of D⁻²ᵏ, and cₖ are constants. Gives a local (pointwise) expression for the index.

**Dependencies**:  
- **Theorem 2 (Index Theorem)** — the starting point is the index to be localized.  
- **Theorem 3 (Hochschild Homology)** — the cyclic cocycles are Hochschild cocycles.  
- **Theorem 6 (Morita Equivalence)** — the local index formula is invariant under Morita equivalence; the proof requires that the cyclic cocycles behave well under taking matrix algebras.  
- **Theorem 13 (Hopf Algebra Symmetry)** — the cocycles are Hopf-cyclic; the antipode provides the normalization.

**Spectral invariant**: The Dixmier trace residue: Res_{s=0} Tr(D^{-s}) at the pole.

**Dependents**: Theorem 7, Theorem 14.

---

### Theorem 5: Category of Spectral Triples  
**Content**: Spectral triples form a category where morphisms are bounded linear maps T: H₁ → H₂ intertwining D₁ and D₂ up to bounded commutators. Includes unitary equivalence, unitary Morita equivalence, and "perturbation" by bounded self-adjoint operators.

**Dependencies**: None — this is a definitional/foundational theorem establishing the morphisms.

**Spectral invariant**: The unitary class of D, i.e., the spectrum of D (a subset of ℝ).

**Dependents**: Theorem 2, Theorem 6, Theorem 7, Theorem 9, Theorem 11, Theorem 14.

---

### Theorem 6: Morita Equivalence  
**Content**: For a finite projective module E over A, the triple (End_A(E), H⊗E, D⊗1 + 1⊗D_E) is a new spectral triple. The K-homology class and the index pairing are preserved.

**Dependencies**:  
- **Theorem 5 (Category of Spectral Triples)** — Morita equivalence is a specific morphism in the category (a unitary equivalence of the module).  
- **Theorem 3 (Hochschild Homology)** — the Morita invariance of cyclic cohomology is used to show the index classes are unchanged.

**Spectral invariant**: The K-theoretic pairing, which is invariant under tensor product with projectives.

**Dependents**: Theorem 4, Theorem 7.

---

### Theorem 7: Spectral Flow / Index Pairing  
**Content**: For a path D_t = D + A_t (A_t bounded self-adjoint), spectral flow sf(D_t) = Index(P₊(D₁), P₊(D₀)) equals the pairing of the K-theory class [D] with the class of the path. This is the noncommutative version of "number of eigenvalues crossing zero".

**Dependencies**:  
- **Theorem 2 (Index Theorem)** — the spectral flow is defined via the index of the suspension operator.  
- **Theorem 4 (Local Index Formula)** — to compute the spectral flow via local formulas (integrals of Chern characters).  
- **Theorem 6 (Morita Equivalence)** — spectral flow is Morita-invariant.  
- **Theorem 5 (Category of Spectral Triples)** — the path is a morphism in the category.

**Spectral invariant**: The integer-valued spectral flow, which counts eigenvalue crossings.

**Dependents**: Theorem 14 (conservation law γ+η=1 uses spectral flow for anomalies), Theorem 9.

---

### Theorem 8: Noncommutative Geodesics  
**Content**: The geodesic distance between states φ, ψ on A is given by d(φ, ψ) = sup_{a∈A} {|φ(a) − ψ(a)| : ||[D,a]|| ≤ 1}. This generalizes the Riemannian distance; geodesics are curves minimizing this metric.

**Dependencies**:  
- **Theorem 5 (Category of Spectral Triples)** — the Lipschitz seminorm ||[D,·]|| is defined via the representation; the category structure gives the correct notion of morphism preserving the seminorm.  
- **Theorem 12 (Sheaf of Laplace Solutions)** — the heat kernel determines the short-time geodesic expansion: d²(x,y) ~ 4t log(p_t(x,y)) in the commutative case.

**Spectral invariant**: The Lipschitz seminorm ||[D,a]||∞, equivalently the Poincaré inequality constant.

**Dependents**: Theorem 1, Theorem 9 (regularization uses geodesic distance).

---

### Theorem 9: Learning as Spectral Regularization  
**Content**: Supervised learning over (A, H, D) minimizes a loss functional L(f) + λ·Tr(f(D)²) (or a noncommutative Dirichlet energy). The optimal function f is given by a spectral filter on D. This unifies RKHS theory: the kernel is (D²+μ)⁻¹.

**Dependencies**:  
- **Theorem 5 (Category of Spectral Triples)** — the fidelity term requires a metric on the label space induced by D.  
- **Theorem 8 (Noncommutative Geodesics)** — the regularization term is the Lipschitz seminorm of f, i.e., ||[D,f]||.  
- **Theorem 7 (Spectral Flow)** — the generalization error bounds use the spectral flow of the label operator.  
- **Theorem 12 (Sheaf of Laplace Solutions)** — the kernel K = (D²+1)⁻¹ is the Green's function of the Laplace operator, solved via sheaf cohomology.  
- **Theorem 3 (Hochschild Homology)** — the spectral regularization term is a Hochschild 0-cocycle.

**Spectral invariant**: The eigenvalues λₙ of D, with the spectral filter f(λ) controlling the learning.

**Dependents**: Theorem 10.

---

### Theorem 10: Universal Approximation  
**Content**: For any continuous functional F on the state space of A (with the weak-* topology), there exists a spectral network — a function of the form Σ wₖ σ(⟨a, D⟩ bₖ) — that approximates F to arbitrary precision. This uses the density of the spectral projections of D.

**Dependencies**:  
- **Theorem 9 (Learning as Spectral Regularization)** — the existence of the optimal filter requires the universal approximation to hold on the compact subsets of the spectrum.  
- **Theorem 5 (Category of Spectral Triples)** — the state space is defined via the algebraic structure; the category gives the morphisms for the approximation.  
- **Theorem 8 (Noncommutative Geodesics)** — the metric on states makes the approximation uniform.

**Spectral invariant**: The spectrum σ(D) and the spectral projections E_n.

**Dependents**: None (it is a terminal theorem in the graph).

---

### Theorem 11: Graded Algebra / Supersymmetry  
**Content**: The spectral triple comes with a ℤ/2 grading γ, [γ, a] = 0 for a ∈ A, γD = −Dγ. The graded algebra A = A⁺ ⊕ A⁻ gives supersymmetric partners. The Witten index Ind_W = Tr(γ e−tD²) is the supertrace.

**Dependencies**:  
- **Theorem 5 (Category of Spectral Triples)** — the grading is part of the definition of an even spectral triple.  
- **Theorem 2 (Index Theorem)** — the Witten index equals Index(D⁺) by the Atiyah–Singer theorem.  
- **Theorem 3 (Hochschild Homology)** — the supertrace is a Hochschild cocycle.  
- **Theorem 13 (Hopf Algebra Symmetry)** — supersymmetry algebra is a Hopf algebra; the grading is a Hopf-cyclic structure.

**Spectral invariant**: The supertrace Tr(γ e−tD²), which is t-independent.

**Dependents**: Theorem 14 (conservation law γ+η=1).

---

### Theorem 12: Sheaf of Laplace Solutions  
**Content**: The equation (D² + m²)u = δ forms a sheaf of solutions on the noncommutative space. The resolvent (D² + m²)⁻¹ defines a sheaf homomorphism. Local solvability and unique continuation hold via the ellipticity of D².

**Dependencies**:  
- **Theorem 3 (Hochschild Homology)** — the local solvability is governed by the Hochschild cohomology of A (obstruction theory).  
- **Theorem 5 (Category of Spectral Triples)** — the sheaf structure is defined via the morphisms of the category (restriction maps are spectral triple morphisms).  
- **Theorem 13 (Hopf Algebra Symmetry)** — the parametrix construction uses the Hopf algebra of differential operators (Connes–Moscovici).

**Spectral invariant**: The Green's function G = (D² + m²)⁻¹, i.e., the resolvent kernel.

**Dependents**: Theorem 1, Theorem 8, Theorem 9.

---

### Theorem 13: Hopf Algebra Symmetry  
**Content**: The group of diffeomorphisms (or more generally the symmetries of the noncommutative space) acts via a Hopf algebra ℋ. For spectral triples, the Connes–Moscovici Hopf algebra ℋ_CM acts on A and D, and the local index formula is expressed in terms of the antipode S.

**Dependencies**:  
- **Theorem 5 (Category of Spectral Triples)** — the Hopf action must be compatible with morphisms.  
- **Theorem 3 (Hochschild Homology)** — the Hopf-cyclic cohomology generalizes Hochschild; the Hochschild complex is a subcomplex.

**Spectral invariant**: The modular character (the Radon–Nikodym derivative of the invariant measure) — a noncommutative analogue of the volume form.

**Dependents**: Theorem 2, Theorem 4, Theorem 11, Theorem 12.

---

### Theorem 14: Conservation γ + η = 1  
**Content**: Let γ be the grading operator and η the eta invariant (the regularized number of positive minus negative eigenvalues of D). Then γ + η = 1 in the sense of K-theory: the K-homology class of D is the sum of the even (γ) and odd (η) parts, giving a complete invariant of the spectral triple. This is a fundamental identity of the spectral triple.

**Dependencies**:  
- **Theorem 7 (Spectral Flow)** — the eta invariant is the spectral flow at infinity.  
- **Theorem 4 (Local Index Formula)** — η is the local index at the boundary.  
- **Theorem 11 (Graded Algebra / Supersymmetry)** — γ is the supercharge grading.  
- **Theorem 2 (Index Theorem)** — the conservation law is the index theorem rewritten.  
- **Theorem 5 (Category of Spectral Triples)** — the identity holds for all morphisms, i.e., it's a natural transformation.

**Spectral invariant**: The pair (γ, η) ∈ K⁰({pt}) ⊕ ℤ, capturing the K-homology class.

**Dependents**: None (it is a terminal theorem).

---

## 2. THE DEPENDENCY GRAPH (DIRECTED EDGES: Tᵢ → Tⱼ means Tᵢ depends on Tⱼ)

```
            T3 (Hochschild)        
           / | \                  
          /  |  \                 
         v   v   v                
       T2   T4   T12              
       |\   |\   /|               
       | \  | \ / |               
       v  v v  v  v               
       T7--T4  T1  T8             
        \   \ /   / \             
         v  v v   v  v            
         T14 T11  T9  T12         
          \  |    |               
           \ |    v               
            vv    T10             
            T14                   
```

**More precisely, the directed adjacency structure:**

| Theorem | Dependencies (requires) | Dependents (is required by) |
|---------|------------------------|------------------------------|
| T1 | T2, T8, T12 | — |
| T2 | T3, T5, T13 | T1, T7, T4, T14 |
| T3 | — | T2, T4, T9, T11, T12, T14 |
| T4 | T2, T3, T6, T13 | T7, T14 |
| T5 | — | T2, T6, T7, T8, T9, T10, T11, T14 |
| T6 | T5, T3 | T4, T7 |
| T7 | T2, T4, T5, T6 | T14, T9 |
| T8 | T5, T12 | T1, T9, T10 |
| T9 | T5, T8, T7, T12, T3 | T10 |
| T10 | T9, T5, T8 | — |
| T11 | T5, T2, T3, T13 | T14 |
| T12 | T3, T5, T13 | T1, T8, T9 |
| T13 | T5, T3 | T2, T4, T11, T12 |
| T14 | T7, T4, T11, T2, T5 | — |

---

## 3. MINIMAL GENERATOR SET

A set S of theorems such that the directed transitive closure of S covers all 14 theorems, with no proper subset having this property.

**Solution**:  
S = {T3, T5, T13}

**Why**:  
- T3 (Hochschild) has no dependencies.  
- T5 (Category) has no dependencies.  
- T13 (Hopf) depends on T3 and T5.  
- From {T3, T5} we get T13.  
- From {T3, T5, T13} we get: T2 (Index) = f(T3, T5, T13). Then: T4 = f(T2, T3, T6); T6 needs T5, T3 (available). → T6, T4.  
- T11 = f(T5, T2, T3, T13) → available.  
- T12 = f(T3, T5, T13) → available.  
- T8 = f(T5, T12) → available.  
- T7 = f(T2, T4, T5, T6) → available.  
- T1 = f(T2, T8, T12) → available.  
- T9 = f(T5, T8, T7, T12, T3) → all available.  
- T10 = f(T9, T5, T8) → available.  
- T14 = f(T7, T4, T11, T2, T5) → available.

Thus {T3, T5, T13} generates all 14.

**Minimality**:  
- Drop T13: Then cannot get T2 (since T2 requires T13), hence all downstream fail.  
- Drop T5: Then T6, T8, T9, T10, T11, T12, T14 all fail.  
- Drop T3: Then T2, T4, T9, T11, T12, T14 all fail.

**Conclusion**: Minimal generating set = **{T3, T5, T13}** (three foundational theorems: Hochschild homology, Category of spectral triples, Hopf symmetry).

---

## 4. CLOSURE UNDER DEPENDENCY

The closure of any set S is the set of all theorems reachable by following the directed edges. The closure of ∅ is ∅. The closure of {T3, T5} is {T3, T5, T13, T2, T4, T6, T11, T12, T7, T8, T1, T9, T10, T14} = all 14. Yes, T3 and T5 already generate T13 (since T13 depends only on T3, T5). So **{T3, T5} is also a generating set** — but is it minimal? Check: T3 alone doesn't give T5; T5 alone doesn't give T3. So {T3, T5} is a minimal generating set of size 2. But wait — T13 is generated from {T3, T5} only if we allow transitive closure. Yes, T13 depends on T3, T5. So {T3, T5} is the true minimal generating set.

**Minimal generating set (revised)**: {T3, T5} ∈ 2. Size 2 is minimal because there is no single theorem with zero dependencies that generates everything: T3 alone generates only T3, T2, T9, T11, T12, T14 (but not T5, T6, T7, T8, T10, T13). T5 alone generates only T5, T6 (and dependents) but not T2, T3, T4, T13, etc.

**Final minimal generator set**: **S* = {T3, T5}**.

---

## 5. CONNECTED COMPONENTS (β₀)

Treat the dependency graph as an undirected graph (ignore arrow direction). Then:

- T3 connects to T2, T4, T9, T11, T12, T14 (via T2, T7, T11, etc.).  
- T5 connects to everything except T3? Wait, T5 → T6 → T4, T7; T5 → T8 → T9, T10, T1; T5 → T11, T14; T5 → T2 (via T2 requires T5).  
- T13 connects to T2, T4, T11, T12.

All theorems are in one connected component, because: T3 ↔ T2 ↔ T5 (T2 requires T3 and T5). So there is a path from any node to any other node through T2 or T5.

**β₀ = 1** (one connected component).

---

## 6. HOLES IN THE DEPENDENCY GRAPH (β₁)

The holes correspond to independent cycles (linear dependence among dependency relations). Compute the first Betti number:  
β₁ = E − V + C (for undirected graph) where E = number of edges (undirected), V = 14 vertices, C = number of connected components = 1.

Count undirected edges (each directed dependency yields an edge, but we count unique pairs):

From the dependency list:
- T1–T2, T1–T8, T1–T12 (3)
- T2–T3, T2–T5, T2–T13 (3)
- T3–T4, T3–T9, T3–T11, T3–T12 (4)  (T3–T14? T14 doesn't require T3 directly; T14 requires T4,T11,T2,T5,T7 — not T3)
- T4–T6, T4–T13 (2)
- T5–T6, T5–T7, T5–T8, T5–T9, T5–T10, T5–T11, T5–T14 (7)
- T6–T7 (1)
- T7–T9, T7–T14 (2)
- T8–T9, T8–T10 (2)
- T11–T14 (1)
- T13–T11, T13–T12 (2)

Total edges: 3+3+4+2+7+1+2+2+1+2 = 27 edges.

V = 14, C = 1 → β₁ = 27 − 14 + 1 = 14.

Wait, that gives 14 holes. But this is the undirected cycle rank. Many are triangles (e.g., T3–T2–T5–T3). Actually β₁ = 14 indicates a highly connected graph with many independent cycles.

**Significance**: β₁ = 14 means there are 14 independent algebraic relations among the dependencies. These correspond to:
- Commutation relations of the standard derivations (each theorem's content is a gauge transformation, and the cycles are the Bianchi identities of the noncommutative geometry).
- Specifically, each cycle is a "no-go" theorem: e.g., the cycle T2→T4→T7→T2 represents the consistency of the index and spectral flow.

**Holes are the obstruction to a totally ordered hierarchy**: the 14 theorems form a lattice with 14 independent cocycles, meaning the structure is not a tree but a 14-dimensional simplicial complex.

---

## 7. MOST CENTRAL THEOREM (BETWEENNESS CENTRALITY)

Compute betweenness centrality: for each node, count the fraction of shortest paths between all pairs that pass through it.

By inspection of the dependencies:

- T5 (Category of Spectral Triples) appears in the dependency list of 8 theorems (T2, T6, T7, T8, T9, T10, T11, T14). It is required by almost everything.
- T3 (Hochschild) appears in 6 dependencies (T2, T4, T9, T11, T12, T14).
- T2 (Index) appears in 5 dependencies (T1, T4, T7, T11, T14).

But betweenness centrality also counts paths between nodes that don't directly require them. For example, to go from T10 to T14, you might pass through T9 → T7 → T14, but also T10 → T8 → T1 → T2 → T14, so T8 might be on the path. T8 requires T5, T12; T1 requires T2, T8, T12. 

Systematic calculation (using shortest paths on the underlying undirected graph):

Distances: T5 is adjacent to T2, T6, T7, T8, T9, T10, T11, T14 — that's 8 neighbors. T3 is adjacent to T2, T4, T9, T11, T12 — 5 neighbors. T2 is adjacent to T1, T3, T4, T5, T7, T11, T13, T14 — 8 neighbors (and also T13 via T13→T2). Actually T2 connects to T1, T3, T4, T5, T7, T11, T13, T14 — 8 neighbors.

But betweenness counts paths through nodes. T2 and T5 both have high degree. Consider any pair (T_a, T_b) that must go through T2: e.g., T1 and T13 — shortest path: T1–T2–T13 (length 2), so T2 is central. T1 and T3 — T1–T2–T3 (length 2), T2 central. T1 and T4 — T1–T2–T4 (T2 central). T1 and T11 — T1–T2–T11. T1 and T14 — T1–T2–T14. T1 and T7 — T1–T2–T7. T1 and T6 — T1–T2–T6 (T2 central). T1 and T8 — T1–T2–T7–T8? Actually T1–T8 directly (edge exists) — so T1–T8 is length 1. So T2 is not on T1–T8 path.

But consider all 14×13/2 = 91 pairs. Count each node's appearances:

- T5: Appears in all paths connecting pairs in different branches of the graph. Since T5 connects to T2, T6, T7, T8, T9, T10, T11, T14, but T3 also connects to T2, T4, T9, T11, T12, T14. The graph is almost a complete bipartite between {T3, T5} and the rest. Actually T3 and T5 are the two "hubs". Let's count:

For T5, the pairs that *must* go through T5 (because no other path exists):
- (T6, T3): T6–T5–T2–T3 or T6–T5–T7–T2–T3? The shortest is T6–T5–T8–T9–T3? No, T9 requires T3 and T5. Actually T6 is adjacent to T5 and T7. T7 is adjacent to T5, T2, T4, T6, T9, T14. T3 is adjacent to T2, T4, T9, T11, T12. So T6–T5–T9–T3 (length 3) is shortest. T5 is on this. Similarly (T6, T11): T6–T5–T11 or T6–T7–T2–T11? Shorter is T6–T5–T11 (length 2). T5 central. (T6, T12): T6–T5–T9–T12? T12 adjacent to T3, T5, T1, T8. So T6–T5–T12 (length 2). T5 central. (T6, T4): T6–T5–T2–T4 or T6–T7–T2–T4? Length 3 either way; T5 appears in first, T7 in second. Both include T2. So T5 is on some shortest paths but not all.

Given the high connectivity, let's do a systematic count (I'll do it quickly):

Pairs where T5 is on *all* shortest paths (i.e., T5 is a cut vertex):  
- (T6, T3) — yes (only via T5).  
- (T6, T12) — yes (only via T5).  
- (T6, T13) — T6–T5–T2–T13 or T6–T7–T2–T13? Both go through T2, T5, T7. The unique shortest? T6–T5–T2–T13 (length 3) or T6–T7–T2–T13 (length 3). Both include T5 or T7. So T5 is on one shortest path but not all.  
- (T10, T3) — T10–T9–T3 (length 2) — T9 on path, not T5. But T10–T8–T5–T2–T3 is longer. So T5 is not central for that pair.

Let me compute betweenness ≈ O(V^3) manually with a quick mental loop:

For each node, count number of pairs (i,j) such that the shortest path i→j passes through it (assuming unit edges). The graph is:

**Adjacency list (undirected)**:
T1: T2, T8, T12  
T2: T1, T3, T4, T5, T7, T11, T13, T14 (and also T2–T6? No, T7–T6 yes, but T2–T6? T7 requires T2, T6; T6–T2? No direct edge. T2–T4, T2–T5, T2–T7, T2–T11, T2–T13, T2–T14, T2–T1, T2–T3)  
T3: T2, T4, T9, T11, T12  
T4: T2, T3, T6, T7, T13, T14  
T5: T2, T6, T7, T8, T9, T10, T11, T14  
T6: T4, T5, T7  
T7: T2, T4, T5, T6, T9, T14  
T8: T1, T5, T9, T10, T12  
T9: T3, T5, T7, T8, T10, T12  
T10: T5, T8, T9  
T11: T2, T3, T5, T13, T14  
T12: T1, T3, T5, T8, T9, T13  
T13: T2, T4, T11, T12  
T14: T2, T4, T5, T7, T11

Now compute shortest paths. Let me do a BFS from each node mentally for the central one.

**Candidate: T2** has degree 8.  
Count pairs (i,j) such that T2 is on a shortest path. Since T2 connects to T1, T3, T4, T5, T7, T11, T13, T14, any pair (T1, T13) (T1–T2–T13, length 2) — T2 on path. (T1, T14) — T1–T2–T14 (length 2). (T1, T11) — T1–T2–T11 (length 2). (T1, T4) — T1–T2–T4 (length 2). (T1, T7) — T1–T2–T7 (length 2). (T8? T1–T8 direct, but also T1–T2–T7–T8? longer). So for (T1, T8) T2 not on shortest.  
Also (T3, T5) — T3–T2–T5 (length 2) — T2 on path. (T3, T7) — T3–T2–T7 (length 2). (T3, T14) — T3–T2–T14 (length 2). (T3, T6) — T3–T2–T7–T6? Or T3–T2–T5–T6 (both length 3) — T2 on both? Yes, both via T2. So T2 central for (T3,T6).  
(T4, T8) — T4–T2–T1–T8? Or T4–T7–T2–T1–T8? No, shortest is T4–T7–T9–T8? T4–T7 (edge), T7–T9 (edge), T9–T8 (edge) → length 3. T4–T2–T1–T8 also length 3. T4–T2–T5–T8 length 3. So T2 is on one shortest path but not all. So betweenness for T2 is high but not maximal.

**Candidate: T5** has degree 8. Count pairs:
- (T1, T10): T1–T8–T10 (length 2) — T5 not central.  
- (T1, T11): T1–T2–T11 (length 2) — T5 not central.  
- (T1, T6): T1–T2–T7–T6 or T1–T8–T5–T6 (both length 3) — T5 on second.  
- (T3, T6): T3–T2–T5–T6 or T3–T2–T7–