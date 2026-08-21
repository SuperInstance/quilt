# kernel-mini — the streamlined back-end

The essence of Quilt in 275 lines of Python.

## The discovery

The full Quilt kernel has 8 primitives. That's a lot for a starter. After building
the full kernel and the lighthouse, I went looking for the essence: what's the
minimum I need to ship something real?

The answer: **4 primitives, 4 endpoints, 275 lines.**

## The 4 primitives

The other 4 (Vibe, GC, Murmur, Graph) are *derived*:
- Vibe = `|z_out - jepa.predicted| * jepa.confidence`
- GC = `kernel.gc()` — a method on the kernel
- Murmur = gossip about z_out (a future feature)
- Graph = `kernel.beta1()` — V, E, C, β₁

## The 4 endpoints

| Verb | Path | Action |
|---|---|---|
| POST | /cell | Create a cell |
| POST | /set | Set a cell's Z_in |
| POST | /tick | Advance the simulation |
| GET  | /state | Get the current state |

That's it. The whole back-end.

## Use cases

Once you have the 4 endpoints, use cases emerge:

1. **Mood tracker** — Maren's Tuesday afternoon
2. **Plant care** — each plant is a cell
3. **Fish tank monitor** — the LITERAL Echogram
4. **Echo recorder** — the user's voice as a 3D school of fish
5. **Family calendar** — the household is a graph
6. **Pomodoro quilt** — each focus session is a cell

## Run it

```bash
python3 service.py 7334
curl -X POST http://localhost:7334/cell -H "Content-Type: application/json" -d '{"id":"mood","value":4}'
curl -X POST http://localhost:7334/tick -H "Content-Type: application/json" -d '{"n":3}'
curl http://localhost:7334/state
```

## Files

- `kernel_mini.py` (194 lines) — the Cell + Kernel
- `service.py` (81 lines) — the HTTP service

## The lesson

The streamlined back-end is what the user feels. The full kernel is what the system thinks. Both are real. Both are right. Build the streamlined one first, then expand.
