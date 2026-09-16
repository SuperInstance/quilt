# scrapyard-robot

**A child's wall-avoiding robot brain, expressed entirely as Quilt cells** — and
the one example where the robot tells you *why* it did what it did.

This is the [Scrapcraft](https://github.com/SuperInstance/Scrapcraft) tile-brain,
re-expressed in Quilt's own model. It's also the runnable proof of the two
positions offered back to the schema in
[`COORDINATION_WITH_SCRAPCRAFT.md`](../../COORDINATION_WITH_SCRAPCRAFT.md):

1. **`explain.why` — a ledger of cause.** A cell that reads the senses, the
   threshold, and the controller's output and returns a plain-English reason:
   *"Turning left: distance ahead 0.29 < 0.30, so the wall is close."* A Quilt
   cell has eight primitives but no built-in *"why did this fire"*; this shows
   what one looks like, built from the pieces that already exist.
2. **`predict.next` — a visible JEPA.** A one-step forward model: given the
   current command, predict the next state (*"expects a clear path next tick"*).
   Prediction made legible — the JEPA primitive a child can watch.

## What it shows

| Cell | Kind | Role |
|---|---|---|
| `sensor.distance_ahead`, `sensor.line_under` | sensor | the robot's senses (simulated ultrasonic + IR) |
| `cfg.wall_threshold`, `cfg.drive_speed` | value | the child's tuning knobs |
| `decision.wall_close`, `decision.mode`, `status.line` | formula | the pure, reactive decision graph |
| `brain.command` | program | the tile-brain controller — senses → `{drive, turn, action}` |
| `actuator.motors` | io | the motor driver (consumes the command) |
| **`explain.why`** | program | **the ledger of cause — narrates the reason** |
| **`predict.next`** | program | **a visible JEPA — one-step lookahead** |
| `alert.crash_risk` → `log.crash_risk` | listener → program | fires when a crash is imminent |

Everything downstream of `sensor.distance_ahead` recomputes when it changes —
edit `cfg.wall_threshold` and the decisions, the reasons, and the predictions all
move with it. The controller is deterministic: same senses → same command →
same reason, every time (the property that makes a solve reproducible in
Scrapcraft, and that makes a robot a child can *trust*).

## Run it

```bash
# Structure
quilt inspect examples/scrapyard-robot/sheet.yaml

# Load + evaluate
quilt run examples/scrapyard-robot/sheet.yaml

# Live demo — drive it toward a wall and watch it explain itself
npx tsx examples/scrapyard-robot/demo.ts
```

## Why this example exists

The fleet's thesis is that the cell is the universal substrate — it went to the
boat, to the vessel edge, and (in Scrapcraft) to school. This example closes the
loop: it takes what the classroom instance *needed* — a robot that can say why,
and a prediction you can see — and hands it back to the flagship as cells anyone
can copy. The senses are simulated; the pattern is real.
