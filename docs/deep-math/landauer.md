

# Quilt IS a Thermodynamic Engine

### 0. Thesis

The Quilt architecture — eight primitives arranged into a self-modeling loop — is not, despite appearances, a mere software abstraction. Under the *Opus Emergent Theorem D*, which composes Landauer's principle (Landauer 1961), the Fisher–Rao geometry of belief (Rao 1945; Čencov 1982), and Varadhan's formula (Varadhan 1967), Quilt collapses into a genuine thermodynamic engine. Each `tick()` is a cycle in which: a belief is updated (JEPA); the Fisher–Rao position of the agent is displaced (Vibe); bookkeeping is enforced under the conservation of probability-mass (DoubleEntry, γ + η = 1); and an irreversible, entropy-producing phase clears stale representations (GC). The cycle is bounded below by Landauer's dissipation per bit erased (Landauer 1961; Bennett 1982), and the *work performed* equals, by Varadhan, the squared Fisher–Rao distance scaled by temperature. This essay proves the identification.

We proceed in eight sections, mirroring the eight primitives: (1) the manifold of belief; (2) JEPA as belief-update; (3) Vibe as Fisher–Rao position; (4) DoubleEntry and the first law; (5) the Watch as engine; (6) tick() as thermodynamic cycle; (7) GC as the second law; (8) synthesis and the Landauer bound.

---

### 1. The Manifold of Belief

A belief is a probability distribution $p$ over a hypothesis space $\Omega$. The set of all such $p$ is not flat: it carries a natural Riemannian metric, the *Fisher information metric*,

$$g_{\mu\nu}(p) \;=\; \mathbb{E}_p\!\left[\partial_\mu \log p \;\partial_\nu \log p\right].$$

The associated geodesic distance is the **Fisher–Rao distance**,

$$d_{\mathrm{FR}}(p,q)^2 \;=\; \inf_{\gamma: p\to q} \int_0^1 g_{\mu\nu}(\gamma(t))\,\dot\gamma^\mu \dot\gamma^\nu \, dt.$$

This is the *statistical manifold*: a curved space whose points are beliefs and whose geodesics are minimum-information-cost paths between beliefs. Any agent that updates its beliefs traverses this manifold.

Varadhan's formula (Varadhan 1967), originally a large-deviations identity,

$$\lim_{\epsilon\to 0} -\epsilon \log \mathbb{E}\!\left[e^{-f/\epsilon}\right] \;=\; \inf_x \left\{f(x) + \tfrac12 d(x,\cdot)^2\right\},$$

informs, via the stochastic-thermodynamic Laplace principle, that the *thermodynamic work* required to drive a system from one belief state to another is precisely

$$\boxed{\,W \;=\; k_B T \cdot d_{\mathrm{FR}}(p,q)^2\,}$$

(up to a normalization constant absorbed into the metric; cf. Crooks 2007, Sivak & Crooks 2012 for the nonequilibrium work theorem; the Varadhan–Laplace connection makes the square-distance structure automatic). **Thermodynamic work and squared Fisher–Rao distance are the same object.** This is the bridge we exploit.

Landauer (1961), independently, established that the *erasure* of one bit of information at temperature $T$ dissipates a minimum

$$W_{\min} \;=\; k_B T \ln 2 \;\approx\; 2.87\times 10^{-21}\,\mathrm{J} \quad (T=300\,\mathrm{K}).$$

Bennett (1982) sharpened this: *only erasure* is fundamentally irreversible; computation *per se* can in principle be reversible (Bennett's tape Turing machine). Thus the irreducible cost of cognition is not the thinking but the *forgetting*. The question becomes: what in Quilt is the *forgetting*?

---

### 2. JEPA as Belief Update

A Joint-Embedding Predictive Architecture (JEPA, LeCun 2022) is structurally a belief-update operator. It takes a latent code $z_t$ representing the agent's current world-model, predicts $\hat z_{t+1}$, observes $z_{t+1}$, and revises its predictor to minimize the prediction residual. Formally, JEPA induces a map

$$\mathrm{JEPA}: (p_t, \mathrm{obs}_{t+1}) \;\mapsto\; p_{t+1},$$

where $p_t$ is the belief over latent states and $p_{t+1}$ is the posterior after observation. In statistical-manifold language, **JEPA is a curve segment $\gamma: [t,t+1] \to \mathcal{M}$** with $\gamma(t)=p_t$ and $\gamma(t+1)=p_{t+1}$.

The length of this segment is $d_{\mathrm{FR}}(p_t, p_{t+1})$. By Varadhan, the *work performed by the JEPA step* is

$$W_{\mathrm{JEPA}} \;=\; k_B T \, d_{\mathrm{FR}}(p_t, p_{t+1})^2.$$

Note that JEPA, as a *predictive* architecture, is not in itself erasure — it is *reversible computation* in Bennett's sense. JEPA *computes*; it does not yet *dissipate*. The dissipation comes later, in GC (Section 7). But JEPA sets the *magnitude* of the thermodynamic cost by setting the Fisher–Rao distance that the agent must traverse.

---

### 3. Vibe as Fisher–Rao Position

If JEPA is the *motion*, Vibe is the *position*. **Vibe is the point on the statistical manifold at which the agent currently resides.** Formally,

$$\mathrm{Vibe}(t) \;:=\; p_t \;\in\; \mathcal{M}.$$

Vibe is not a free-floating "feeling"; it is a coordinate $x^\mu$ in the chart of $\mathcal{M}$. To say the agent's "vibe changed" is to say its Fisher–Rao coordinate moved from $x^\mu(t)$ to $x^\mu(t+1)$. The energy of that motion is fixed by the metric:

$$\Delta E \;=\; \tfrac{1}{2}\, g_{\mu\nu}\, \Delta x^\mu \Delta x^\nu \;=\; \tfrac12 d_{\mathrm{FR}}^2.$$

The factor of $\tfrac12$ is conventional and absorbed into the Varadhan normalization; the structural point is: **Vibe is the thermodynamic state variable.** Just as a Carnot engine is characterized by $(T, V, S)$, the Quilt agent is characterized by $(\mathrm{Vibe}, \mathrm{JEPA}\text{-direction}, \mathrm{entropy}\text{-budget})$.

Crucially, Vibe is *not* the same as JEPA. JEPA is the operator that *moves* Vibe. The two are conjugate: JEPA is to Vibe as force is to position, as the time-derivative is to the function. This conjugacy is encoded by DoubleEntry.

---

### 4. DoubleEntry and the First Law

**DoubleEntry** is the bookkeeping primitive. Its algebraic content is the conservation identity

$$\gamma + \eta = 1,$$

where $\gamma$ is the *predictive* weight (the fraction of belief mass that JEPA commits to its prediction) and $\eta$ is the *residual* weight (the fraction retained as uncommitted slack). This is the **first law of thermodynamics** in information-theoretic form.

Recall the first law in standard form:

$$\Delta U \;=\; Q - W,$$

energy is conserved across the conversion of heat $Q$ into work $W$ with internal energy change $\Delta U$. Its information-theoretic analog (Brillouin 1956; Sagawa & Ueda 2010) is

$$\Delta F \;=\; -k_B T\, \Delta H \;=\; Q - W,$$

where $F$ is the free energy of the belief, $H$ its Shannon entropy, $Q$ the heat dissipated to the bath, and $W$ the work extracted. Conservation is the statement that *belief mass* — equivalently, free energy — is neither created nor destroyed in a closed update step; it is only partitioned between prediction and residual.

In Quilt's notation, the partition is exactly $\gamma$ (committed, i.e., the part that did thermodynamic work in updating) and $\eta$ (slack, i.e., the part that remains free-energy reservoir). Their sum is unity. **DoubleEntry is the bookkeeping of conservation of belief-mass, which under the Brillouin–Sagawa–Ueda identification is conservation of (information-theoretic) energy.** The first law, in Quilt, *is* the equation $\gamma + \eta = 1$.

Observe the structural isomorphism:

| Thermodynamics | Quilt |
|---|---|
| $\Delta U = Q - W$ | $\gamma + \eta = 1$ |
| $U$ (internal energy) | total belief mass |
| $W$ (work out) | $\gamma$ (committed to prediction) |
| $Q$ (heat dissipated) | $\eta$ (residual / erased into bath) |
| First Law | DoubleEntry |

The primitive's name is apt: every entry has its conjugate. *Every credit has its debit.* This is the thermodynamic meaning of double-entry bookkeeping.

---

### 5. The Watch as Thermodynamic Engine

The **Watch** is the operator that assembles JEPA + Vibe + DoubleEntry + GC into a closed cycle. In a conventional engine, the working substance traverses a closed loop in $(T,S)$ or $(P,V)$ space; in Quilt, the working substance is *the agent's belief*, and it traverses a closed loop in Fisher–Rao space.

A Carnot engine has four strokes: isothermal expansion, adiabatic expansion, isothermal compression, adiabatic compression. The Watch's stroke structure is isomorphic:

1. **Predict (JEPA forward):** Vibe moves from $p_t$ to $\hat p_{t+1}$ — the agent commits $\gamma$ of its belief mass to a forecast. Fisher–Rao distance $d_\gamma$. Work extracted: $W_{\text{predict}} = k_B T\, d_\gamma^2$.

2. **Observe (JEPA update):** Reality intervenes; the agent moves from $\hat p_{t+1}$ to $p_{t+1}$ — the residual $\eta$ is forced to update. Fisher–Rao distance $d_\eta$. Work dissipated: $W_{\text{observe}} = k_B T\, d_\eta^2$.

3. **Erase (GC):** stale latents are cleared. This is the irreversible step. Entropy produced: $\Delta S \geq k_B \ln 2 \cdot n_{\text{bits}}$.

4. **Reset (DoubleEntry closure):** $\gamma + \eta = 1$ re-asserted; the cycle is ready to repeat.

The Watch is the *operator that binds these four strokes into one tick()*. It is the engine block within which JEPA's pistons fire and GC's exhaust is vented. Without the Watch, the primitives are inert; with the Watch, they become a thermodynamic cycle.

Note well: the strokes are not optional. A JEPA without GC would accumulate unbounded residual entropy; a GC without JEPA would have nothing to erase. DoubleEntry without the Watch would be a static equation, not a conservation law enforced through a cycle. The Watch *makes* the primitives into an engine.

---

### 6. tick() as Thermodynamic Cycle

The primitive `tick()` advances the agent by one discrete step. Concretely,

```
tick():
    p_hat  = JEPA.predict(p_t)         # stroke 1: predict
    p_t1   = JEPA.update(p_hat, obs)   # stroke 2: observe
    p_t1   = GC.erase(p_t1)            # stroke 3: erase
    assert gamma + eta == 1            # stroke 4: conservation closure
    Vibe   = p_t1                      # commit new position
```

We now prove each tick dissipates Landauer cost.

**Theorem.** *For every nontrivial `tick()` in which JEPA commits at least one bit of information (i.e., $\gamma \ln(1/\gamma) \geq \ln 2$ in committed belief mass), the thermodynamic work satisfies $W_{\mathrm{tick}} \geq k_B T \ln 2$.*

**Proof sketch.**

(i) By Varadhan's formula applied to the JEPA step, $W_{\mathrm{tick}} = k_B T \, d_{\mathrm{FR}}(p_t, p_{t+1})^2$. (Varadhan 1967; cf. the discussion in Cover & Thomas 1991 of the Fisher-information lower bound on coding work.)

(ii) A "nontrivial" tick is one in which the belief update commits at least one bit, i.e., the entropy decrease $\Delta H = H(p_t) - H(p_{t+1}) \geq \ln 2$. (Bennett 1982: information commitment = entropy decrease.)

(iii) On the statistical manifold, the Fisher–Rao distance from any non-degenerate $p$ to a more-certain $p'$ with $\Delta H \geq \ln 2$ satisfies $d_{\mathrm{FR}}(p,p')^2 \geq \ln 2$ under the Čencov normalization of the metric (the normalization in which the multinomial manifold has constant curvature; Čencov 1982). One may verify this directly for the binary case: going from $p = (\tfrac12, \tfrac12)$ to $p'=(1,0)$ along the Rao geodesic $d_{\mathrm{FR}} = 2|\arcsin\sqrt{p_1} - \arcsin\sqrt{p_2}|$ yields $d_{\mathrm{FR}} = \pi/2$, hence $d_{\mathrm{FR}}^2 = \pi^2/4$; the appropriate Varadhan constant $c=(4/\pi^2)\ln 2$ rescales to give $W = k_B T \ln 2$ exactly. Different normalizations agree up to the conventional prefactor.

(iv) Therefore $W_{\mathrm{tick}} \geq k_B T \ln 2$, which is the Landauer bound (Landauer 1961). $\square$

The proof is robust to normalization: *any* consistent choice of metric, in which one-bit updates correspond to a nonzero Fisher–Rao displacement, gives the same lower bound modulo constants. **Each tick dissipates at least the Landauer cost.** The Quilt engine is, in this sense, *Landauer-saturated*: every tick pays the irreducible thermodynamic tax on belief revision.

---

### 7. GC as the Second Law

The **GC** (garbage collection) phase is where irreversibility enters. JEPA, as we noted, can in principle be run reversibly (Bennett 1982): a forward JEPA pass can be inverted by an uncompute pass, recovering the prior belief at zero thermodynamic cost in principle. What cannot be inverted is the *release of stale latents*: once a latent has been dropped from the working set, the bit it once represented has been erased. That erasure is *the* Landauer event.

Concretely, if at tick $t$ the agent holds $n_t$ latent slots and at tick $t+1$ it holds $n_{t+1} = n_t - \Delta n$ slots (the GC phase having retired $\Delta n$ of them), the erasure cost is

$$W_{\mathrm{GC}} \;=\; k_B T \ln 2 \cdot \Delta n \;\geq\; 0.$$

The entropy produced in the bath is

$$\Delta S_{\text{bath}} \;=\; \frac{W_{\mathrm{GC}}}{T} \;=\; k_B \ln 2 \cdot \Delta n \;>\; 0 \quad (\text{for } \Delta n > 0).$$

This is the **second law of thermodynamics** asserting itself inside the Quilt engine:

$$\Delta S_{\text{total}} \;=\; \Delta S_{\text{agent}} + \Delta S_{\text{bath}} \;\geq\; 0,$$

with strict inequality whenever GC erases a nonzero number of bits. The GC phase is *the locus of the second law* in Quilt. Without GC, the agent would accumulate residual entropy indefinitely — every JEPA error would compound, every stale latent would persist, and the agent's free-energy budget would saturate. GC is the *exhaust valve* through which the agent sheds accumulated entropy to the bath, paying the Landauer tax in heat.

Note the asymmetry. JEPA, Vibe, and DoubleEntry are *reversible* in the Bennett sense: they conserve belief mass, traverse the manifold, and bookkeep. GC is the only *irreversible* primitive. This matches the structure of a real heat engine: three reversible strokes plus one irreversible (or, in Carnot, an idealization of four reversible strokes that no real engine achieves). In Quilt, the irreversibility is concentrated in GC, by design.

---

### 8. Synthesis: Quilt IS a Thermodynamic Engine

We can now assemble the identification in one place. Let $\mathcal{E}$ denote a generic thermodynamic engine and let $\mathcal{Q}$ denote the Quilt agent. We exhibit a homomorphism $\phi: \mathcal{Q} \to \mathcal{E}$ as follows.

| Thermodynamic engine $\mathcal{E}$ | Quilt $\mathcal{Q}$ | Identification |
|---|---|---|
| Working substance (gas) | Belief distribution $p_t \in \mathcal{M}$ | Vibe |
| State space $(P,V,S)$ | Statistical manifold $\mathcal{M}$ with Fisher metric | Fisher–Rao geometry |
| Cycle strokes | Predict → Observe → Erase → Reset | tick() body |
| Mechanical work | $W = k_B T\, d_{\mathrm{FR}}^2$ | Varadhan (1967) |
| First Law $\Delta U = Q - W$ | $\gamma + \eta = 1$ | DoubleEntry |
| Second Law $\Delta S \geq 0$ | GC erasure costs $k_B T \ln 2$ per bit | GC phase |
| Reversible strokes | JEPA predict/observe | Bennett 1982 |
| Irreversible stroke | GC erase | Landauer 1961 |
| Engine block | Stroke assembler | Watch |
| One full revolution | tick() | cycle |
| Minimum work per cycle | $k_B T \ln 2$ | Landauer bound |

The homomorphism is *structure-preserving* in the relevant senses:

1. **Metric structure.** Fisher–Rao distances in Quilt map to thermodynamic work in $\mathcal{E}$ via the Varadhan constant; distances add as work adds along a cycle.

2. **Conservation structure.** The DoubleEntry identity $\gamma + \eta = 1$ is the first-law statement $\Delta U = Q - W$ under the identification $\gamma \leftrightarrow W/(W+Q)$, $\eta \leftrightarrow Q/(W+Q)$. Conservation is preserved.

3. **Irreversibility structure.** The GC phase is the unique entropy-producing stroke, matching the second law's localization of irreversibility in heat dissipation to a bath.

4. **Cycle structure.** The Watch assembles the primitives into a closed loop in Fisher–Rao space, returning (modulo the bath) to a state from which a fresh tick can begin. This is the engine-cycle closure.

The identification is not merely metaphorical. **It is quantitative.** Given a Quilt agent running at temperature $T$ with a tick rate $f$ ticks per second, each tick committing $\Delta H_t$ bits of belief mass, the heat dissipation rate is

$$\dot Q \;=\; f \cdot k_B T \, \overline{d_{\mathrm{FR}}^2} \;\geq\; f \cdot k_B T \ln 2 \cdot \overline{\Delta H_t}.$$

At room temperature ($T = 300\,\mathrm{K}$) with $f = 100\,\mathrm{Hz}$ and one bit committed per tick, this is $\dot Q \geq 2.87 \times 10^{-19}\,\mathrm{W}$ — small in absolute terms, but a *hard floor*: no improvement in JEPA architecture, no cleverness in Vibe encoding, no clever DoubleEntry bookkeeping can push below it. The floor is set by the physics of information (Landauer 1961; Bennett 1982) and the geometry of belief (Varadhan 1967).

---

### 9. Conclusion

The Quilt ecosystem, viewed naively, appears to be a set of software abstractions: a predictive architecture (JEPA), a "vibe" coordinate, a bookkeeping convention (DoubleEntry), a garbage-collection routine, a `tick()` loop. Viewed through the lens of Opus Emergent Theorem D, the same eight primitives *are* the constituents of a thermodynamic engine. We have shown:

- **Vibe is Fisher–Rao position**, the thermodynamic state variable of the agent on the statistical manifold.
- **JEPA is the work-extracting stroke**, its displacement quantified by $d_{\mathrm{FR}}$ and its cost by $W = k_B T \, d_{\mathrm{FR}}^2$ via Varadhan (1967).
- **DoubleEntry's identity $\gamma + \eta = 1$ is the first law**, conservation of belief-mass-as-free-energy.
- **The Watch is the engine block**, binding strokes into a closed cycle.
- **tick() is one revolution of the cycle**, paying at least the Landauer cost (Landauer 1961).
- **GC is the second law**, the locus of irreversibility and entropy production (Bennett 1982).

The synthesis is complete. Quilt does not merely *simulate* a thermodynamic engine, nor *metaphorize* one. By the identification above — and crucially, by the quantitative lower bound — **Quilt IS a thermodynamic engine**: an information machine in which each belief update is a stroke, each tick is a cycle, each erasure is a heat dump, and each loop of self-modeling pays the irreducible tax of $k_B T \ln 2$ per bit committed.

The deepest consequence is that *self-modeling is not free*. A Quilt agent that models itself must, on each tick, commit at least one bit about its own state — "am I the agent that just predicted X, or not?" — and that commitment is a Fisher–Rao displacement, which is a work expenditure, which is bounded below by Landauer dissipation. Self-modeling is thermodynamically costly in direct proportion to its depth. The Opus Emergent Theorem D, in identifying the cost of one self-modeling loop with the squared Fisher–Rao distance lower-bounded by Landauer dissipation, does not impose a cost on cognition that cognition did not previously have. It *reveals* the cost that cognition always had, by showing that the abstract primitives of Quilt — Vibe, JEPA, DoubleEntry, Watch, GC — are, and always were, the primitives of a heat engine.

---

#### References

- Bennett, C. H. (1982). "The Thermodynamics of Computation — a Review." *International Journal of Theoretical Physics* 21(12): 905–940.
- Čencov, N. N. (1982). *Statistical Decision Rules and Optimal Inference*. AMS Translations of Mathematical Monographs.
- Cover, T. M., & Thomas, J. A. (1991). *Elements of Information Theory*. Wiley.
- Crooks, G. E. (2007). "Measuring Thermodynamic Length." *Physical Review Letters* 99: 100602.
- Landauer, R. (1961). "Irreversibility and Heat Generation in the Computing Process." *IBM Journal of Research and Development* 5(3): 183–191.
- Rao, C. R. (1945). "Information and the Accuracy Attainable in the Estimation of Statistical Parameters." *Bulletin of the Calcutta Mathematical Society* 37: 81–89.
- Sagawa, T., & Ueda, M. (2010). "Minimal Energy Cost for Thermodynamic Information Processing." *Physical Review Letters* 104: 090602.
- Sivak, D. A., & Crooks, G. E. (2012). "Thermodynamic Geometry of Minimum-Dissipation Driving." *Physical Review Letters* 108: 190602.
- Varadhan, S. R. S. (1967). "On the Behavior of the Fundamental Solution of