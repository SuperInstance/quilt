#!/usr/bin/env python3
"""
Quilt Interactive Shell

A cell-oriented reactive programming environment with 8 primitives, 7 layers, 
and 9 elephant dials.

8 PRIMITIVES (cell fields):
- kind: cell type identifier
- value: current computed value
- formula: computation expression
- watch: subscription callback
- children: dependent cells
- parents: dependency cells  
- room: containing environment
- steward: management policy

7 LAYERS:
1. Substrate - raw cell storage
2. Formula - reactive computation
3. Watch - observation system
4. Room - containment hierarchy
5. Steward - lifecycle management
6. Bridge - external interfaces
7. REPL - user interaction

9 ELEPHANT DIALS (global parameters):
1. tick_rate: simulation speed
2. gc_threshold: garbage collection trigger
3. max_cells: maximum cell count
4. bridge_timeout: external call timeout
5. watch_depth: subscription nesting limit
6. formula_depth: computation recursion limit
7. room_capacity: cells per room
8. steward_patience: retry attempts
9. log_level: verbosity (0-3)

THE WATCH: Global subscription system tracking cell changes across ticks.

ROOM-AS-CELL: The root environment is itself a cell (id: "room") containing all others.

CELL SPEC: Each cell type has a schema defining valid fields and behaviors.
"""

import cmd
import readline
import json
import dataclasses
from typing import Dict, List, Any, Optional, Callable
from enum import Enum

class CellKind(Enum):
    NUMBER = "number"
    STRING = "string"
    FORMULA = "formula"
    SHEET = "sheet"
    CELL = "cell"
    ROOM = "room"
    ELEPHANT = "elephant"
    STEWARD = "steward"

@dataclasses.dataclass
class Cell:
    id: str
    kind: CellKind
    value: Any = None
    formula: Optional[str] = None
    watch: Optional[Callable] = None
    children: List[str] = dataclasses.field(default_factory=list)
    parents: List[str] = dataclasses.field(default_factory=list)
    room: str = "room"
    steward: str = "default"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind.value,
            "value": self.value,
            "formula": self.formula,
            "children": self.children,
            "parents": self.parents,
            "room": self.room,
            "steward": self.steward
        }

class QuiltState:
    def __init__(self):
        self.cells: Dict[str, Cell] = {}
        self.watches: Dict[str, List[Callable]] = {}
        self.tick_count = 0
        self.dials = {
            "tick_rate": 1.0,
            "gc_threshold": 1000,
            "max_cells": 10000,
            "bridge_timeout": 5.0,
            "watch_depth": 10,
            "formula_depth": 100,
            "room_capacity": 1000,
            "steward_patience": 3,
            "log_level": 1
        }
        self.bridges: Dict[str, Dict[str, Any]] = {}
        self._init_default_cells()
    
    def _init_default_cells(self):
        """Initialize the root room and essential system cells"""
        room_cell = Cell("room", CellKind.ROOM, value="Root environment")
        self.cells["room"] = room_cell
        
        steward_cell = Cell("default", CellKind.STEWARD, value="Default policy")
        self.cells["default"] = steward_cell
        
        elephant_cell = Cell("elephant", CellKind.ELEPHANT, value=self.dials)
        self.cells["elephant"] = elephant_cell
    
    def add_cell(self, cell_id: str, kind: CellKind) -> bool:
        if cell_id in self.cells:
            return False
        if len(self.cells) >= self.dials["max_cells"]:
            return False
        
        cell = Cell(cell_id, kind)
        self.cells[cell_id] = cell
        return True
    
    def set_field(self, cell_id: str, field: str, value: Any) -> bool:
        if cell_id not in self.cells:
            return False
        
        cell = self.cells[cell_id]
        if hasattr(cell, field):
            setattr(cell, field, value)
            return True
        return False
    
    def get_cell(self, cell_id: str) -> Optional[Dict[str, Any]]:
        if cell_id in self.cells:
            return self.cells[cell_id].to_dict()
        return None
    
    def add_watch(self, cell_id: str, callback: Callable) -> bool:
        if cell_id not in self.cells:
            return False
        
        if cell_id not in self.watches:
            self.watches[cell_id] = []
        self.watches[cell_id].append(callback)
        return True
    
    def tick(self):
        """Advance simulation by one step"""
        self.tick_count += 1
        
        # Process watches for changed cells
        for cell_id, callbacks in self.watches.items():
            if cell_id in self.cells:
                for callback in callbacks:
                    try:
                        callback(self.cells[cell_id], self.tick_count)
                    except Exception:
                        pass  # Watch errors shouldn't crash the system
    
    def run_ticks(self, n: int = 1):
        """Run multiple ticks"""
        for _ in range(n):
            self.tick()
    
    def garbage_collect(self):
        """3-phase garbage collection"""
        # Phase 1: Mark reachable cells from roots
        reachable = set()
        stack = ["room", "default", "elephant"]
        
        while stack:
            cell_id = stack.pop()
            if cell_id in self.cells and cell_id not in reachable:
                reachable.add(cell_id)
                cell = self.cells[cell_id]
                stack.extend(cell.children)
                stack.extend(cell.parents)
        
        # Phase 2: Sweep unreachable cells
        unreachable = set(self.cells.keys()) - reachable
        for cell_id in unreachable:
            if cell_id in self.watches:
                del self.watches[cell_id]
            del self.cells[cell_id]
        
        # Phase 3: Compact (in this implementation, just report)
        return len(unreachable)
    
    def list_cells(self) -> List[str]:
        return list(self.cells.keys())
    
    def get_graph(self) -> Dict[str, Any]:
        """Return graph structure (V, E, C, β₁)"""
        vertices = list(self.cells.keys())
        edges = []
        components = []
        beta1 = 0  # First Betti number (simplified)
        
        for cell_id, cell in self.cells.items():
            for child_id in cell.children:
                if child_id in self.cells:
                    edges.append((cell_id, child_id))
        
        # Simple component detection (naive)
        visited = set()
        for cell_id in vertices:
            if cell_id not in visited:
                component = set()
                stack = [cell_id]
                while stack:
                    current = stack.pop()
                    if current not in visited:
                        visited.add(current)
                        component.add(current)
                        cell = self.cells[current]
                        stack.extend([c for c in cell.children if c in self.cells])
                        stack.extend([p for p in cell.parents if p in self.cells])
                components.append(list(component))
                beta1 += len(component) - 1  # Simplified Betti calculation
        
        return {
            "vertices": vertices,
            "edges": edges,
            "components": components,
            "beta1": beta1
        }
    
    def find_cells(self, pattern: str) -> List[str]:
        """Find cells matching pattern (simple substring match)"""
        return [cell_id for cell_id in self.cells.keys() if pattern in cell_id]
    
    def to_mermaid(self) -> str:
        """Export graph as Mermaid syntax"""
        graph = self.get_graph()
        lines = ["graph TD"]
        
        for edge in graph["edges"]:
            lines.append(f"    {edge[0]} --> {edge[1]}")
        
        return "\n".join(lines)

class QuiltREPL(cmd.Cmd):
    def __init__(self):
        super().__init__()
        self.state = QuiltState()
        self.output_mode = "text"
        self.prompt = "quilt> "
        
        # Enable readline history
        try:
            readline.read_history_file(".quilt_history")
        except FileNotFoundError:
            pass
    
    def emptyline(self):
        """Do nothing on empty input"""
        pass
    
    def do_load(self, arg):
        """Load a .qzt file"""
        if not arg:
            self._output("Error: filename required")
            return
        
        try:
            with open(arg, 'r') as f:
                data = json.load(f)
            
            # Simple loading implementation
            for cell_data in data.get("cells", []):
                kind = CellKind(cell_data["kind"])
                cell = Cell(cell_data["id"], kind)
                for field in ["value", "formula", "children", "parents", "room", "steward"]:
                    if field in cell_data:
                        setattr(cell, field, cell_data[field])
                self.state.cells[cell.id] = cell
            
            self._output(f"Loaded {len(data.get('cells', []))} cells from {arg}")
        except Exception as e:
            self._output(f"Error loading {arg}: {e}")
    
    def do_save(self, arg):
        """Save current state to .qzt file"""
        if not arg:
            self._output("Error: filename required")
            return
        
        try:
            data = {
                "cells": [cell.to_dict() for cell in self.state.cells.values()],
                "tick_count": self.state.tick_count,
                "dials": self.state.dials
            }
            
            with open(arg, 'w') as f:
                json.dump(data, f, indent=2)
            
            self._output(f"Saved {len(self.state.cells)} cells to {arg}")
        except Exception as e:
            self._output(f"Error saving {arg}: {e}")
    
    def do_new(self, arg):
        """Create a new cell: new <cell_id> <kind>"""
        args = arg.split()
        if len(args) != 2:
            self._output("Error: need cell_id and kind")
            return
        
        cell_id, kind_str = args
        try:
            kind = CellKind(kind_str)
        except ValueError:
            self._output(f"Error: invalid kind '{kind_str}'")
            return
        
        if self.state.add_cell(cell_id, kind):
            self._output(f"Created cell {cell_id} of kind {kind.value}")
        else:
            self._output(f"Error: could not create cell {cell_id}")
    
    def do_set(self, arg):
        """Set a primitive field: set <cell> <field> <value>"""
        args = arg.split(maxsplit=2)
        if len(args) != 3:
            self._output("Error: need cell, field, and value")
            return
        
        cell_id, field, value = args
        if self.state.set_field(cell_id, field, value):
            self._output(f"Set {cell_id}.{field} = {value}")
        else:
            self._output(f"Error: could not set field")
    
    def do_get(self, arg):
        """Get a cell's current state"""
        if not arg:
            self._output("Error: cell id required")
            return
        
        cell_data = self.state.get_cell(arg)
        if cell_data:
            self._output_json(cell_data)
        else:
            self._output(f"Error: cell '{arg}' not found")
    
    def do_watch(self, arg):
        """Subscribe to a cell's events"""
        if not arg:
            self._output("Error: cell id required")
            return
        
        def watch_callback(cell, tick):
            self._output(f"Watch[{tick}]: {cell.id} = {cell.value}")
        
        if self.state.add_watch(arg, watch_callback):
            self._output(f"Watching cell {arg}")
        else:
            self._output(f"Error: could not watch cell {arg}")
    
    def do_tick(self, arg):
        """Advance the simulation by 1 step"""
        self.state.tick()
        self._output(f"Tick {self.state.tick_count}")
    
    def do_run(self, arg):
        """Run n ticks (default 1)"""
        try:
            n = int(arg) if arg else 1
            self.state.run_ticks(n)
            self._output(f"Ran {n} ticks, now at tick {self.state.tick_count}")
        except ValueError:
            self._output("Error: invalid tick count")
    
    def do_gc(self, arg):
        """Run 3-phase garbage collection"""
        collected = self.state.garbage_collect()
        self._output(f"GC collected {collected} cells")
    
    def do_cells(self, arg):
        """List all cells"""
        cells = self.state.list_cells()
        self._output(f"Cells ({len(cells)}): {', '.join(cells)}")
    
    def do_graph(self, arg):
        """Show the cell graph (V, E, C, β₁)"""
        graph = self.state.get_graph()
        self._output_json(graph)
    
    def do_dials(self, arg):
        """Show the 9 elephant dials"""
        self._output_json(self.state.dials)
    
    def do_inspect(self, arg):
        """Show all 8 primitives for a cell"""
        if not arg:
            self._output("Error: cell id required")
            return
        
        cell_data = self.state.get_cell(arg)
        if cell_data:
            self._output_json(cell_data)
        else:
            self._output(f"Error: cell '{arg}' not found")
    
    def do_spec(self, arg):
        """Show the cell's spec from the schema"""
        if not arg:
            self._output("Error: cell id required")
            return
        
        if arg not in self.state.cells:
            self._output(f"Error: cell '{arg}' not found")
            return
        
        cell = self.state.cells[arg]
        spec = {
            "kind": cell.kind.value,
            "fields": ["kind", "value", "formula", "watch", "children", "parents", "room", "steward"],
            "valid_parents": "any",
            "valid_children": "any"
        }
        self._output_json(spec)
    
    def do_find(self, arg):
        """Find cells matching a pattern"""
        if not arg:
            self._output("Error: pattern required")
            return
        
        matches = self.state.find_cells(arg)
        self._output(f"Found {len(matches)} cells: {', '.join(matches)}")
    
    def do_bridges(self, arg):
        """List available bridges"""
        bridges = list(self.state.bridges.keys())
        self._output(f"Bridges ({len(bridges)}): {', '.join(bridges)}")
    
    def do_bridge(self, arg):
        """Show a bridge's status"""
        if not arg:
            self._output("Error: bridge name required")
            return
        
        if arg in self.state.bridges:
            self._output_json(self.state.bridges[arg])
        else:
            self._output(f"Error: bridge '{arg}' not found")
    
    def do_mermaid(self, arg):
        """Export the current graph as Mermaid syntax"""
        mermaid = self.state.to_mermaid()
        self._output(mermaid)
    
    def do_output(self, arg):
        """Set output mode: text, json, or mermaid"""
        if arg in ["text", "json", "mermaid"]:
            self.output_mode = arg
            self._output(f"Output mode set to {arg}")
        else:
            self._output("Error: valid modes are text, json, mermaid")
    
    def do_exit(self, arg):
        """Quit the REPL"""
        try:
            readline.write_history_file(".quilt_history")
        except Exception:
            pass
        return True
    
    def _output(self, text):
        """Output text according to current mode"""
        if self.output_mode == "json":
            print(json.dumps({"output": text}))
        else:
            print(text)
    
    def _output_json(self, data):
        """Output JSON data according to current mode"""
        if self.output_mode == "text":
            print(json.dumps(data, indent=2))
        else:
            print(json.dumps(data))

if __name__ == "__main__":
    QuiltREPL().cmdloop()
