"""
hermes_quilt_bridge.py — Perception to Quilt bridge.

From Hermes (the perception layer of SuperInstance) to Quilt (the
reactive cellular runtime). Hermes produces raw telemetry (sonar,
GPS, acoustic, environmental). Quilt turns that telemetry into
reactive, context-aware knowledge.

This module provides three functions:
- push_telemetry(cell_id, payload)
- read_value(cell_id)
- subscribe_alert(cell_id, callback)

It can run against:
- A local Quilt engine (when running in the same process)
- A remote Quilt engine over HTTP (when running separately)
- A remote Quilt engine over the cell-ledger wire contract (Cloudflare D1)

The cell kinds that Hermes uses most:
- sensor: a push-based stream of values
- formula: derived from sensors
- listener: fires when a condition is met
- ai: an LLM call that interprets the formula's result
"""

import json
import time
import os
from typing import Any, Callable, Dict, List, Optional, Set
from urllib.parse import urljoin

try:
    import requests  # for remote engines
except ImportError:
    requests = None


class HermesBridge:
    """The bridge from Hermes perception to Quilt cells."""
    
    def __init__(self, engine_url: Optional[str] = None, local_engine=None):
        """
        Args:
            engine_url: HTTP URL of a remote Quilt engine (e.g., on Cloudflare)
            local_engine: A local QuiltEngine instance (for in-process)
        """
        if engine_url is None and local_engine is None:
            raise ValueError("Either engine_url or local_engine must be provided")
        self.engine_url = engine_url
        self.local_engine = local_engine
        self.subscribers: Dict[str, List[Callable]] = {}
        self.telemetry_log: List[Dict] = []
        self.alert_log: List[Dict] = []
        self.connected = True
        # The 9 elephant dials we can read from telemetry
        self.elephant_dials = {
            "mood": 0.5,
            "volume": 0.3,
            "earnestness": 0.7,
            "cynicism": 0.2,
            "joke_landing": 0.4,
            "panic": 0.1,
            "presence": 0.8,
            "model_vs_code": 0.5,
            "vision": 0.6,
        }
    
    def push_telemetry(self, cell_id: str, payload: Dict[str, Any]) -> Dict:
        """
        Push raw telemetry (e.g., a sonar ping) to a Quilt cell.
        
        The cell kind should be 'sensor' or 'value'. The engine will
        recompute any dependent formula cells and fire any listeners
        whose conditions are now met.
        """
        envelope = {
            "cell": cell_id,
            "payload": payload,
            "timestamp": time.time(),
            "source": "hermes",
        }
        self.telemetry_log.append(envelope)
        if self.local_engine is not None:
            return self.local_engine.push(cell_id, payload)
        elif self.engine_url and requests is not None:
            resp = requests.post(
                urljoin(self.engine_url, f"/cells/{cell_id}/push"),
                json=payload,
                headers={"X-Source": "hermes"},
            )
            return resp.json()
        return envelope
    
    def read_value(self, cell_id: str) -> Optional[Dict]:
        """
        Read a high-level value computed by a formula cell.
        
        Returns the cell's data if it's ready, None otherwise.
        """
        if self.local_engine is not None:
            cell = self.local_engine.get(cell_id)
            if cell is None:
                return None
            if isinstance(cell, dict):
                return cell.get("data") if cell.get("status") == "ready" else None
            return cell
        elif self.engine_url and requests is not None:
            resp = requests.get(urljoin(self.engine_url, f"/cells/{cell_id}"))
            if resp.status_code == 200:
                d = resp.json()
                return d.get("data") if d.get("status") == "ready" else None
        return None
    
    def subscribe_alert(self, cell_id: str, callback: Callable[[Any], None]) -> Callable:
        """
        Subscribe to a listener cell. The callback fires whenever
        the listener's condition is met.
        
        Returns a function that, when called, unsubscribes.
        """
        if cell_id not in self.subscribers:
            self.subscribers[cell_id] = []
        self.subscribers[cell_id].append(callback)
        
        def unsubscribe():
            if cell_id in self.subscribers:
                self.subscribers[cell_id].remove(callback)
                if not self.subscribers[cell_id]:
                    del self.subscribers[cell_id]
        return unsubscribe
    
    def fire_alert(self, cell_id: str, value: Any):
        """Called by the engine when a listener fires. Internal."""
        envelope = {
            "cell": cell_id,
            "value": value,
            "timestamp": time.time(),
        }
        self.alert_log.append(envelope)
        for cb in self.subscribers.get(cell_id, []):
            try:
                cb(value)
            except Exception as e:
                pass
    
    def read_dial(self, dial: str) -> float:
        """Read one of the 9 elephant dials (a sensory inverse of the 8 primitives)."""
        return self.elephant_dials.get(dial, 0.5)
    
    def set_dial(self, dial: str, value: float):
        """Set one of the 9 elephant dials (sensory input from perception)."""
        if dial in self.elephant_dials:
            self.elephant_dials[dial] = max(0.0, min(1.0, value))
    
    def status(self) -> Dict:
        return {
            "source": "hermes",
            "connected": self.connected,
            "engine_url": self.engine_url,
            "has_local_engine": self.local_engine is not None,
            "telemetry_count": len(self.telemetry_log),
            "alert_count": len(self.alert_log),
            "active_subscriptions": sum(len(v) for v in self.subscribers.values()),
            "elephant_dials": dict(self.elephant_dials),
        }


# ==================== SPECIFIC PERCEPTION STREAM ADAPTERS ====================

class SonarStream:
    """Adapter for sonar pings. Pushes each ping to a Quilt sensor cell."""
    def __init__(self, bridge: HermesBridge, cell_id: str = "sonar.ping"):
        self.bridge = bridge
        self.cell_id = cell_id
        self.history: List[Dict] = []
    
    def ping(self, depth: float, bearing: float, intensity: float, **extra):
        payload = {
            "depth": depth,
            "bearing": bearing,
            "intensity": intensity,
            **extra,
        }
        self.history.append(payload)
        return self.bridge.push_telemetry(self.cell_id, payload)


class GpsStream:
    """Adapter for GPS coordinates. Pushes each fix to a Quilt sensor cell."""
    def __init__(self, bridge: HermesBridge, cell_id: str = "gps.fix"):
        self.bridge = bridge
        self.cell_id = cell_id
    
    def fix(self, lat: float, lon: float, speed: float = 0.0, heading: float = 0.0):
        return self.bridge.push_telemetry(self.cell_id, {
            "lat": lat, "lon": lon, "speed": speed, "heading": heading,
        })


class AcousticStream:
    """Adapter for the acoustic scene. Pushes a scene summary."""
    def __init__(self, bridge: HermesBridge, cell_id: str = "acoustic.scene"):
        self.bridge = bridge
        self.cell_id = cell_id
    
    def scene(self, kind: str, confidence: float, **features):
        return self.bridge.push_telemetry(self.cell_id, {
            "kind": kind,
            "confidence": confidence,
            **features,
        })


# ==================== DEMO ====================

def demo():
    """Demonstrate Hermes pushing telemetry to a Quilt cell."""
    print("=" * 60)
    print("HERMES-QUILT BRIDGE DEMO")
    print("=" * 60)
    
    # Use the local Quilt kernel (from quilt-kernel.py)
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    try:
        from quilt_kernel import Kernel
    except ImportError:
        print("Install quilt-kernel.py for full demo. Using standalone demo.")
        return standalone_demo()
    
    # Create a kernel
    kernel = Kernel(cell_id="hermes_perception", kind="elephant")
    
    # Create the bridge
    bridge = HermesBridge(local_engine=kernel)
    
    # Create adapters for the 3 perception streams
    sonar = SonarStream(bridge)
    gps = GpsStream(bridge)
    acoustic = AcousticStream(bridge)
    
    # Subscribe to alerts
    alert_count = [0]
    def on_alert(value):
        alert_count[0] += 1
        print(f"  ALERT fired: {value}")
    bridge.subscribe_alert("hermes.alert", on_alert)
    
    # Push some telemetry
    print("\n[1] Sonar pings (depth, bearing, intensity):")
    sonar.ping(depth=12.5, bearing=45.0, intensity=0.3)
    sonar.ping(depth=15.2, bearing=42.0, intensity=0.5)
    sonar.ping(depth=8.7, bearing=180.0, intensity=0.9)  # suspicious
    
    print("\n[2] GPS fixes:")
    gps.fix(lat=42.3601, lon=-71.0589, speed=12.0, heading=90.0)
    gps.fix(lat=42.3602, lon=-71.0588, speed=11.5, heading=92.0)
    
    print("\n[3] Acoustic scenes:")
    acoustic.scene(kind="halibut", confidence=0.85, distance=8.0)
    acoustic.scene(kind="vessel", confidence=0.6, distance=200.0)
    
    # Read dials
    print("\n[4] Elephant dials (sensory inverses of 8 primitives):")
    for dial, value in bridge.elephant_dials.items():
        print(f"  {dial:18} = {value:.2f}")
    
    # Read computed values
    print("\n[5] Computed values from the kernel:")
    print(f"  surprise: {kernel.z_out.get('surprise'):.4f}")
    print(f"  vibe_position: {kernel.z_out.get('vibe_position'):.4f}")
    
    # Status
    print("\n[6] Bridge status:")
    print(json.dumps(bridge.status(), indent=2))
    
    print(f"\n[7] Telemetry pushed: {len(bridge.telemetry_log)}")
    print(f"    Alerts fired: {alert_count[0]}")
    print(f"    Kernel ticks: {kernel.tick_count}")


def standalone_demo():
    """Demo without the local kernel."""
    print("=" * 60)
    print("HERMES-QUILT BRIDGE DEMO (standalone, no kernel)")
    print("=" * 60)
    bridge = HermesBridge(engine_url="https://example.com/quilt")
    sonar = SonarStream(bridge)
    sonar.ping(depth=12.5, bearing=45.0, intensity=0.3)
    print(json.dumps(bridge.status(), indent=2))


if __name__ == "__main__":
    demo()
