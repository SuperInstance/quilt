# Templates

Reusable starting points for common Quilt patterns.

| Template | What it's for |
|---|---|
| `predictive-maintenance.yaml` | Per-machine rows, sensor → model → alert |
| `npc-behavior.yaml` | Game NPC behavior — classical rules + jazz dialogue |
| `edge-anomaly-detection.yaml` | Raspberry Pi / industrial gateway — local loop + model |

## How to use a template

```bash
# Copy a template
cp templates/predictive-maintenance.yaml my-monitor.quilt.yaml

# Edit it
$EDITOR my-monitor.quilt.yaml

# Run it
quilt run my-monitor.quilt.yaml
```

## Building your own template

A good template has:
- A clear row axis (machines, NPCs, devices, tenants)
- A clear column axis (sensors, capabilities, prompts)
- A shared model or service that all rows can use
- A clear escalation path (when to call the model)
- Comments explaining what to customize

Templates are just sheets — anything you can do in a sheet, you can
do in a template. The difference is that templates are designed to
be *copied and customized* rather than run as-is.
