#!/usr/bin/env python3
"""
Quilt Lighthouse — a stdlib HTTP service exposing the Quilt kernel + Fascia.

The lighthouse is the watch at the door. It guides instances to shore.
Run on port 7333. No frameworks. No external deps.
"""

import sys
import os
import json
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, "/workspace")
from quilt_kernel import QuiltKernel, FasciaJEPA, FasciaDoubleEntry, Cell

# === STATE ===
KERNEL = QuiltKernel()
FASCIA_JEPA = KERNEL.fascia_jepa
FASCIA_DE = KERNEL.fascia_de
WATCH_EVENTS = []
SSE_CLIENTS = []


def emit_event(event_type, data):
    WATCH_EVENTS.append({"type": event_type, "ts": time.time(), **data})
    if len(WATCH_EVENTS) > 1000:
        WATCH_EVENTS.pop(0)
    # Notify SSE clients
    msg = json.dumps({"type": event_type, "ts": time.time(), **data})
    dead = []
    for client in SSE_CLIENTS:
        try:
            client["queue"].put(msg)
        except Exception:
            dead.append(client)
    for d in dead:
        SSE_CLIENTS.remove(d)


class LighthouseHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Quieter logs
        pass

    def _send_json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode())

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/" or path == "/health":
            self._send_json(200, {
                "status": "healthy",
                "version": "0.7.0",
                "uptime_sec": time.time() - START_TIME,
                "cells": len(KERNEL.cells),
                "fascia": {
                    "jepa": FASCIA_JEPA.stats(),
                    "doubleentry": FASCIA_DE.stats(KERNEL.cells)
                },
                "events": len(WATCH_EVENTS),
                "graph": KERNEL.beta1(),
            })
        elif path == "/cells":
            self._send_json(200, [c.to_ledger() for c in KERNEL.cells.values()])
        elif path.startswith("/cells/"):
            cid = path[7:]
            cell = KERNEL.get(cid)
            if not cell:
                self._send_json(404, {"error": "cell not found"})
                return
            self._send_json(200, cell.to_ledger())
        elif path == "/graph":
            self._send_json(200, KERNEL.beta1())
        elif path == "/watch":
            self._send_sse()
        elif path == "/watch/events":
            self._send_json(200, WATCH_EVENTS[-50:])
        elif path == "/dials":
            self._send_json(200, KERNEL.dials)
        elif path == "/fascia/jepa":
            self._send_json(200, {
                "subscriptions": FASCIA_JEPA.subscriptions,
                "stats": FASCIA_JEPA.stats()
            })
        elif path == "/fascia/doubleentry":
            self._send_json(200, FASCIA_DE.stats(KERNEL.cells))
        elif path == "/fascia/gradient":
            self._send_json(200, FASCIA_DE.gradient(KERNEL.cells))
        elif path == "/fascia/surprise":
            # ?cell=cell_id
            qs = parse_qs(urlparse(self.path).query)
            cid = qs.get("cell", [None])[0]
            if not cid:
                self._send_json(400, {"error": "missing ?cell="})
                return
            cell = KERNEL.get(cid)
            if not cell:
                self._send_json(404, {"error": "cell not found"})
                return
            self._send_json(200, {
                "cell_id": cid,
                "surprise": FASCIA_JEPA.surprise(cell)
            })
        elif path == "/export":
            qzt = {
                "version": "qzt-v0.7.0",
                "kernel": "lighthouse-py",
                "cells": [c.to_ledger() for c in KERNEL.cells.values()],
                "dials": KERNEL.dials,
                "graph": KERNEL.beta1(),
                "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            self._send_json(200, qzt)
        else:
            self._send_json(404, {"error": "not found", "path": path})

    def do_POST(self):
        path = urlparse(self.path).path
        body = self._read_body()
        try:
            if path == "/cells":
                cell = KERNEL.create_cell(
                    body.get("id"),
                    body.get("kind", "number"),
                    body.get("value")
                )
                if "room" in body:
                    KERNEL.set_room(cell, body["room"])
                if "formula" in body:
                    cell.formula = body["formula"]
                emit_event("cell_created", {"cell_id": cell.id})
                self._send_json(201, cell.to_ledger())
            elif path == "/step":
                n = body.get("n", 1)
                KERNEL.step(n)
                emit_event("step", {"n": n})
                self._send_json(200, {"stepped": n, "tick_count": KERNEL.tick_count})
            elif path == "/edges":
                from_id = body.get("from")
                to_id = body.get("to")
                if from_id not in KERNEL.cells or to_id not in KERNEL.cells:
                    self._send_json(400, {"error": "cell not found"})
                    return
                KERNEL.add_edge(KERNEL.get(from_id), KERNEL.get(to_id))
                emit_event("edge_added", {"from": from_id, "to": to_id})
                self._send_json(201, {"ok": True})
            elif path == "/fascia/transfer":
                result = FASCIA_DE.transfer(
                    KERNEL.get(body["from"]),
                    KERNEL.get(body["to"]),
                    body["gamma"]
                )
                emit_event("fascia_transferred", body)
                self._send_json(200, result)
            elif path == "/fascia/subscribe":
                FASCIA_JEPA.subscribe(body["subscriber"], body["publisher"], KERNEL.get(body["publisher"]))
                emit_event("fascia_subscribed", body)
                self._send_json(200, {"ok": True})
            elif path == "/gc":
                result = KERNEL.gc()
                emit_event("gc", result)
                self._send_json(200, result)
            elif path == "/import":
                KERNEL.cells = {}
                for c in body.get("cells", []):
                    cell = Cell(
                        id=c["cell_id"],
                        kind=c.get("kind", "number"),
                        value=c.get("value")
                    )
                    KERNEL.cells[cell.id] = cell
                emit_event("imported", {"count": len(KERNEL.cells)})
                self._send_json(200, {"ok": True, "imported": len(KERNEL.cells)})
            else:
                self._send_json(404, {"error": "not found", "path": path})
        except Exception as e:
            self._send_json(400, {"error": str(e)})

    def do_PUT(self):
        path = urlparse(self.path).path
        if path.startswith("/cells/"):
            cid = path[7:]
            cell = KERNEL.get(cid)
            if not cell:
                self._send_json(404, {"error": "cell not found"})
                return
            body = self._read_body()
            if "value" in body:
                KERNEL.set_value(cell, body["value"])
            if "room" in body:
                KERNEL.set_room(cell, body["room"])
            if "formula" in body:
                cell.formula = body["formula"]
            emit_event("cell_updated", {"cell_id": cid, "fields": list(body.keys())})
            self._send_json(200, cell.to_ledger())
        else:
            self._send_json(404, {"error": "not found"})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path.startswith("/cells/"):
            cid = path[7:]
            if cid in KERNEL.cells:
                del KERNEL.cells[cid]
                emit_event("cell_deleted", {"cell_id": cid})
                self._send_json(200, {"ok": True})
            else:
                self._send_json(404, {"error": "cell not found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _send_sse(self):
        """Server-sent events stream for the watch channel."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        q = __import__("queue").Queue()
        SSE_CLIENTS.append({"queue": q})
        try:
            # Initial hello
            self.wfile.write(b"event: hello\ndata: {\"kernel\":\"quilt\"}\n\n")
            self.wfile.flush()
            while True:
                try:
                    msg = q.get(timeout=15)
                    self.wfile.write(f"data: {msg}\n\n".encode())
                    self.wfile.flush()
                except __import__("queue").Empty:
                    # Heartbeat
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
        except Exception:
            pass
        finally:
            try:
                SSE_CLIENTS.remove({"queue": q})
            except ValueError:
                pass


START_TIME = time.time()


def run(host="0.0.0.0", port=7333):
    server = HTTPServer((host, port), LighthouseHandler)
    print(f"Quilt Lighthouse listening on {host}:{port}")
    print(f"Try: curl http://localhost:{port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down")


if __name__ == "__main__":
    run()
