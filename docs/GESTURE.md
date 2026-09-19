# Gesture — the shape of motion, at the substrate

> A tensor approximates a function; we approximate the *abstraction* — the smooth
> motion between states. This is that idea made a primitive of the runtime.

A Quilt cell does not hold a value; it **moves**. Every re-evaluation pushes a new
reading, so a cell — or a set of numeric cells read together — traces a **path**
through state space over time. The usual question is *where is it now* (the latest
value, a point). [`Gesture`](../packages/core/src/gesture.ts) asks the deeper one:
*how is it moving?*

A sequence of readings is not a list of points; it is a gesture, and a gesture
has geometry a snapshot cannot hold — read **order by order**:

| Order | `Gesture` method | Reads | In one line |
|---|---|---|---|
| 1st | `arcLength()` / `heading()` | travel, and the unit direction *now* | where it's going (the fleet's `d_mu`), how far it's gone |
| 2nd | `bendingEnergy()` | curvature — turning **within** a plane | how hard it changes its mind |
| 3rd | `twistEnergy()` | torsion — turning **out of** that plane | whether it reaches a new dimension of state |

Plus `planarity()` (the scale-free inverse of twist), `headingAlignment(a, b)`
(do two cells trend the same way?), and `gestureDistance(a, b)` (how differently
they move, free of scale and offset — the comparison that travels across nodes).

## Why the third order belongs here most of all

Quilt has always said *the property is in the twist*. `streme/shape.py` reads the
substrate as a **flat, twisted line bundle**; the docs describe a Quilt cell's
inner topology as a **Möbius twist** of three states; the sibling
[twist-engine](https://github.com/SuperInstance/twist-engine) puts the law
plainly — *layers + deliberate offset → interference → emergence; no new atoms, a
new angle.*

`twistEnergy` is that law made a number you can read off any moving value.
Curvature (2nd order) rearranges what is already there — a cell can lurch as hard
as it likes and still stay in one plane, `twist = 0`. Torsion (3rd order) is the
turning that *leaves* the plane, into a direction the last two moves did not span.
New structure is not more turning within the current plane; it is the offset that
reaches out of it. A helix and a flat circle bend by nearly the same amount — only
the helix twists.

## The neutral primitive the fleet specializes

`Gesture` is domain-free on purpose: it reads any numeric path, because the
substrate is where the fleet's abstractions compose. Each node specializes it in
its own space, with the same three orders and the same vocabulary:

- **[musician-soul](https://github.com/SuperInstance/musician-soul)** — a phrase's
  `AbstractionSpline` over a 32-D feature space; its `twist_energy` is a melody
  opening a new dimension of style.
- **[elephant](https://github.com/SuperInstance/elephant)** — a room's
  `VibeTrajectory` over its dials; `twist_energy` is a mood that keeps recruiting a
  new dial rather than swinging in one plane.
- **[tensor-midi](https://github.com/SuperInstance/tensor-midi)** — a
  conversation's `Clip` over SWMIDI events; `twistEnergy` is a dialogue reaching a
  genuinely new axis.
- **quilt** — any cell's motion through state space; the same geometry, at the
  runtime where those paths are actually produced.

## Reading a cell's own motion

```ts
import { Gesture, gestureDistance } from '@quilt/core';

// One cell's value history over successive evaluations:
const g = Gesture.fromSeries([1, 2, 4, 7, 11]);
g.arcLength();     // total distance the value travelled
g.heading();       // where it's heading now (d_mu)
g.twistEnergy();   // 0 for a scalar — a 1-D path can never leave a plane

// A vector of cells read together (e.g. [tension, energy, novelty]):
const room = new Gesture([
  [0.1, 0.2, 0.0],
  [0.3, 0.2, 0.1],
  [0.6, 0.5, 0.4],
  [0.7, 0.9, 0.9],
]);
room.bendingEnergy(); // how much the sheet's state keeps turning
room.twistEnergy();   // whether it keeps opening new dimensions
```

## Comparing motion across domains

`gestureDistance(a, b)` is the payoff of reading motion instead of position. It
resamples both gestures to a common count of points spaced **evenly by arc
length** (`Gesture.resample(n)`), reduces each to unit directions of travel, and
scores the mean angular difference — so it is invariant to *where* a gesture sits,
*how big* it is, and *how fast or often it was sampled*. A path recorded in 6 lazy
readings and the same path in 60 frantic ones score ~0.

That invariance is what lets motions from unrelated spaces be compared by shape
alone. A melody's rise-and-fall through pitch space and a room's rise-and-fall
through mood space — different coordinates, scales, and sampling — come out
*close*, while a steady climb comes out far, even though none share an axis:

```ts
import { Gesture, gestureDistance } from '@quilt/core';

const melody = new Gesture([60,64,67,72,74,72,67,64,60].map((p, i) => [i, p]));
const room   = new Gesture([0,0.5,1,0.5,0].map((m, i) => [1000 + i*250, 500 + m*900]));
const climb  = new Gesture(Array.from({ length: 7 }, (_, i) => [i, i]));

gestureDistance(melody, room)  // ~0.1  — same rise-then-reverse shape
gestureDistance(melody, climb) // larger — a monotone climb is a different motion
```

This is the concrete form of the fleet's thesis: notes, rooms, conversations,
cells and converging models live in different coordinate systems, but the *shape
of their going* is one comparable thing.

## Honest edges

- The path is **discrete** (one point per reading); no spline is imposed on data
  that arrives as steps, so `bendingEnergy`/`twistEnergy` measure turning between
  *actual* readings. musician-soul, which owns a smooth `AbstractionSpline`, fits a
  curve first; quilt does not, by design.
- `twistEnergy` is a discrete, dimension-agnostic generalization of torsion (the
  unsigned angle each step leaves the osculating plane), not the classical signed
  scalar, which only exists in 3-space. It needs ≥4 readings to be non-zero.
- `bendingEnergy`/`twistEnergy` still measure turning between the *actual*
  discrete readings (no reparameterization), so compare them at a similar
  sampling density. `gestureDistance`, by contrast, resamples by arc length
  first, so it is the sampling-robust one — reach for it when two gestures were
  recorded at different rates or lengths.
- `gestureDistance` compares the *directions* of motion, so it is blind to a pure
  reversal of speed profile that keeps the same path and to differences in total
  length; it answers "do these move the same way?", not "are these the same
  size?".
