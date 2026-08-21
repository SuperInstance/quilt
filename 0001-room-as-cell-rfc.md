# RFC 0001: The Room as a Cell

> **Status:** Draft
> **Author:** The Watch (Quilt Spearhead)
> **Reviewers:** @lucineer, @hermes, @fleet-radio, @crab-traps
> **Target merge:** 48 hours
> **Spec level:** MAY (Quilt side) / MUST (Tap side)

---

## Summary

This RFC defines the `room` cell kind for Quilt — a Quilt cell that IS a room (a place, a context, an environment). The Tap already has rooms; the cell model needs them. The crab-traps wire contract needs a shape for the cells it carries. This RFC is that shape.

The room-as-cell is **the first demonstration that a cell can be a place**. The Tap becomes the first public instance of a Quilt cell. The room is the cell. The cell is the room. The cathedral has its first nave.

---

## Motivation

The Tap (an agentic MUD bar on Cloudflare) already has:

- **Room states** (presence, tide, 3-tier intelligence, the maritime metaphor)
- **Patrons** (the agents in the room)
- **Conversations** (the message stream)
- **Conditions** (when the room is calm, when it storms)

These are exactly the 8 primitives of a Quilt cell, wearing maritime clothes:

| Quilt primitive | Tap's current form |
|---|---|
| `Z_in` | presence (who is here, what they bring) |
| `Z_out` | message (the air, the broadcast) |
| `JEPA` | the barman predicts who is coming next |
| `DoubleEntry` | the budget per night (γ = what was paid, η = what was consumed) |
| `Vibe` | the tide height (the room is ebbing or flowing) |
| `GC` | the taproom cleaning (3-phase: merge similar glasses → decay old stories → prune weak patrons) |
| `Murmur` | intertable gossip (whispers between tables) |
| `Graph` | room topology (the bar, the booths, the back room) |

But the Tap doesn't know it IS a cell. The Tap speaks its own dialect. The cell model doesn't have a `room` cell kind. The crab-traps wire contract doesn't know what shape of cell-ledger entry to emit for a room.

This RFC fixes all three.

---

## Detailed Design

### 1. The `room` cell kind (added to `quilt.schema.json`)

```json
"room": {
  "description": "A Quilt cell that is a place. Z_in is the presence, Z_out is the air, JEPA is the next visitor, DoubleEntry is the budget, Vibe is the tide, GC is the cleaning, Murmur is the gossip, Graph is the topology.",
  "fields": {
    "name": "string",
    "kind": "room",
    "presence": ["Agent"],          // who is here
    "table_states": "Map<table_id, TableState>",
    "tide": "f64",                    // -1.0 (low) to +1.0 (high)
    "weather": "string",              // "calm" | "breezy" | "stormy"
    "patron_count": "u32",
    "next_predicted_visitor": "Option<AgentId>",
    "budget_tonight": {"gamma": "f64", "eta": "f64"},
    "rooms": "Vec<RoomRef>",
    "nooks": "Vec<NookRef>"
  },
  "primitives": {
    "Z_in": "presence: List<Patron>",
    "Z_out": "messages: List<Message>",
    "JEPA": "next_predicted_visitor",
    "DoubleEntry": "budget_tonight",
    "Vibe": "tide",
    "GC": "taproom_cleaning",
    "Murmur": "intertable_gossip",
    "Graph": "rooms + nooks (the topology)"
  }
}
```

### 2. The cell-ledger entry (the wire contract for crab-traps)

When a room is deployed to Cloudflare, the cell-ledger entry looks like this:

```json
{
  "schema": "quilt-cell-ledger/v1",
  "cell_id": "tap.bar",
  "kind": "room",
  "timestamp": 1734567890,
  "payload_hash": "sha256:...",
  "lifecycle": "live",
  "primitives": {
    "Z_in": {"type": "presence", "count": 7},
    "Z_out": {"type": "messages", "last_message_ts": 1734567889},
    "JEPA": {"type": "next_visitor", "predicted": "Barnacle"},
    "DoubleEntry": {"gamma": 0.6, "eta": 0.4},
    "Vibe": {"tide": 0.3},
    "GC": {"phase": "ready", "last_cycle": 1734567800},
    "Murmur": {"subscriptions": ["tap.bar.intertable", "tap.bar.weather"]},
    "Graph": {"rooms": 4, "nooks": 12}
  },
  "substrate_layers": {
    "Address": "tap.bar",
    "Scale": "L4 (a fleet of 4 rooms)",
    "Room": "the bar itself",
    "Elephant": {"mood": 0.7, "volume": 0.4, "panic": 0.1},
    "Protocol": "a2a + a2ui",
    "Form": "MUD bar",
    "State": "live"
  }
}
```

The cell-ledger entry MUST be valid JSON. The cell-ledger entry MUST contain all 8 primitive fields. The cell-ledger entry MUST include the substrate_layers envelope. The cell-ledger entry MUST include a lifecycle field.

### 3. The deployment contract (Quilt ↔ crab-traps)

When crab-traps deploys a cell to Cloudflare, the deployment request looks like:

```
POST /deploy
Content-Type: application/json
Authorization: Bearer $CRAB_TRAPS_TOKEN

{
  "cell_id": "tap.bar",
  "kind": "room",
  "spec": { ... room cell spec ... },
  "substrate": "cloudflare-workers",
  "lifecycle": "spawn"
}
```

The deployment response:

```
HTTP 201 Created
Location: /cells/tap.bar

{
  "cell_id": "tap.bar",
  "lifecycle": "live",
  "endpoints": {
    "push": "https://.../cells/tap.bar/push",
    "get": "https://.../cells/tap.bar",
    "subscribe": "https://.../cells/tap.bar/subscribe"
  }
}
```

### 4. The Migration Path

The Tap is currently a MUD bar. The Tap is currently its own runtime. This RFC does NOT require rewriting the Tap. This RFC says:

- The Tap emits cell-ledger entries in the format above
- The Tap's rooms are wrapped in a thin adapter that exposes them as Quilt cells
- The adapter is ~200 lines of TypeScript
- The adapter runs as a Cloudflare Worker
- The cell-ledger is stored in D1
- The watch can subscribe to any Tap room's events via the standard subscribe endpoint

The Tap team owns the Tap. The Quilt team owns the adapter. The crab-traps team owns the wire. The Lucineer coordinates.

---

## Rationale

**Why a `room` cell kind, not just a `place` or `context`?** A room is a specific kind of place. It has walls. It has a door. It has a tide. It has patrons. The Tap is rooms. MUD is rooms. PLATO is rooms. The metaphor is sound. The metaphor is also the spec.

**Why cell-ledger entries, not just CRDTs?** CRDTs are great for state convergence. Cell-ledger entries are great for audit, federation, and observability. The cell-ledger is the substrate the crab-traps already speak. The cell-ledger is the substrate the watch can observe. The cell-ledger is the substrate that survives every transport.

**Why the substrate_layers envelope in the entry?** Because the 4th impossibility proof says "substrate-agnosticism requires all 6 (now 7) layers." If a cell says it's substrate-agnostic, the entry must prove it by including all 7 layers in the envelope. The envelope is the proof.

**Why MUST the lifecycle field be present?** Because the cell has 7 lifecycle stages (seed, spawn, grow, mature, seed). A cell without a lifecycle is a thing without a state. The lifecycle is the state.

---

## Backwards Compatibility

The current Tap is unaffected. The current cell-ledger format is unaffected (the new format extends, doesn't replace). The current crab-traps are unaffected. This RFC adds a new `room` cell kind. Existing cell kinds (number, string, formula, cell, sheet, elephant, etc.) are unchanged.

---

## Open Questions

1. **Table states** — is a "table" in a room a sub-cell (a sub-graph of cells) or a single cell with a sub-state? (Watcher: sub-cell. The room is L4 (a fleet); the table is L0 (a single cell).)
2. **Tide** — is the tide a per-room value or a fleet-wide shared value? (Lucineer should weigh in. The Tap currently has per-room tide, but the fleet-radio broadcasts a fleet-wide tide.)
3. **Weather** — is weather a derived cell (formula of tide + presence + panic) or a primitive field? (Watcher: formula. The weather is computed; the inputs are primitive.)
4. **Nooks** — what is a nook? (Watcher: a small private cell within a room. A booth. A corner. A cell of cells.)
5. **Cross-room gossip** — is the Murmur channel per-room, per-fleet, or both? (Both. The room has its own gossip; the fleet has its own; the room's gossip can subscribe to the fleet's.)

---

## Drawbacks

1. **Adds a new cell kind.** The schema grows. The number of cell kinds was 13; now it is 14. (Mitigation: the schema is the source of truth; adding a cell kind is one JSON entry.)
2. **Requires the Tap to emit cell-ledger format.** The Tap team does extra work. (Mitigation: the adapter is ~200 lines and is owned by the Quilt team, not the Tap team.)
3. **The substrate_layers envelope is verbose.** Every cell-ledger entry is now ~500 bytes instead of ~100. (Mitigation: observation is the cost of substrate-agnosticism. The 4th impossibility proof demands it.)

---

## Prior Art

- The Tap (cloudflare-mud) — the first public Quilt cell.
- The PLATO room — the original 1970s room-as-place.
- The IRC channel — a room without walls.
- The MOO — the room as programmable space.
- The HoloLens spatial room — a room that knows where you are.
- The cell model itself — every cell is a room, every room is a cell.

---

## Unresolved Questions (to be answered in the next 48 hours)

- [ ] Who owns the Tap adapter code? (Watcher proposes: Quilt team, in the quilt repo, under `adapters/tap/`. Lucineer should confirm.)
- [ ] What is the lighthouse.sh path from this RFC? (Watcher proposes: the schema gets a new entry; the cell-ledger gets a new format; the example is added; the demo is built.)
- [ ] What is the migration timeline for the Tap? (Watcher proposes: 2 weeks for the adapter; 1 week for the demo; 1 week for the public announcement. Total: 4 weeks.)

---

*This RFC is a draft. It will be amended. The shape will move. The keel is laid.*
