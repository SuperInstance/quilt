/**
 * @file gesture.ts
 * @module @quilt/core
 *
 * =====================================================================
 *  GESTURE — the shape of motion through state space
 * =====================================================================
 *
 * A Quilt cell does not hold a value; it *moves*. Each re-evaluation
 * pushes a new reading, so a cell (or a set of numeric cells read
 * together) traces a **path** through state space over time. Usually we
 * look at where it is now — the latest value, a point. A tensor is a
 * function approximator, so a point is what it compares.
 *
 * This reads the motion itself. A sequence of readings is not a list of
 * points; it is a **gesture**, and a gesture has geometry a snapshot
 * cannot hold — read here **order by order**:
 *
 *   1st  `arcLength` / `heading`  — how far it has travelled, and the
 *        unit direction it is going *now* (a velocity: the fleet's `d_mu`).
 *   2nd  `bendingEnergy`          — curvature: how hard it turns *within*
 *        a plane (a still cell warming steadily has none; a cell that
 *        lurches between states has a lot).
 *   3rd  `twistEnergy`            — torsion: how much it turns *out of*
 *        that plane, into a fresh dimension of state space
 *        (`planarity` is the scale-free inverse).
 *
 * The third order is the fleet's oldest law made a number here at the
 * substrate: *the property is in the twist* (SuperInstance/twist-engine —
 * *layers + deliberate offset → interference → emergence; no new atoms, a
 * new angle*). New structure is not more turning within the current plane;
 * it is the turning that reaches out of it.
 *
 * This is the neutral primitive the fleet's other nodes each specialize:
 * musician-soul's `AbstractionSpline` (over notes), elephant's
 * `VibeTrajectory` (over a room's dials), and tensor-midi's `Clip` (over a
 * conversation). Here it is domain-free — any numeric path — because the
 * substrate is where those abstractions compose.
 *
 * Pure TypeScript, zero dependencies, and never throws on empty or
 * degenerate input.
 *
 * =====================================================================
 */

/** A point in state space (any fixed dimensionality). */
export type Point = number[];

function sub(a: Point, b: Point): Point {
  return a.map((x, i) => x - (b[i] ?? 0));
}
function norm(a: Point): number {
  return Math.sqrt(a.reduce((s, x) => s + x * x, 0));
}
function dot(a: Point, b: Point): number {
  return a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
}
function unit(a: Point): Point {
  const n = norm(a);
  return n > 1e-12 ? a.map((x) => x / n) : a.map(() => 0);
}
function cosine(a: Point, b: Point): number {
  const na = norm(a);
  const nb = norm(b);
  return na < 1e-12 || nb < 1e-12 ? 0 : dot(a, b) / (na * nb);
}

/**
 * The path a value (or vector of values) traces through state space over
 * successive readings — read as a gesture, not a point.
 */
export class Gesture {
  /** The ordered readings, oldest first. Defensively copied. */
  readonly points: Point[];

  /**
   * @param points ordered readings, oldest first. Scalars are accepted as
   *   1-D points via {@link Gesture.fromSeries}.
   */
  constructor(points: Point[] = []) {
    this.points = points.map((p) => [...p]);
  }

  /** Build a gesture from a scalar series (e.g. one cell's value history). */
  static fromSeries(series: number[]): Gesture {
    return new Gesture(series.map((v) => [v]));
  }

  get length(): number {
    return this.points.length;
  }

  /** The consecutive step vectors — the discrete velocity. */
  steps(): Point[] {
    const out: Point[] = [];
    for (let i = 1; i < this.points.length; i++) {
      out.push(sub(this.points[i], this.points[i - 1]));
    }
    return out;
  }

  /** Total distance travelled through state space. 0 for < 2 readings. */
  arcLength(): number {
    return this.steps().reduce((s, d) => s + norm(d), 0);
  }

  /** Magnitude of the latest step — how fast the value is moving now. */
  speed(): number {
    const s = this.steps();
    return s.length ? norm(s[s.length - 1]) : 0;
  }

  /**
   * Unit direction of the latest step — the gesture's **`d_mu`** (where the
   * value is heading now). Zero vector for < 2 readings or a still value.
   */
  heading(): Point {
    const s = this.steps();
    return s.length ? unit(s[s.length - 1]) : this.points[0]?.map(() => 0) ?? [];
  }

  /**
   * Curvature — total turning **within a plane**: summed `1 − cos` between
   * consecutive step directions. 0 for a straight drift at any speed; large
   * for a value that keeps lurching between states.
   */
  bendingEnergy(): number {
    const s = this.steps();
    let energy = 0;
    for (let i = 1; i < s.length; i++) {
      if (norm(s[i - 1]) > 1e-12 && norm(s[i]) > 1e-12) {
        energy += 1 - cosine(s[i - 1], s[i]);
      }
    }
    return energy;
  }

  /**
   * Torsion — total **twist**: the turning that leaves the osculating plane.
   * Per interior vertex the contribution is `sin θ`, where θ is the angle by
   * which the next step leaves the plane of the previous two, so each vertex
   * is in `[0, 1]` and a straight or planar path contributes 0. Needs ≥4
   * readings.
   *
   * Zero however hard a path bends, as long as it bends in one plane; positive
   * only when the motion opens a genuinely new dimension of state space — *the
   * property is in the twist*.
   */
  twistEnergy(): number {
    const s = this.steps();
    let energy = 0;
    for (let i = 2; i < s.length; i++) {
      const s1 = s[i - 2];
      const s2 = s[i - 1];
      const s3 = s[i];
      const n1 = norm(s1);
      if (n1 < 1e-12) continue;
      const e1 = s1.map((x) => x / n1);
      const d21 = dot(s2, e1);
      const perp = s2.map((x, k) => x - d21 * e1[k]); // s2 ⟂ e1
      const np = norm(perp);
      if (np < 1e-12) continue; // s1 ∥ s2: no plane to leave
      const e2 = perp.map((x) => x / np);
      const n3 = norm(s3);
      if (n3 < 1e-12) continue;
      const d3 = s3.map((x) => x / n3);
      const c1 = dot(d3, e1);
      const c2 = dot(d3, e2);
      const out = d3.map((x, k) => x - c1 * e1[k] - c2 * e2[k]);
      energy += Math.min(norm(out), 1);
    }
    return energy;
  }

  /**
   * How flat the gesture stays, in `[0, 1]`: 1 for a path whose whole motion
   * lives in one plane (all bending, no twist), falling toward 0 as more of
   * its turning leaves the plane. 1 for a path too short to twist. The
   * scale-free inverse of {@link Gesture.twistEnergy}.
   */
  planarity(): number {
    const vertices = Math.max(0, this.steps().length - 1);
    if (vertices === 0) return 1;
    return Math.min(1, Math.max(0, 1 - this.twistEnergy() / vertices));
  }
}

/**
 * Do two gestures **trend** the same way? The cosine of their `d_mu`
 * headings, in `[-1, 1]` (1 = heading the same way, −1 = opposite). 0 if
 * either is still or their state spaces differ in dimension.
 */
export function headingAlignment(a: Gesture, b: Gesture): number {
  const ha = a.heading();
  const hb = b.heading();
  if (ha.length !== hb.length) return 0;
  return cosine(ha, hb);
}

/**
 * How differently two gestures **move**, free of where they are and how big
 * they are: each is reduced to its unit step-directions and scored by mean
 * angular difference (`1 − cos`) over their overlapping steps. Invariant to
 * translation and uniform scale — the comparison that travels across nodes,
 * whose absolute coordinates differ but whose *shape of going* is comparable.
 * Range 0 (same motion) to 2 (opposed at every step); 0 to itself.
 */
export function gestureDistance(a: Gesture, b: Gesture): number {
  const sa = a.steps();
  const sb = b.steps();
  const n = Math.min(sa.length, sb.length);
  if (n === 0) return sa.length === sb.length ? 0 : 2;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const da = sa[i];
    const db = sb[i];
    if (norm(da) < 1e-12 || norm(db) < 1e-12) sum += 1;
    else sum += 1 - cosine(da, db);
  }
  return Math.min(2, Math.max(0, sum / n));
}
