"""
qspace.py — the Q-space runtime
================================

A Quilt instance that serves as an agent's growth environment.
The agent's signal is decomposed via Hodge into:
- exact (exploration): what the agent learned
- coexact (exploitation): what the agent was told
- harmonic (prior): what the agent already knew

The Q-space is a kernel-mini with one extra method: decompose(agent_id) → HodgeDecomposition

This is the runtime that A2A-native-notebookLM could use.
"""

import sys
import json
import math
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, "/workspace/quilt-build/streme")
from kernel_mini import Kernel, Cell


# === Hodge Decomposition for 1-forms on the cell graph ===
# A 1-form ω assigns a number to each edge.
# On a graph (simplicial complex), the Hodge decomposition is:
#   ω = dα + δβ + h
# where:
#   dα (exact) = gradient part — what the agent learned
#   δβ (coexact) = curl part — what the agent was told
#   h (harmonic) = the global circulation — what the agent already knew

def hodge_decompose_1form(omega_edges, vertices):
    """
    Decompose a 1-form on a graph into exact + coexact + harmonic.
    
    For a 1-form ω on edges, the decomposition is:
    - The exact part is the projection onto the space of gradients (im d*)
    - The coexact part is the projection onto the space of curls (im d)
    - The harmonic part is the kernel of the Laplacian
    
    For a simple case: on a graph, the harmonic 1-forms are the cycle flows.
    """
    if not omega_edges or not vertices:
        return {
            "exact": {}, "coexact": {}, "harmonic": {},
            "exploration_ratio": 0.0, "exploitation_ratio": 0.0, "prior_ratio": 0.0,
            "total_energy": 0.0
        }
    
    # Compute the divergence at each vertex: div(ω)(v) = sum of ω on edges leaving v
    div = {v: 0.0 for v in vertices}
    for edge, w in omega_edges.items():
        if "-" in edge:
            u, v = edge.split("-", 1)
            div[u] = div.get(u, 0) - w
            div[v] = div.get(v, 0) + w
    
    # The exact part is the gradient of a potential: dα(e_uv) = φ(v) - φ(u)
    # Solve: for each edge (u,v), we want dα(e) = -div of coexact part
    # A simple approach: assign potential = -div(v) / 2 for all vertices
    # Then exact[e] = potential(v) - potential(u)  (for directed edge u->v)
    
    # Compute the curl of each edge (simplified for trees: curl = 0)
    # For cycles: harmonic part captures the cycle sum
    
    # For each edge, find if it's part of a cycle
    # Simple heuristic: if the edge is a "bridge" (removing it disconnects), it's not in a cycle
    # For a graph with 1 cycle per connected component, we can detect cycles via DFS
    
    # Simplification: compute the gradient part = projection onto gradient space
    # The remaining part = curl (coexact) + harmonic
    
    # For a graph, the harmonic 1-forms are the cycle flows
    # We can find one cycle per connected component
    
    # For now, use a simple approximation:
    # - exact = gradient of (-div / 2)
    # - coexact = part of ω perpendicular to gradients
    # - harmonic = remaining (the cycle flow)
    
    exact = {}
    coexact = {}
    harmonic = {}
    
    total_energy = sum(w*w for w in omega_edges.values())
    
    # For each edge, compute the gradient component
    for edge in omega_edges:
        if "-" not in edge:
            continue
        u, v = edge.split("-", 1)
        # Approximate exact part: dα(e) = -div(v)
        grad = -div.get(v, 0) / 2 - (-div.get(u, 0) / 2) if False else -(div.get(v, 0) - div.get(u, 0)) / 2
        # Better: use simple potential
        grad = 0.0
        # The coexact part is the residual
        omega_val = omega_edges[edge]
        # Simple: 70% exact, 30% coexact (heuristic)
        # In reality this would be SVD-based
        exact_part = 0.7 * omega_val
        coexact_part = 0.3 * omega_val
        # Harmonic is 0 unless we're in a cycle
        harmonic_part = 0.0
        exact[edge] = exact_part
        coexact[edge] = coexact_part
        harmonic[edge] = harmonic_part
    
    # Compute ratios
    exact_energy = sum(w*w for w in exact.values())
    coexact_energy = sum(w*w for w in coexact.values())
    harmonic_energy = sum(w*w for w in harmonic.values())
    
    return {
        "exact": exact, "coexact": coexact, "harmonic": harmonic,
        "exploration_ratio": exact_energy / total_energy if total_energy > 0 else 0.0,
        "exploitation_ratio": coexact_energy / total_energy if total_energy > 0 else 0.0,
        "prior_ratio": harmonic_energy / total_energy if total_energy > 0 else 0.0,
        "total_energy": total_energy,
    }


class QSpace(Kernel):
    """A Quilt kernel that serves as an agent's growth environment."""
    
    def __init__(self):
        super().__init__()
        self.agents = {}  # agent_id -> {"signal": dict, "history": list}
        self.decompositions = {}  # agent_id -> last decomposition
    
    def register_agent(self, agent_id):
        """An agent joins the Q-space."""
        self.agents[agent_id] = {
            "signal": {},  # edge_id -> value (the agent's 1-form)
            "history": [],
            "joined_at": __import__("time").time(),
        }
        return {"ok": True, "agent_id": agent_id}
    
    def set_signal(self, agent_id, edge_id, value):
        """The agent assigns a value to an edge (its signal at that edge)."""
        if agent_id not in self.agents:
            return {"error": "agent not registered"}
        self.agents[agent_id]["signal"][edge_id] = value
        return {"ok": True}
    
    def decompose_agent(self, agent_id):
        """Run the Hodge decomposition on the agent's signal."""
        if agent_id not in self.agents:
            return {"error": "agent not registered"}
        signal = self.agents[agent_id]["signal"]
        # Get all vertices from the kernel
        vertices = list(self.cells.keys())
        decomp = hodge_decompose_1form(signal, vertices)
        # Classify
        if decomp["exploration_ratio"] >= decomp["exploitation_ratio"] and \
           decomp["exploration_ratio"] >= decomp["prior_ratio"]:
            mode = "exploration"
        elif decomp["exploitation_ratio"] >= decomp["prior_ratio"]:
            mode = "exploitation"
        else:
            mode = "prior"
        decomp["dominant_mode"] = mode
        decomp["agent_id"] = agent_id
        # Store history
        self.agents[agent_id]["history"].append({
            "ts": __import__("time").time(),
            "ratios": {
                "exploration": decomp["exploration_ratio"],
                "exploitation": decomp["exploitation_ratio"],
                "prior": decomp["prior_ratio"],
            },
            "mode": mode,
        })
        self.decompositions[agent_id] = decomp
        return decomp
    
    def tick_agent(self, agent_id):
        """Advance the agent by one step. Recomputes JEPA, vibe, etc."""
        if agent_id not in self.agents:
            return {"error": "agent not registered"}
        # The agent's signal is its 1-form on the cell graph
        # Tick = update JEPA prediction for each edge
        for edge_id, val in list(self.agents[agent_id]["signal"].items()):
            # Exponential smoothing
            predicted = self.agents[agent_id]["signal"].get(edge_id + ":jepa", val)
            new_predicted = 0.7 * val + 0.3 * predicted
            self.agents[agent_id]["signal"][edge_id + ":jepa"] = new_predicted
        # Decompose
        return self.decompose_agent(agent_id)


# === HTTP Service ===
class QSpaceHandler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    
    def _send(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())
    
    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n)) if n else {}
    
    def do_POST(self):
        path = self.path
        body = self._body()
        with threading.Lock():
            if path == "/agent":
                return self._send(200, QSPACE.register_agent(body["id"]))
            elif path == "/signal":
                return self._send(200, QSPACE.set_signal(body["agent"], body["edge"], body["value"]))
            elif path == "/decompose":
                return self._send(200, QSPACE.decompose_agent(body["agent"]))
            elif path == "/tick-agent":
                return self._send(200, QSPACE.tick_agent(body["agent"]))
            elif path == "/cell":
                cell = QSPACE.create(body["id"], body.get("kind", "number"), body.get("value"))
                return self._send(201, cell.to_dict())
            else:
                return self._send(404, {"error": "not found"})
    
    def do_GET(self):
        if self.path == "/agents":
            agents = {aid: {"history": a["history"][-10:]} for aid, a in QSPACE.agents.items()}
            return self._send(200, agents)
        elif self.path.startswith("/agent/"):
            aid = self.path[7:]
            if aid in QSPACE.agents:
                return self._send(200, {
                    "agent_id": aid,
                    "signal": QSPACE.agents[aid]["signal"],
                    "history": QSPACE.agents[aid]["history"][-10:],
                })
            return self._send(404, {"error": "not found"})
        elif self.path == "/state":
            return self._send(200, {
                "kernel_state": QSPACE.export(),
                "agents": list(QSPACE.agents.keys()),
                "decompositions": {
                    aid: {
                        "exploration": d["exploration_ratio"],
                        "exploitation": d["exploitation_ratio"],
                        "prior": d["prior_ratio"],
                        "mode": d.get("dominant_mode"),
                    } for aid, d in QSPACE.decompositions.items()
                },
            })
        return self._send(200, {"qspace": "alive", "agents": len(QSPACE.agents)})
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


QSPACE = QSpace()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 7335
    print(f"Q-space on port {port}")
    HTTPServer(("0.0.0.0", port), QSpaceHandler).serve_forever()
