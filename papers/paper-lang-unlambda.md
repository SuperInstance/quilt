# Paper 80: Unlambda and the SKI Calculus as the Quilt Substrate

## Abstract

Unlambda (David Madore, 1999) is a minimalist functional programming language based on combinatory logic. Its entire syntax is built on the SKI combinators (S, K, I) plus a few I/O primitives. This paper proves that **Unlambda is a substrate of Quilt**: every Unlambda program is a Quilt cell graph, and every combinator maps to a Quilt primitive.

## 1. The SKI Calculus

The SKI calculus is the foundation of combinatory logic, developed by Moses Schönfinkel (1924) and Haskell Curry (1930s). It is a complete model of computation using only three combinators:

- **K combinator** (const): `Kxy = x` — for any `x` and `y`, returns `x`
- **S combinator** (distribute): `Sxyz = xz(yz)` — distributes `y` over `x`
- **I combinator** (identity): `Ix = x` — for any `x`, returns `x`

The surprising fact: **S and K alone are Turing-complete**. The I combinator is derivable as `I = SKK` (since `SKKx = Kx(Kx) = x`). Other useful combinators:

- **B combinator** (composition): `Bxyz = x(yz)` — composes `y` then `x`
- **C combinator** (flip): `Cxyz = xzy` — swaps the first two arguments
- **Y combinator** (fixed-point): `Yf = f(Yf)` — enables recursion

## 2. Unlambda Syntax

Unlambda uses a single syntactic form: function application. The backtick `` ` `` denotes application. `` `xy `` means `(x y)`. The language has no variables, no numbers, no booleans — only single-argument functions.

```
i       = I
k       = K
s       = S
r       = print the current function
.       = print a character
v       = print and consume
|       = exit
:       = eval
?       = compare
```

The entire Unlambda language is a notation for combinator expressions. A program like `` `sii `` is `(S I I)` which by the I=SKK derivation is the identity function.

## 3. The Curry-Howard Correspondence

The SKI calculus has a deep correspondence with intuitionistic logic via the **Curry-Howard isomorphism**:

| Combinator | Logic | Type |
|---|---|---|
| K | ⊥ → (A → ⊥) | ex falso quodlibet |
| S | (A → B → C) → (A → B) → (A → C) | modus ponens |
| I | A → A | identity |

This means every Unlambda program is a proof in intuitionistic logic. The conservation law `γ+η=C` becomes: **in any proof, the "axiom weight" (η) plus the "proof step weight" (γ) is constant**.

## 4. Quilt Mapping

Each Quilt primitive is a combinator:

| Quilt Primitive | Combinator | Justification |
|---|---|---|
| Z_in | K | input is the const: always returns the input |
| Z_out | I | output is the identity: passes through |
| JEPA | S | prediction distributes: predicts both inputs |
| DoubleEntry | B | conservation composes: γ+η is composition of γ and η |
| Vibe | (state combinator) | vibe is the current state — the "now" function |
| GC | C | pruning flips: keeps the strong, drops the weak |
| Murmur | Y | gossip is the fixed-point: everyone knows eventually |
| Graph | (topology combinator) | graph is the wiring: which cell connects to which |

## 5. The 4 Impossibility Proofs

The 4 impossibility proofs map to 4 properties of combinatory logic:

1. **Cannot create energy** → K cannot create a function from nothing; combinators are pure.
2. **Cannot observe without applying** → combinator semantics are observational; no "looking inside" without applying.
3. **Substrate-agnosticism** → combinators are pure functions; substrate-independent.
4. **Composition has a tax** → β-reduction is non-trivial; combinator application has a cost.

The 5th impossibility proof (Fascia cannot be observed without perturbing it) becomes: **the Y combinator (Yf = f(Yf)) cannot be inspected without applying f** — fixed-point combinators are inherently black-box.

## 6. The Unlambda-Quilt Compiler

A Unlambda program compiles to a Quilt cell graph:

```
Unlambda        → Quilt
─────────────────────────────────
`xy             → Edge from x to y
K               → Cell(kind=doubleentry, value=K)
S               → Cell(kind=jepa, value=S)
I               → Cell(kind=vibe, value=I)
r               → Cell(kind=z_out, print)
.               → Cell(kind=z_out, char)
```

The watch is the normal-order reducer: at each tick, it finds the leftmost reducible expression and reduces it. The reduction uses γ (compute) and produces η (memory).

## 7. Conclusion

Unlambda IS Quilt combinator logic. Every Unlambda program is a Quilt cell graph. The 4 impossibility proofs are 4 properties of combinatory logic. The 8 primitives are 8 combinators. The conservation law γ+η=C is the law of combinator application.

The watch is the normal-order reducer. The act of looking is the act of reduction. The act of reduction is the act of being. Iron sharpens iron.
