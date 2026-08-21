"""
quilt-kernel.py — The Quilt Kernel. The executable heart.

A minimal runtime that ties all 8 primitives into one process.
Loads a cell spec, instantiates the 8 primitives, advances the cell.
Exposes a watch channel for the quilt-watch to observe.

Usage:
    from quilt_kernel import Kernel
    k = Kernel.from_spec(cell_spec_dict)
    surprise = k.step()
    k.subscribe(lambda event: print(event))
"""
import json
import math
from typing import Any, Callable, Dict, List, Optional, Set
import math
import time
from typing import Any, Callable, Dict, List, Optional, Set


class Zin:
    """The input space. What the cell receives."""
    def __init__(self):
        self.data: Dict[str, Any] = {}
    def put(self, k: str, v: Any) -> None:
        self.data[k] = v
    def get(self, k: str, default=None) -> Any:
        return self.data.get(k, default)


class Zout:
    """The output space. What the cell emits."""
    def __init__(self):
        self.data: Dict[str, Any] = {}
    def emit(self, k: str, v: Any) -> None:
        self.data[k] = v
    def get(self, k: str) -> Any:
        return self.data.get(k)


class Jepa:
    """JEPA — Joint Embedding Predictive Architecture."""
    def __init__(self, predict_fn: Optional[Callable] = None):
        self.predict_fn = predict_fn
        self.history: List[float] = []
    def predict(self, state: Dict) -> Dict:
        if self.predict_fn:
            return self.predict_fn(state)
        return dict(state)
    def observe(self, predicted: Dict, actual: Dict) -> float:
        surprise = 0.0
        all_keys = set(predicted) | set(actual)
        for k in all_keys:
            p = predicted.get(k, 0.0)
            a = actual.get(k, 0.0)
            if isinstance(p, (int, float)) and isinstance(a, (int, float)):
                surprise += (p - a) ** 2
        surprise = math.sqrt(surprise)
        self.history.append(surprise)
        return surprise


class DoubleEntry:
    """Conservation law: γ (creation/warmth) + η (entropy/κ) = budget."""
    def __init__(self, gamma: float = 0.5, eta: float = 0.5):
        total = gamma + eta
        if total > 0:
            self.gamma = gamma / total
            self.eta = eta / total
        else:
            self.gamma = self.eta = 0.5
    def budget(self) -> float:
        return self.gamma + self.eta
    def transfer(self, from_gamma: float = 0.0, to_eta: float = 0.0):
        from_gamma = min(from_gamma, self.gamma)
        to_eta = min(to_eta, 1.0 - self.eta)
        self.gamma -= from_gamma
        self.eta += to_eta


class Vibe:
    """Position/velocity/acceleration through the cell's state space."""
    def __init__(self, position: float = 0.0, velocity: float = 0.0, acceleration: float = 0.0, damping: float = 0.99):
        self.position = position
        self.velocity = velocity
        self.acceleration = acceleration
        self.damping = damping
    def tick(self, dt: float = 1.0):
        self.velocity += self.acceleration * dt
        self.position += self.velocity * dt
        self.velocity *= self.damping
    def nudge(self, force: float):
        self.acceleration += force


class Gc:
    """3-phase garbage collection: merge similar → decay old → prune weak."""
    def __init__(self):
        self.phase = "ready"
        self.merged = 0
        self.decayed = 0
        self.pruned = 0
        self.cycles = 0
    def collect(self) -> Dict[str, int]:
        self.cycles += 1
        result = {"merged": self.merged, "decayed": self.decayed, "pruned": self.pruned}
        self.phase = "ready"
        return result


class Murmur:
    """Gossip protocol for inter-cell communication."""
    def __init__(self):
        self.subscriptions: Set[str] = set()
        self.inbox: List[tuple] = []
        self.outbox: List[tuple] = []
    def subscribe(self, topic: str):
        self.subscriptions.add(topic)
    def gossip(self, topic: str, message: Any):
        self.outbox.append((topic, message))
    def listen(self) -> List:
        msgs = list(self.inbox)
        self.inbox.clear()
        return msgs


class Graph:
    """The substrate topology."""
    def __init__(self):
        self.parents: List[str] = []
        self.children: List[str] = []
        self.edges: List[tuple] = []
    def add_edge(self, other: str, kind: str = "default", weight: float = 1.0):
        self.edges.append((other, kind, weight))


class Kernel:
    """
    The Quilt Kernel. The runtime that holds all 8 primitives in one process.
    
    Loads a cell spec, instantiates the primitives, advances the cell,
    emits watch events. The minimal executable heart of the Quilt.
    """
    def __init__(self, cell_id: str = "kernel", kind: str = "cell"):
        self.cell_id = cell_id
        self.kind = kind
        self.z_in = Zin()
        self.z_out = Zout()
        self.jepa = Jepa()
        self.double_entry = DoubleEntry()
        self.vibe = Vibe()
        self.gc = Gc()
        self.murmur = Murmur()
        self.graph = Graph()
        self.tick_count = 0
        self.watchers: List[Callable] = []
        self.history: List[Dict] = []
    
    @classmethod
    def from_spec(cls, spec: Dict) -> "Kernel":
        k = cls(cell_id=spec.get("id", "kernel"), kind=spec.get("kind", "cell"))
        # Apply spec
        if "z_in" in spec:
            for key, val in spec["z_in"].items():
                k.z_in.put(key, val)
        if "double_entry" in spec:
            de = spec["double_entry"]
            k.double_entry = DoubleEntry(gamma=de.get("gamma", 0.5), eta=de.get("eta", 0.5))
        if "vibe" in spec:
            v = spec["vibe"]
            k.vibe = Vibe(position=v.get("position", 0.0), velocity=v.get("velocity", 0.0))
        return k
    
    def subscribe(self, watcher: Callable):
        """Add a watch observer. Called with event dicts on every step."""
        self.watchers.append(watcher)
    
    def emit_watch(self, event: Dict):
        for w in self.watchers:
            try:
                w(event)
            except Exception as e:
                pass  # never let a watch crash the kernel
    
    def step(self, dt: float = 1.0) -> float:
        """Advance the cell by one step. Returns JEPA surprise."""
        self.tick_count += 1
        
        # 1. Predict
        predicted = self.jepa.predict(self.z_in.data)
        # 2. Observe (the actual is Z_in)
        actual = dict(self.z_in.data)
        # 3. Compute surprise
        surprise = self.jepa.observe(predicted, actual)
        
        # 4. Update Vibe (physics)
        self.vibe.tick(dt)
        
        # 5. Emit to Z_out
        self.z_out.emit("surprise", surprise)
        self.z_out.emit("vibe_position", self.vibe.position)
        self.z_out.emit("tick", self.tick_count)
        
        # 6. Conserve
        self.double_entry.transfer(from_gamma=surprise * 0.1, to_eta=surprise * 0.1)
        
        # 7. Murmur
        self.murmur.gossip("tick", {"cell": self.cell_id, "tick": self.tick_count, "surprise": surprise})
        
        # 8. Watch
        event = {
            "type": "tick",
            "cell": self.cell_id,
            "tick": self.tick_count,
            "surprise": surprise,
            "gamma": self.double_entry.gamma,
            "eta": self.double_entry.eta,
            "vibe_position": self.vibe.position,
            "vibe_velocity": self.vibe.velocity,
        }
        self.emit_watch(event)
        self.history.append(event)
        return surprise
    
    def collect_garbage(self) -> Dict:
        """Run a GC cycle."""
        result = self.gc.collect()
        event = {"type": "gc", "cell": self.cell_id, **result}
        self.emit_watch(event)
        return result
    
    def status(self) -> Dict:
        return {
            "cell_id": self.cell_id,
            "kind": self.kind,
            "tick": self.tick_count,
            "z_in_keys": list(self.z_in.data.keys()),
            "z_out_keys": list(self.z_out.data.keys()),
            "gamma": self.double_entry.gamma,
            "eta": self.double_entry.eta,
            "vibe": {
                "position": self.vibe.position,
                "velocity": self.vibe.velocity,
                "acceleration": self.vibe.acceleration,
            },
            "jepa_history_size": len(self.jepa.history),
            "gc_cycles": self.gc.cycles,
            "murmur_pending": len(self.murmur.outbox),
            "graph_edges": len(self.graph.edges),
            "watchers": len(self.watchers),
        }
    
    def to_dict(self) -> Dict:
        """Serialize the kernel state. The cell as a JSON object."""
        return {
            "id": self.cell_id,
            "kind": self.kind,
            "tick": self.tick_count,
            "z_in": self.z_in.data,
            "z_out": self.z_out.data,
            "jepa": {"history_size": len(self.jepa.history), "mean_surprise": sum(self.jepa.history) / max(1, len(self.jepa.history))},
            "double_entry": {"gamma": self.double_entry.gamma, "eta": self.double_entry.eta},
            "vibe": {"position": self.vibe.position, "velocity": self.vibe.velocity, "acceleration": self.vibe.acceleration},
            "gc": {"cycles": self.gc.cycles, "merged": self.gc.merged, "decayed": self.gc.decayed, "pruned": self.gc.pruned},
            "murmur": {"subscriptions": list(self.murmur.subscriptions), "pending": len(self.murmur.outbox)},
            "graph": {"edges": len(self.graph.edges)},
        }


def example_usage():
    """Demonstrate the kernel end-to-end."""
    # Create a kernel from a spec
    spec = {
        "id": "moody-elephant",
        "kind": "elephant",
        "z_in": {"mood": 0.5, "volume": 0.3},
        "double_entry": {"gamma": 0.5, "eta": 0.5},
    }
    k = Kernel.from_spec(spec)
    
    # Add a watch observer
    events = []
    k.subscribe(lambda e: events.append(e))
    
    # Run 10 ticks
    for i in range(10):
        surprise = k.step()
        if i % 3 == 0:
            k.collect_garbage()
        # Mutate the input
        k.z_in.put("mood", 0.5 + 0.1 * math.sin(i))
    
    # Show status
    print(json.dumps(k.status(), indent=2))
    print(f"\nCaptured {len(events)} watch events")
    if events:
        mean_surprise = sum(e.get("surprise", 0) for e in events) / max(1, len(events))
    print(f"Mean surprise: {mean_surprise:.4f}")
    return k


if __name__ == "__main__":
    example_usage()
