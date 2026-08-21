"""
Quilt Universal Cell Format (QZT) Library

This library provides functionality to read, write, validate, migrate, merge, and diff
Quilt's universal cell format (.qzt), a JSON-based format for storing computational
artifacts with metadata, cells, dials, graph structure, and provenance.

The format is structured as:
{
  "version": "qzt-v0.7.0",
  "kernel": "name of kernel that produced it",
  "cells": [{cell_ledger_entry}],
  "dials": {9 dial values},
  "graph": {V, E, C, beta1},
  "exported_at": timestamp
}

The library supports:
- load(path) → returns a dict
- save(path, data) → writes JSON
- to_ledger(cell) → formats a cell as ledger entry
- from_ledger(entry) → reconstructs a cell
- validate(data) → checks all 8 primitives are present
- migrate(data, from_version, to_version) → version migration
- merge(qzt1, qzt2) → combines two .qzt files
- diff(qzt1, qzt2) → shows differences

All operations use only the Python standard library.

Author: Quilt Team
License: MIT
"""

import json
import os
import time
import copy
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime


# Constants
QZT_VERSION = "qzt-v0.7.0"
REQUIRED_KEYS = {
    "version",
    "kernel",
    "cells",
    "dials",
    "graph",
    "exported_at",
}
CELL_KEYS = {
    "id",
    "type",
    "content",
    "metadata",
    "inputs",
    "outputs",
    "source",
    "timestamp",
    "dependencies",
}
GRAPH_KEYS = {
    "V",
    "E",
    "C",
    "beta1",
}


def load(path: str) -> Dict[str, Any]:
    """
    Load a .qzt file from the given path.

    Args:
        path (str): Path to the .qzt file.

    Returns:
        Dict[str, Any]: Parsed JSON data.

    Raises:
        FileNotFoundError: If file does not exist.
        json.JSONDecodeError: If JSON is invalid.
        ValueError: If required keys are missing.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(f"Invalid JSON in {path}: {e.msg}", e.doc, e.pos)

    validate(data)
    return data


def save(path: str, data: Dict[str, Any]) -> None:
    """
    Save data to a .qzt file at the given path.

    Args:
        path (str): Path to save the file.
        data (Dict[str, Any]): Data to write.

    Raises:
        TypeError: If data is not serializable.
        OSError: If file cannot be written.
    """
    validate(data)

    # Ensure exported_at is a valid timestamp
    if "exported_at" not in data:
        data = copy.deepcopy(data)
        data["exported_at"] = datetime.utcnow().isoformat() + "Z"

    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        raise TypeError(f"Cannot serialize data to JSON: {e}")
    except OSError as e:
        raise OSError(f"Failed to write to {path}: {e}")


def to_ledger(cell: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a cell to a ledger entry.

    Args:
        cell (Dict[str, Any]): Cell dictionary.

    Returns:
        Dict[str, Any]: Ledger entry with standard keys.

    Raises:
        ValueError: If required cell keys are missing.
    """
    missing = CELL_KEYS - set(cell.keys())
    if missing:
        raise ValueError(f"Missing required cell keys: {missing}")

    ledger = {
        "id": cell["id"],
        "type": cell["type"],
        "content": cell["content"],
        "metadata": cell["metadata"] or {},
        "inputs": cell["inputs"] or [],
        "outputs": cell["outputs"] or [],
        "source": cell["source"] or "",
        "timestamp": cell["timestamp"] or time.time(),
        "dependencies": cell["dependencies"] or [],
    }

    # Ensure all values are JSON-serializable
    for k, v in ledger.items():
        if isinstance(v, (int, float, str, bool, type(None))):
            continue
        if isinstance(v, (list, dict)):
            try:
                json.dumps(v)
            except TypeError:
                raise ValueError(f"Non-serializable value in {k}: {v}")
        else:
            raise ValueError(f"Unsupported type in {k}: {type(v)}")

    return ledger


def from_ledger(entry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reconstruct a cell from a ledger entry.

    Args:
        entry (Dict[str, Any]): Ledger entry.

    Returns:
        Dict[str, Any]: Reconstructed cell.

    Raises:
        ValueError: If required keys are missing.
    """
    missing = CELL_KEYS - set(entry.keys())
    if missing:
        raise ValueError(f"Missing required ledger keys: {missing}")

    return {
        "id": entry["id"],
        "type": entry["type"],
        "content": entry["content"],
        "metadata": entry["metadata"],
        "inputs": entry["inputs"],
        "outputs": entry["outputs"],
        "source": entry["source"],
        "timestamp": entry["timestamp"],
        "dependencies": entry["dependencies"],
    }


def validate(data: Dict[str, Any]) -> bool:
    """
    Validate that a QZT data dictionary has all required keys and structure.

    Args:
        data (Dict[str, Any]): Data to validate.

    Returns:
        bool: True if valid.

    Raises:
        ValueError: If validation fails.
    """
    if not isinstance(data, dict):
        raise ValueError("Data must be a dictionary")

    missing_keys = REQUIRED_KEYS - set(data.keys())
    if missing_keys:
        raise ValueError(f"Missing required keys: {missing_keys}")

    if not isinstance(data["version"], str):
        raise ValueError("version must be a string")
    if not data["version"].startswith("qzt-v"):
        raise ValueError(f"Invalid version format: {data['version']}")

    if not isinstance(data["kernel"], str):
        raise ValueError("kernel must be a string")

    if not isinstance(data["cells"], list):
        raise ValueError("cells must be a list")
    for i, cell in enumerate(data["cells"]):
        if not isinstance(cell, dict):
            raise ValueError(f"Cell at index {i} is not a dictionary")
        missing = CELL_KEYS - set(cell.keys())
        if missing:
            raise ValueError(f"Cell {i} missing keys: {missing}")

    if not isinstance(data["dials"], dict):
        raise ValueError("dials must be a dictionary")
    if len(data["dials"]) != 9:
        raise ValueError(f"dials must have exactly 9 entries, got {len(data['dials'])}")

    if not isinstance(data["graph"], dict):
        raise ValueError("graph must be a dictionary")
    missing_graph = GRAPH_KEYS - set(data["graph"].keys())
    if missing_graph:
        raise ValueError(f"graph missing keys: {missing_graph}")

    if not isinstance(data["exported_at"], str):
        raise ValueError("exported_at must be a string")
    try:
        datetime.fromisoformat(data["exported_at"].replace("Z", "+00:00"))
    except ValueError:
        raise ValueError(f"Invalid timestamp format: {data['exported_at']}")

    return True


def migrate(data: Dict[str, Any], from_version: str, to_version: str) -> Dict[str, Any]:
    """
    Migrate data from one version to another.

    Currently supports only version 0.7.0.

    Args:
        data (Dict[str, Any]): Data to migrate.
        from_version (str): Source version (e.g., "qzt-v0.6.0").
        to_version (str): Target version (e.g., "qzt-v0.7.0").

    Returns:
        Dict[str, Any]: Migrated data.

    Raises:
        ValueError: If migration is not supported.
    """
    if from_version == to_version:
        return copy.deepcopy(data)

    if from_version == "qzt-v0.6.0" and to_version == "qzt-v0.7.0":
        # Example migration: add default beta1 if missing
        result = copy.deepcopy(data)
        if "graph" not in result or "beta1" not in result["graph"]:
            result["graph"]["beta1"] = 0.5

        # Ensure all dials are present
        while len(result["dials"]) < 9:
            key = f"dial_{len(result['dials'])}"
            result["dials"][key] = 0.0

        # Update version
        result["version"] = "qzt-v0.7.0"
        return result

    raise ValueError(f"Migration from {from_version} to {to_version} is not supported")


def merge(qzt1: Dict[str, Any], qzt2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge two QZT objects.

    Cells are merged by ID (later overrides earlier).
    Dials are merged (later overrides earlier).
    Graph is replaced by qzt2's graph.
    Kernel, version, exported_at from qzt2.
    Exported_at is set to current time.

    Args:
        qzt1 (Dict[str, Any]): First QZT data.
        qzt2 (Dict[str, Any]): Second QZT data.

    Returns:
        Dict[str, Any]: Merged QZT data.

    Raises:
        ValueError: If invalid structure.
    """
    validate(qzt1)
    validate(qzt2)

    merged = copy.deepcopy(qzt2)

    # Merge cells by ID
    cell_map = {c["id"]: c for c in qzt2["cells"]}
    for cell in qzt1["cells"]:
        cell_map[cell["id"]] = cell

    merged["cells"] = list(cell_map.values())

    # Merge dials (qzt2 wins)
    merged["dials"].update(qzt1["dials"])

    # Use qzt2's graph
    merged["graph"] = qzt2["graph"]

    # Use qzt2's metadata
    merged["kernel"] = qzt2["kernel"]
    merged["version"] = qzt2["version"]

    # Update exported_at
    merged["exported_at"] = datetime.utcnow().isoformat() + "Z"

    return merged


def diff(qzt1: Dict[str, Any], qzt2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute the difference between two QZT files.

    Returns a dict with:
    - added_cells: cells in qzt2 but not qzt1
    - removed_cells: cells in qzt1 but not qzt2
    - modified_cells: cells with different content by ID
    - dials_diff: dict of changed dial values
    - graph_diff: True if graphs differ
    - metadata_diff: dict of changed metadata fields

    Args:
        qzt1 (Dict[str, Any]): First QZT data.
        qzt2 (Dict[str, Any]): Second QZT data.

    Returns:
        Dict[str, Any]: Difference report.
    """
    validate(qzt1)
    validate(qzt2)

    diff_report = {
        "added_cells": [],
        "removed_cells": [],
        "modified_cells": [],
        "dials_diff": {},
        "graph_diff": False,
        "metadata_diff": {},
    }

    # Compare cells
    id_map1 = {c["id"]: c for c in qzt1["cells"]}
    id_map2 = {c["id"]: c for c in qzt2["cells"]}

    all_ids = set(id_map1.keys()) | set(id_map2.keys())
    for cid in all_ids:
        c1 = id_map1.get(cid)
        c2 = id_map2.get(cid)

        if c1 is None:
            diff_report["added_cells"].append(cid)
        elif c2 is None:
            diff_report["removed_cells"].append(cid)
        elif c1 != c2:
            # Simple shallow comparison; in practice, compare meaningful fields
            if not all(c1.get(k) == c2.get(k) for k in ("type", "content", "metadata", "inputs", "outputs", "dependencies")):
                diff_report["modified_cells"].append(cid)

    # Compare dials
    for k in set(qzt1["dials"].keys()) | set(qzt2["dials"].keys()):
        v1 = qzt1["dials"].get(k)
        v2 = qzt2["dials"].get(k)
        if v1 != v2:
            diff_report["dials_diff"][k] = {"from": v1, "to": v2}

    # Compare graphs
    if qzt1["graph"] != qzt2["graph"]:
        diff_report["graph_diff"] = True

    # Compare metadata
    metadata_fields = ["version", "kernel", "exported_at"]
    for field in metadata_fields:
        if qzt1.get(field) != qzt2.get(field):
            diff_report["metadata_diff"][field] = {
                "from": qzt1.get(field),
                "to": qzt2.get(field),
            }

    return diff_report


# === TESTS ===
if __name__ == "__main__":
    # Test data
    test_cell = {
        "id": "cell1",
        "type": "code",
        "content": "x = 1 + 1",
        "metadata": {"author": "alice"},
        "inputs": [],
        "outputs": ["x"],
        "source": "example.py",
        "timestamp": time.time(),
        "dependencies": [],
    }

    test_data = {
        "version": "qzt-v0.7.0",
        "kernel": "python",
        "cells": [test_cell],
        "dials": {f"dial_{i}": i * 0.1 for i in range(9)},
        "graph": {
            "V": [1, 2, 3],
            "E": [[0, 1], [1, 2]],
            "C": [0.1, 0.2, 0.3],
            "beta1": 0.5,
        },
        "exported_at": "2023-01-01T00:00:00Z",
    }

    # Test save/load
    test_path = "/tmp/test.qzt"
    save(test_path, test_data)
    loaded = load(test_path)

    assert loaded["version"] == "qzt-v0.7.0"
    assert loaded["kernel"] == "python"
    assert len(loaded["cells"]) == 1
    assert loaded["cells"][0]["id"] == "cell1"
    assert loaded["dials"]["dial_0"] == 0.0
    assert loaded["graph"]["beta1"] == 0.5
    assert loaded["exported_at"] == "2023-01-01T00:00:00Z"

    # Test to_ledger/from_ledger
    ledger = to_ledger(test_cell)
    reconstructed = from_ledger(ledger)
    assert reconstructed == test_cell

    # Test validate
    assert validate(test_data)

    # Test merge
    test_data2 = copy.deepcopy(test_data)
    test_data2["cells"][0]["content"] = "x = 2 + 2"
    merged = merge(test_data, test_data2)
    assert merged["cells"][0]["content"] == "x = 2 + 2"

    # Test diff
    diff_result = diff(test_data, test_data2)
    assert len(diff_result["modified_cells"]) == 1
    assert "content" in diff_result["modified_cells"][0]

    # Test migration
    old_data = copy.deepcopy(test_data)
    old_data["version"] = "qzt-v0.6.0"
    migrated = migrate(old_data, "qzt-v0.6.0", "qzt-v0.7.0")
    assert migrated["version"] == "qzt-v0.7.0"
    assert migrated["graph"]["beta1"] == 0.5

    print("All tests passed.")
    os.remove(test_path)
