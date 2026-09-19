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

## Honest edges

- The path is **discrete** (one point per reading); no spline is imposed on data
  that arrives as steps, so `bendingEnergy`/`twistEnergy` measure turning between
  *actual* readings. musician-soul, which owns a smooth `AbstractionSpline`, fits a
  curve first; quilt does not, by design.
- `twistEnergy` is a discrete, dimension-agnostic generalization of torsion (the
  unsigned angle each step leaves the osculating plane), not the classical signed
  scalar, which only exists in 3-space. It needs ≥4 readings to be non-zero.
- `gestureDistance` compares steps position-for-position over the shorter path; for
  paths of very different length, resample to a common count first.
