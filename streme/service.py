"""
service.py — a streamlined back-end on top of kernel-mini
==========================================================

4 endpoints. That's it.
- POST /cell — create a cell
- POST /set — set a cell's Z_in
- POST /tick — advance the simulation
- GET  /state — get the current state

The whole back-end in 80 lines. No frameworks. No external deps.
The streamlined pattern: the front-end talks to /state. The back-end just keeps state.
"""

import sys
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, "/workspace/quilt-build/streme")
from kernel_mini import Kernel

KERNEL = Kernel()
LOCK = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}
        path = self.path
        with LOCK:
            if path == "/cell":
                cell = KERNEL.create(body["id"], body.get("kind", "number"), body.get("value"))
                self._send(201, cell.to_dict())
            elif path == "/set":
                cell = KERNEL.get(body["id"])
                if not cell: return self._send(404, {"error": "not found"})
                KERNEL.set(cell, body["value"])
                self._send(200, cell.to_dict())
            elif path == "/link":
                p = KERNEL.get(body["from"])
                c = KERNEL.get(body["to"])
                if not p or not c: return self._send(404, {"error": "not found"})
                KERNEL.link(p, c)
                self._send(201, {"ok": True})
            elif path == "/tick":
                KERNEL.tick(body.get("n", 1))
                self._send(200, {"tick": KERNEL.tick_count})
            else:
                self._send(404, {"error": "not found"})

    def do_GET(self):
        if self.path == "/state":
            self._send(200, KERNEL.export())
        elif self.path == "/":
            self._send(200, {"service": "kernel-mini", "cells": len(KERNEL.cells)})
        else:
            self._send(404, {"error": "not found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 7333
    print(f"kernel-mini service on port {port}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()

# === POLYGLOT ENDPOINTS ===
@app.post("/polyglot/run")
def run_polyglot(req: dict):
    """Run a polyglot program (Unlambda, Brainfuck, or APL)."""
    import sys
    sys.path.insert(0, "/workspace/quilt/streme")
    from ql_kernel_extension import PolyglotKernelMini
    kernel = PolyglotKernelMini()
    source = req.get("source", "")
    language = req.get("language", "brainfuck")
    result = kernel.run_polyglot(source, language)
    return result
