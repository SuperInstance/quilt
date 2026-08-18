# @quilt/tui

Terminal UI for Quilt — the power-tool view of a running engine.

## What it is

A focused, keyboard-driven terminal interface to a Quilt engine.
You get a live cell grid, a dependencies panel for the selected
cell, and key bindings for navigation, editing, and inspection.

It's designed to play well with tmux/screen — no full-screen
mode, no cursor hijacking. You can scroll back through your
shell history while it's running.

## Install

```sh
npm install @quilt/tui @quilt/core
```

## Use

```sh
# From a YAML sheet
npx quilt-tui ./path/to/sheet.yaml

# From an empty engine (you can register cells via the API)
npx quilt-tui
```

## Key bindings

| Key              | Action                              |
| ---------------- | ----------------------------------- |
| `j` / `↓`        | Move selection down                 |
| `k` / `↑`        | Move selection up                   |
| `g`              | Jump to top                         |
| `G`              | Jump to bottom                      |
| `e`              | Edit (read-only in MVP)             |
| `s`              | Set a new value (JSON or string)    |
| `:`              | Command mode (`:reload`, `:help`)   |
| `r`              | Reload from the engine              |
| `q` / `Ctrl+C`   | Quit                                |

In `s` (set) mode, the buffer accepts a JSON value (number,
string, object, array) or a bare string. Examples:

- `42` — sets the cell to the number 42
- `"hello"` — sets the cell to the string "hello"
- `{"a": 1}` — sets the cell to the object
- `[1, 2, 3]` — sets the cell to the array

## Architecture

```
   ┌────────────┐  keystrokes   ┌────────────┐  render()   ┌──────────┐
   │ KeyReader  │ ────────────► │   TuiApp   │ ──────────► │  stdout  │
   └────────────┘               └────────────┘             └──────────┘
                                       │
                                       │ engine.subscribe()
                                       ▼
                                 ┌────────────┐
                                 │   Engine   │
                                 └────────────┘
```

The renderer (`src/render.ts`) is a pure function over state —
no I/O, no side effects. This makes it snapshot-testable. The
state machine (`src/index.ts`) handles keys, manages the
edit/set/command buffers, and orchestrates the engine.

## Why no TUI library

We use raw ANSI escape codes directly. A TUI library is a
5-10MB install. We avoid that. The cost is no resize handling
or mouse support — we don't need them. The TUI is a focused
tool, not a full IDE.

## Testing

```sh
npm test
```

The renderer tests don't need a TTY — they exercise the pure
function over different states. The key reader is tested
separately. The full TUI is tested manually in a real terminal.
