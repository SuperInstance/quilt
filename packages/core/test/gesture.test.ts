/**
 * Tests for Gesture — the shape of a value's motion through state space,
 * read order by order (heading, bending/curvature, twist/torsion).
 */

import { describe, it, expect } from 'vitest';
import { Gesture, headingAlignment, gestureDistance } from '../src/index.js';

function circle(n: number, extraDim?: (a: number) => number[]): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 0.6;
    pts.push(extraDim ? [Math.cos(a), Math.sin(a), ...extraDim(a)] : [Math.cos(a), Math.sin(a)]);
  }
  return pts;
}

describe('Gesture — degenerate input is graceful', () => {
  it('empty and single-point gestures never throw and read as still', () => {
    const empty = new Gesture([]);
    expect(empty.length).toBe(0);
    expect(empty.arcLength()).toBe(0);
    expect(empty.bendingEnergy()).toBe(0);
    expect(empty.twistEnergy()).toBe(0);
    expect(empty.planarity()).toBe(1);
    expect(empty.speed()).toBe(0);

    const single = new Gesture([[0.2, 0.3]]);
    expect(single.arcLength()).toBe(0);
    expect(single.heading()).toEqual([0, 0]);
  });
});

describe('Gesture — first order (travel and heading)', () => {
  it('arcLength counts travel; a still value goes nowhere', () => {
    const traj = new Gesture([[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(Math.abs(traj.arcLength() - 3)).toBeLessThan(1e-9);
    expect(new Gesture([[0.5, 0.5], [0.5, 0.5]]).arcLength()).toBe(0);
  });

  it('heading is the unit direction of the last step', () => {
    const traj = new Gesture([[0, 0], [0, 0.5], [0, 2]]);
    const h = traj.heading();
    expect(Math.abs(Math.hypot(...h) - 1)).toBeLessThan(1e-9);
    expect(h[1]).toBeGreaterThan(0.99);
  });
});

describe('Gesture — second order (curvature)', () => {
  it('a straight drift barely bends; a zig-zag bends more', () => {
    const line = new Gesture([[0, 0], [1, 0], [2, 0], [3, 0]]);
    const zig = new Gesture([[0, 0], [1, 1], [2, 0], [3, 1]]);
    expect(line.bendingEnergy()).toBeLessThan(1e-9);
    expect(zig.bendingEnergy()).toBeGreaterThan(line.bendingEnergy());
  });
});

describe('Gesture — third order (twist / torsion)', () => {
  it('a planar curve does not twist; a helix does', () => {
    const planar = new Gesture(circle(8));
    const helix = new Gesture(circle(8, (a) => [0.5 * a]));
    expect(planar.twistEnergy()).toBeLessThan(1e-9);
    expect(helix.twistEnergy()).toBeGreaterThan(planar.twistEnergy());
    expect(Number.isFinite(helix.twistEnergy())).toBe(true);
  });

  it('planarity is bounded and high for a flat curve', () => {
    const planar = new Gesture(circle(8));
    expect(planar.planarity()).toBeGreaterThan(0.95);
    expect(planar.planarity()).toBeLessThanOrEqual(1);
    expect(new Gesture(circle(8, (a) => [0.5 * a])).planarity()).toBeLessThan(planar.planarity());
  });
});

describe('Gesture — comparison across gestures', () => {
  it('headingAlignment: parallel ≈ 1, opposite ≈ -1', () => {
    const up = new Gesture([[0, 0], [1, 1]]);
    const alsoUp = new Gesture([[5, 5], [6, 6]]);
    const down = new Gesture([[0, 0], [-1, -1]]);
    expect(headingAlignment(up, alsoUp)).toBeGreaterThan(0.99);
    expect(headingAlignment(up, down)).toBeLessThan(-0.99);
  });

  it('gestureDistance is zero to itself, symmetric, and ignores scale/offset', () => {
    const base = new Gesture(circle(6));
    // Same motion, scaled up and translated: directions of travel identical.
    const moved = new Gesture(circle(6).map(([x, y]) => [3 * x + 5, 3 * y + 5]));
    expect(gestureDistance(base, base)).toBeLessThan(1e-9);
    expect(gestureDistance(base, moved)).toBeLessThan(1e-6);
    const a = new Gesture([[0, 0], [1, 0], [1, 1]]);
    const b = new Gesture([[0, 0], [0, 1], [-1, 1]]);
    expect(Math.abs(gestureDistance(a, b) - gestureDistance(b, a))).toBeLessThan(1e-9);
    expect(gestureDistance(a, b)).toBeGreaterThan(0);
  });
});

describe('Gesture — from a cell value series', () => {
  it('reads a scalar history as a 1-D path', () => {
    const g = Gesture.fromSeries([1, 2, 4, 7]);
    expect(g.length).toBe(4);
    expect(g.arcLength()).toBe(6); // 1 + 2 + 3
    expect(g.twistEnergy()).toBe(0); // 1-D can never leave a plane
  });
});
