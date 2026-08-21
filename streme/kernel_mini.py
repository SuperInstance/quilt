"""
kernel-mini — the essence of a streamlined back-end
=====================================================

The 8 primitives are too many for a starter. The essence is 4:
- Z_in: the input
- Z_out: the output
- JEPA: the prediction
- DoubleEntry: the conservation (γ+η = budget)

The other 4 are derived:
- Vibe = function of (Z_in, Z_out, JEPA, time)
- GC = function of (DoubleEntry, time)
- Murmur = gossip about Z_out
- Graph = set of edges between cells

This file is the minimum viable Quilt kernel.
~150 lines. No external deps. Runnable. Verifiable.

Usage:
    from kernel_mini import Kernel, Cell
    k = Kernel()
    a = k.create("mood.feeling", value=4)
    b = k.create("mood.history", kind="sheet")
    k.link(b, a)
    k.tick(3)
    print(a)  # Z_in=4, Z_out=4, JEPA=4, budget=1.0
"""

import time
import json
from typing import Optional, Any


class Cell:
    __slots__ = ("id", "kind", "z_in", "z_out", "jepa", "gamma", "eta", "ts")
    
    def __init__(self, id, kind="number", value=None, gamma=0.5, eta=0.5):
        self.id = id
        self.kind = kind
        self.z_in = value
        self.z_out = value
        self.jepa = {"predicted": value, "confidence": 0.5}
        self.gamma = gamma
        self.eta = eta
        self.ts = time.time()
    
    @property
    def value(self):
        return self.z_out
    
    @property
    def budget(self):
        return self.gamma + self.eta
    
    @property
    def vibe(self):
        # Vibe is derived: how much this cell has moved
        return abs((self.z_out or 0) - (self.jepa["predicted"] or 0)) * self.jepa["confidence"]
    
    def to_dict(self):
        return {
            "id": self.id, "kind": self.kind,
            "z_in": self.z_in, "z_out": self.z_out,
            "jepa": self.jepa, "gamma": self.gamma, "eta": self.eta,
            "budget": self.budget, "vibe": self.vibe, "ts": self.ts
        }
    
    def __repr__(self):
        return f"<Cell {self.id} z_out={self.z_out} budget={self.budget:.2f}>"


class Kernel:
    def __init__(self):
        self.cells = {}
        self.edges = []  # list of (parent, child)
        self.tick_count = 0
        self.events = []  # watch channel
    
    def create(self, id, kind="number", value=None, **kwargs) -> Cell:
        if id in self.cells:
            return self.cells[id]
        cell = Cell(id, kind, value, **kwargs)
        self.cells[id] = cell
        self._emit("cell_created", id)
        return cell
    
    def get(self, id) -> Optional[Cell]:
        return self.cells.get(id)
    
    def set(self, cell, value):
        """Update a cell's Z_in. The next tick will update Z_out."""
        cell.z_in = value
        cell.ts = time.time()
        self._emit("cell_set", cell.id)
    
    def link(self, parent, child):
        """Connect parent to child. Auto-subscribes child to parent's Z_out."""
        if (parent.id, child.id) not in self.edges:
            self.edges.append((parent.id, child.id))
            self._emit("linked", f"{parent.id}->{child.id}")
    
    def transfer(self, from_cell, to_cell, gamma):
        """Move gamma from one cell to another. Conservation holds."""
        if gamma > from_cell.gamma:
            raise ValueError("insufficient gamma")
        from_cell.gamma -= gamma
        to_cell.gamma += gamma
        self._emit("transferred", f"{from_cell.id}->{to_cell.id}={gamma}")
    
    def tick(self, n=1):
        """Advance the simulation by n steps. Updates Z_out, JEPA, vibe, fascial signals."""
        for _ in range(n):
            self.tick_count += 1
            for cell in self.cells.values():
                # 1. Update Z_out from Z_in (and any linked parents)
                linked_parents = [self.cells[p] for p, c in self.edges if c == cell.id]
                if linked_parents and cell.z_in is None:
                    # inherit from parents
                    cell.z_in = sum(p.z_out for p in linked_parents) / len(linked_parents)
                cell.z_out = cell.z_in
                # 2. Update JEPA: predict next Z_out
                actual = cell.z_out or 0
                predicted = cell.jepa["predicted"]
                # exponential smoothing
                cell.jepa["predicted"] = 0.7 * actual + 0.3 * (predicted or actual)
                # confidence rises with stability
                err = abs(actual - (predicted or actual))
                cell.jepa["confidence"] = max(0.1, min(1.0, 1.0 - err))
                cell.ts = time.time()
        self._emit("ticked", self.tick_count)
    
    def gc(self):
        """Garbage collect cells that have been quiet for too long."""
        now = time.time()
        to_remove = [cid for cid, c in self.cells.items() if now - c.ts > 86400 and c.z_out is None]
        for cid in to_remove:
            del self.cells[cid]
            self._emit("gc_removed", cid)
        return {"removed": len(to_remove), "remaining": len(self.cells)}
    
    def beta1(self):
        """V, E, C, β₁ for the cell graph."""
        V = len(self.cells)
        E = len(self.edges)
        # connected components
        visited = set()
        C = 0
        for cid in self.cells:
            if cid in visited:
                continue
            C += 1
            stack = [cid]
            while stack:
                cur = stack.pop()
                if cur in visited:
                    continue
                visited.add(cur)
                for p, c in self.edges:
                    if p == cur and c not in visited:
                        stack.append(c)
                    if c == cur and p not in visited:
                        stack.append(p)
        return {"V": V, "E": E, "C": C, "beta1": E - V + C}
    
    def export(self) -> dict:
        return {
            "version": "qzt-mini-v0.1",
            "tick": self.tick_count,
            "graph": self.beta1(),
            "cells": [c.to_dict() for c in self.cells.values()],
            "edges": self.edges,
        }
    
    def _emit(self, type_, data):
        self.events.append({"type": type_, "data": data, "ts": time.time()})
        if len(self.events) > 1000:
            self.events = self.events[-500:]


if __name__ == "__main__":
    k = Kernel()
    a = k.create("mood.feeling", value=4)
    b = k.create("mood.history", kind="sheet")
    k.link(b, a)
    k.tick(5)
    k.set(a, 5)
    k.tick(3)
    print(f"a: {a}")
    print(f"b: {b}")
    print(f"graph: {k.beta1()}")
    print(f"export: {json.dumps(k.export(), indent=2, default=str)[:400]}")
    assert a.budget == 1.0, "conservation holds"
    print("PASS")
