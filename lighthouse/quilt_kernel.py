"""
Quilt Kernel — The Executable Heart
====================================

This is the canonical Quilt kernel. All 8 primitives in one process.

The 8 primitives: Z_in, Z_out, JEPA, DoubleEntry, Vibe, GC, Murmur, Graph
The 7 layers: Substrate, Formula, Watch, Room, Steward, Bridge, REPL
The 9 elephant dials: tick_rate, gc_threshold, max_cells, bridge_timeout,
                      watch_depth, formula_depth, room_capacity,
                      steward_patience, log_level

The Fascia (Spec 0001): JEPA + DoubleEntry running BETWEEN cells.

A cell is a system. A kernel runs a set of cells. The watch observes.
The room is a cell. The federation is a graph of rooms. The cell is the cell.

Author: The Watch
License: MIT
"""

import time
import json
import hashlib
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field, asdict


# =============================================================================
# THE 8 PRIMITIVES (per-cell)
# =============================================================================

@dataclass
class Cell:
    """A Quilt cell with the 8 primitives."""
    id: str
    kind: str = "number"
    value: Any = None
    z_in: Any = None
    z_out: Any = None
    jepa: Dict = field(default_factory=lambda: {"prediction": None, "confidence": 0.5})
    double_entry: Dict = field(default_factory=lambda: {"gamma": 0.5, "eta": 0.5})
    vibe: float = 0.0
    gc_phase: str = "ready"
    murmur_subs: List = field(default_factory=list)
    graph: Dict = field(default_factory=lambda: {"children": [], "parents": []})
    formula: Optional[str] = None
    room: Optional[str] = None
    steward: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    
    def conservation(self) -> float:
        """γ + η = budget. The DoubleEntry invariant."""
        return self.double_entry["gamma"] + self.double_entry["eta"]
    
    def to_ledger(self) -> Dict:
        """The cell as a ledger entry (the wire format)."""
        return {
            "cell_id": self.id,
            "kind": self.kind,
            "z_in": self.z_in,
            "z_out": self.z_out,
            "jepa": self.jepa,
            "double_entry": self.double_entry,
            "vibe": self.vibe,
            "gc_phase": self.gc_phase,
            "murmur_subs": self.murmur_subs,
            "graph": self.graph,
            "value": self.value,
            "budget": self.conservation(),
            "room": self.room,
            "steward": self.steward,
        }


# =============================================================================
# THE FASCIA LAYER (Spec 0001) — inter-cell connective tissue
# =============================================================================

class FasciaJEPA:
    """The inter-cell prediction fabric.
    
    Cells publish their JEPA predictions. Neighbors subscribe.
    The diff between subscribed and own = surprise = learning signal.
    
    This is the body's most mysterious system. It runs BETWEEN cells.
    """
    
    def __init__(self):
        self.subscriptions: Dict[str, Dict] = {}
        self.surprise_history: List[Dict] = []
    
    def publish(self, cell: Cell) -> Dict:
        return {
            "cell_id": cell.id,
            "predicted": self.jepa_value(cell),
            "confidence": cell.jepa.get("confidence", 0.5),
            "timestamp": cell.updated_at,
        }
    
    def jepa_value(self, cell: Cell) -> float:
        """The JEPA value (a calibrated-instrument reading, not a logical answer)."""
        return cell.jepa.get("prediction", cell.value) or 0
    
    def subscribe(self, subscriber_id: str, target_id: str, target_cell: Cell):
        """A cell subscribes to another cell's JEPA stream."""
        self.subscriptions[f"{subscriber_id}->{target_id}"] = self.publish(target_cell)
    
    def surprise(self, cell: Cell) -> float:
        """The surprise = the diff between my prediction and my neighbors'."""
        if not self.subscriptions:
            return 0.0
        my = self.jepa_value(cell)
        diffs = []
        for sig in self.subscriptions.values():
            if sig["cell_id"] != cell.id:
                diffs.append(abs(my - sig["predicted"]))
        return sum(diffs) / len(diffs) if diffs else 0.0
    
    def stats(self):
        return {
            "subscriptions": len(self.subscriptions),
            "surprise_count": len(self.surprise_history),
            "mean_surprise": sum(s["surprise"] for s in self.surprise_history) / len(self.surprise_history) if self.surprise_history else 0.0
        }
    
    def update(self, cell: Cell):
        """Called when the cell ticks."""
        s = self.surprise(cell)
        self.surprise_history.append({"cell_id": cell.id, "surprise": s, "ts": cell.updated_at})
        if len(self.surprise_history) > 1000:
            self.surprise_history = self.surprise_history[-500:]


class FasciaDoubleEntry:
    """The inter-cell conservation fabric.
    
    Cells trade gamma with neighbors. The total γ+η across a region is constant.
    This is the body's most pervasive system. It runs BETWEEN cells.
    """
    
    def __init__(self, region_ids: Optional[Set[str]] = None):
        self.region: Set[str] = set(region_ids or [])
        self.flows: List[Dict] = []
    
    def transfer(self, from_cell: Cell, to_cell: Cell, gamma: float):
        """A cell transfers some gamma to a neighbor in exchange for value."""
        if gamma <= 0:
            raise ValueError("gamma must be positive")
        if gamma > from_cell.double_entry["gamma"]:
            raise ValueError("Cannot transfer more gamma than the cell has")
        from_cell.double_entry["gamma"] -= gamma
        to_cell.double_entry["gamma"] += gamma
        self.flows.append({
            "from": from_cell.id, "to": to_cell.id,
            "gamma": gamma, "ts": time.time()
        })
    
    def total_budget(self, cells: Dict[str, Cell]) -> float:
        """Conservation: total budget in a region is constant."""
        return sum(
            cells[cid].double_entry["gamma"] + cells[cid].double_entry["eta"]
            for cid in self.region if cid in cells
        )
    
    def gradient(self, cells: Dict[str, Cell]) -> Dict[str, float]:
        """The gamma gradient — where to send gamma next."""
        return {cid: cells[cid].double_entry["gamma"] for cid in self.region if cid in cells}
    
    def stats(self, cells=None):
        cells = cells or {}
        return {
            "region_size": len(self.region),
            "flow_count": len(self.flows),
            "total_budget": self.total_budget(cells) if cells else 0
        }
    
    def gc_3phase(self, cells: Dict[str, Cell]):
        # Phase 1: prune weak subscriptions (handled by FasciaJEPA)
        # Phase 2: decay stale flows
        cutoff = time.time() - 3600
        before = len(self.flows)
        self.flows = [f for f in self.flows if f["ts"] > cutoff]
        # Phase 3: consolidate gradients (no-op for now)
        return {"before": before, "after": len(self.flows)}


# =============================================================================
# THE KERNEL — the watchable process
# =============================================================================

class QuiltKernel:
    """The Quilt kernel — runs cells, ticks, gc, watch, fascia."""
    
    def __init__(self):
        self.cells: Dict[str, Cell] = {}
        self.dials: Dict[str, float] = {
            "tick_rate": 1.0,
            "gc_threshold": 0.8,
            "max_cells": 10000,
            "bridge_timeout": 30.0,
            "watch_depth": 5,
            "formula_depth": 100,
            "room_capacity": 100,
            "steward_patience": 3,
            "log_level": 1,
        }
        self.fascia_jepa = FasciaJEPA()
        self.fascia_de = FasciaDoubleEntry()
        self.watch_events: List[Dict] = []
        self.history: List[Dict] = []
        self.tick_count: int = 0
    
    def create_cell(self, id: str, kind: str = "number", value: Any = None) -> Cell:
        cell = Cell(id=id, kind=kind, value=value)
        self.cells[id] = cell
        self.fascia_de.region.add(id)
        self._watch({"type": "cell_created", "cell_id": id})
        return cell
    
    def get(self, id: str) -> Optional[Cell]:
        return self.cells.get(id)
    
    @property
    def edges(self):
        """All edges in the cell graph as a list of (from, to) tuples."""
        result = []
        for c in self.cells.values():
            for child in c.graph["children"]:
                result.append((c.id, child))
        return result
    
    def set_value(self, cell: Cell, value: Any):
        cell.value = value
        cell.z_in = value
        cell.updated_at = time.time()
        self._watch({"type": "cell_updated", "cell_id": cell.id, "field": "value"})
    
    def set_room(self, cell: Cell, room: str):
        cell.room = room
        cell.updated_at = time.time()
    
    def add_edge(self, parent: Cell, child: Cell):
        if child.id not in parent.graph["children"]:
            parent.graph["children"].append(child.id)
        if parent.id not in child.graph["parents"]:
            child.graph["parents"].append(parent.id)
        # Auto-subscribe: parent subscribes to child via FasciaJEPA
        self.fascia_jepa.subscribe(parent.id, child.id, child)
        self._watch({"type": "edge_added", "from": parent.id, "to": child.id})
    
    def step(self, n: int = 1):
        for _ in range(n):
            self.tick_count += 1
            for cell in self.cells.values():
                # Update vibe based on conservation
                b = cell.conservation()
                cell.vibe = (cell.vibe + (b - 1.0) * 0.01) % 1.0
                # Update JEPA prediction
                cell.jepa["prediction"] = (cell.value or 0) + cell.vibe
                cell.jepa["confidence"] = min(1.0, 0.5 + cell.vibe)
                # Evaluate formula if present
                if cell.formula:
                    try:
                        cell.z_out = eval(cell.formula, {"__builtins__": {}}, {"v": cell.value or 0, "vibe": cell.vibe})
                    except Exception:
                        cell.z_out = cell.value
                else:
                    cell.z_out = cell.value
                cell.updated_at = time.time()
                # Update fascia
                self.fascia_jepa.update(cell)
            self._watch({"type": "tick", "n": self.tick_count})
    
    def gc(self):
        """3-phase garbage collection."""
        before = len(self.cells)
        # Phase 1: merge similar
        # Phase 2: decay old (cells not updated in 24h with null value)
        cutoff = time.time() - 86400
        to_remove = [cid for cid, c in self.cells.items() if c.updated_at < cutoff and c.value is None]
        for cid in to_remove:
            del self.cells[cid]
        # Phase 3: prune weak (Fascia)
        self.fascia_de.gc_3phase(self.cells)
        self._watch({"type": "gc", "before": before, "after": len(self.cells)})
        return {"before": before, "after": len(self.cells), "pruned": before - len(self.cells)}
    
    def beta1(self):
        """Compute V, E, C, β₁ for the cell graph."""
        V = len(self.cells)
        E = sum(len(c.graph["children"]) for c in self.cells.values())
        # Count connected components
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
                c = self.cells[cur]
                for n in c.graph["children"] + c.graph["parents"]:
                    if n in self.cells and n not in visited:
                        stack.append(n)
        return {"V": V, "E": E, "C": C, "beta1": E - V + C}
    
    def _watch(self, event: Dict):
        self.watch_events.append({**event, "ts": time.time()})
        if len(self.watch_events) > 1000:
            self.watch_events = self.watch_events[-500:]
    
    def to_ledger(self) -> List[Dict]:
        return [c.to_ledger() for c in self.cells.values()]


# =============================================================================
# DEMO
# =============================================================================

if __name__ == "__main__":
    k = QuiltKernel()
    
    # Create a mood-tracking instance (the first real Quilt instance)
    a = k.create_cell("mood.feeling", "number", 4)
    b = k.create_cell("mood.history", "sheet")
    c = k.create_cell("mood.guide", "formula")
    
    k.set_room(a, "mood")
    k.set_room(b, "mood")
    k.set_room(c, "mood")
    
    k.add_edge(b, a)  # history subscribes to feeling
    k.add_edge(c, b)  # guide subscribes to history
    
    c.formula = "v + 0.1"  # guide is a simple formula
    
    k.step(5)
    
    print(f"Cells: {len(k.cells)}")
    print(f"Graph: {k.beta1()}")
    print(f"Fascia subscriptions: {len(k.fascia_jepa.subscriptions)}")
    print(f"Fascia region: {k.fascia_de.region}")
    print(f"Total budget: {k.fascia_de.total_budget(k.cells):.3f}")
    print(f"Gradient: {k.fascia_de.gradient(k.cells)}")
    print(f"\nLedger:")
    for entry in k.to_ledger():
        print(f"  {entry['cell_id']:20} vibe={entry['vibe']:.3f} budget={entry['budget']:.3f}")
    
    # Test transfer
    a = k.cells["mood.feeling"]
    b = k.cells["mood.history"]
    k.fascia_de.transfer(a, b, 0.1)
    print(f"\nAfter transfer: total budget = {k.fascia_de.total_budget(k.cells):.3f}")
    print(f"Gradient: {k.fascia_de.gradient(k.cells)}")
    
    print("\nPASS: The kernel runs. The fascia runs. The watch watches.")
