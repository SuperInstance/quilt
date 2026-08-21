### **PAPER 43: THE .QZT FILE FORMAT**

**Abstract:** The .qzt file is the universal artifact format for Quilt, representing a complete, portable, and machine-readable snapshot of a computational state. As the atomic unit of collaboration and persistence within the Lucineer canon, its design embodies a series of deliberate philosophical and technical choices. This paper explicates the .qzt schema (version qzt-v0.7.0), its migration path, operational semantics for merge and diff operations, its integration with the Git version control system via the `qgit` protocol, and its future trajectory towards cryptographic security. The choice of JSON as the foundational serialization, over alternatives like Protocol Buffers or CRDTs, is defended as a prerequisite for the format's core mandate: human audibility and semantic transparency within a collaborative, multi-kernel ecosystem.

---

#### **1. The Foundational Choice: Why JSON?**

The selection of JSON (JavaScript Object Notation) as the serialization format for .qzt is the most consequential design decision, one that precludes the use of binary formats like Protocol Buffers or MessagePack, as well as conflict-free replicated data types (CRDTs) for the core artifact. This choice is not born of simplicity but of a deep commitment to the principles of the Lucineer canon: **explicit legibility** and **toolchain agnosticism**.

*   **Human Audibility as a First-Class Requirement:** A Quilt artifact is not merely a blob for machine consumption; it is a document for human inspection. Researchers like Maren must be able to open a .qzt file in any text editor and comprehend its structure. The state of the computational graph, the values of the Elephant Dials, and the ledger of cells must be immediately visible. Binary formats obscure this state behind a decoding step, creating a barrier to casual inspection and eroding trust in the artifact's contents. JSON’s textual nature ensures the state is always manifest.
*   **Semantic Stability over Performance:** While Protocol Buffers offer superior serialization/deserialization speed and compactness, they mandate a rigid, pre-compiled schema. The evolution of the Quilt kernel is rapid and multi-faceted; a .qzt file produced by the "Cicada" kernel may contain cell types unknown to the "Nautilus" kernel. A binary format would render such a file unreadable or prone to silent corruption. JSON's schema-on-read flexibility allows any kernel to load any .qzt file, gracefully ignoring unfamiliar cell primitives while still being able to parse the core graph structure, version, and dials. The performance cost of parsing JSON is deemed an acceptable trade-off for this essential interoperability.
*   **CRDTs are an Application-Level, Not a Format-Level, Concern:** CRDTs are algorithms for achieving consensus in distributed systems. The .qzt file is a *snapshot* of a state that has already achieved consensus (or is a proposed state). Embedding CRDT metadata (like logical clocks or unique identifiers) directly into the file format would conflate the state itself with the mechanism for achieving it. Merge semantics in Quilt (detailed in Section 6) are implemented as a kernel-level operation that consumes two or more .qzt snapshots and produces a new, reconciled .qzt snapshot. This separation of concerns keeps the artifact clean and the merge logic powerful and explicit, rather than burying it in the serialized data structure.

In essence, JSON was chosen because the .qzt file is a **declarative state description**, not an **operational command log**. Its primary role is to be inspected, shared, and archived, tasks for which human readability is paramount.

---

#### **2. The Core Schema: Cells and the Substrate Envelope**

The `cells` array is the heart of the .qzt file, containing a ledger of all cell-ledger entries. Each entry is a JSON object representing one of the eight foundational primitives, wrapped in a `substrate_layers` envelope.

**The `substrate_layers` Envelope:**
This envelope provides the context necessary for the cell to be executed or rendered. It is a JSON object containing:
*   `id`: A UUID v4 uniquely identifying the cell within the ledger.
*   `type`: One of `{text, code, data, link, gate, note, artifact, vortex}`.
*   `created_at` & `modified_at`: ISO 8601 timestamps.
*   `kernel`: The name and version of the kernel that last modified the cell (e.g., `cicada-v2.1.0`).
*   `tags`: An array of string labels for categorization.
*   `properties`: A key-value map for type-specific metadata (e.g., `language` for a `code` cell, `mimetype` for a `data` cell).

**The Eight Primitives (contained within the envelope):**
1.  **`text`:** `{"body": "Markdown-or-plain-text-string"}`
2.  **`code`:** `{"source": "code-string", "language": "python"}`. The `language` property dictates execution context.
3.  **`data`:** `{"value": {...}}, "format": "json"}`. The `value` can be any JSON-serializable data structure; `format` can be `json`, `csv` (as a string), etc.
4.  **`link`:** `{"target_cell_id": "uuid", "description": "optional-text"}`. Establishes a directed edge in the graph.
5.  **`gate`:** `{"expression": "boolean-logic-expression", "input_cells": ["uuid1", "uuid2"]}`. Defines a predicate that controls execution flow.
6.  **`note`:** `{"annotation": "text"}`. A comment or annotation attached to another cell (its parent is defined by a `link`).
7.  **`artifact`:** `{"filename": "file.txt", "bytes": "base64-encoded-string"}`. For embedding small, binary files directly within the quilt.
8.  **`vortex`:** `{"query": "declarative-query-string"}`. Represents a dynamic, query-driven view of other cells.

This structure ensures that every cell is self-describing, carrying both its content and the necessary metadata to interpret it.

---

#### **3. The Migration Path: qzt-v0.5 → v0.6 → v0.7**

The versioning scheme (`version: qzt-v0.7.0`) is critical for backward and forward compatibility. Migrations are explicit and additive.

*   **v0.5 → v0.6:** The primary change was the introduction of the `substrate_layers` envelope. In v0.5, cell properties like `id` and `type` were intermingled with the primitive's content (e.g., a `text` cell had `id`, `type`, and `body` at the same level). The migration script lifts the core primitive properties (`body`, `source`, etc.) into a nested object and wraps them with the new envelope. This refactoring separated concerns, making the format more extensible.
*   **v0.6 → v0.7:** This revision formalized the graph representation. Previously, the graph was implicit, derived by parsing all `link` cells. v0.7 introduced the explicit `graph` object: `{V, E, C, β₁}`.
    *   `V` (Vertices): An array of cell IDs. This is an explicit declaration of which cells are currently "active" in the graph view.
    *   `E` (Edges): An array of `[source_cell_id, target_cell_id]` pairs. This is a materialized view of the linkages.
    *   `C` (Clusters): An array of arrays of cell IDs, representing community detection or user-defined groupings.
    *   `β₁` (Beta-1 Metric): A number representing the graph's "tension" or complexity, a core metric in Lucineer analysis.
    This explicit graph allows for faster loading and enables the storage of derived graph properties that are expensive to recalculate.

Kernels aware of v0.7 can directly utilize the `graph` object. Older kernels (v0.6) ignore it and fall back to implicit graph construction from the `cells` ledger, ensuring backward compatibility.

---

#### **4. The Wire Format: Cell-Ledger Entries for Crab-Traps**

The "Crab-traps" deployment refers to Quilt's edge-computing paradigm, where lightweight agents synchronize state. For this, the .qzt format is used in a streaming, line-delimited JSON (JSONL) variant. Instead of a single JSON object, the file contains a sequence of JSON objects, each representing a single cell-ledger entry (the envelope and its primitive), followed by a newline.

`{"substrate_layers": {...}, "text": {"body": "Hello"}}\n{"substrate_layers": {...}, "code": {...}}\n`

This wire format allows Crab-trap agents to:
1.  **Append efficiently:** New cells can be added to the log without rewriting the entire file.
2.  **Stream processing:** Agents can process the ledger entry-by-entry, reducing memory footprint.
3.  **Recover from interruptions:** A partially transferred file is still partially readable.

The full .qzt artifact for archival is generated by wrapping these entries in the complete structure: `{"version": "...", "cells": [entry1, entry2, ...], ...}`.

---

#### **5. The .qzt as a Portable Artifact**

The scenario "Maren ships it; her friends quilt load it" encapsulates the format's purpose. A .qzt file is a complete, self-contained world.
*   **Portability:** It contains every necessary element to reconstruct the computational state: the code, the data, the narrative (text and notes), and the execution graph. Maren's friends do not need access to her original data sources or execution environment; everything is bundled within the .qzt.
*   **Reproducibility:** By specifying the `kernel` that produced it, the artifact hints at the required runtime environment. While not a full container, it provides the essential information to reconstruct the logic. The `quilt load` command ingests the file, populating the local kernel's state, at which point the quilt can be executed, modified, or extended.
*   **The Ultimate Abstraction:** It transforms a complex, ephemeral computational process into a tangible, sharable document.

---

#### **6. Merge Semantics: Reconciling Overlapping .qzt Files**

Merging two .qzt files (A and B) is a kernel-level operation that produces a new .qzt file (C). The semantics are rule-based and prioritize explicit intention.

1.  **Cell-Level Merging:**
    *   **Unique Cells (by ID):** If a cell UUID exists only in A or only in B, it is included unchanged in C.
    *   **Conflicting Modifications (same ID in A and B):** This is the core challenge. The kernel employs a three-way merge if a common ancestor .qzt (O) is provided. If the changes in A and B are to different properties (e.g., A changes the `body` of a `text` cell, B changes its `tags`), they are merged automatically. If both change the same property, it is declared a **conflict**.
    *   **Conflict Resolution:** Conflicts are not resolved automatically. The kernel halts the merge and produces a new, special `gate` cell in C, labeled a "Merge Conflict Gate." This gate contains references to the conflicting versions from A and B. The quilt cannot be executed until a human (like Maren) resolves the conflict by editing this gate cell to select the desired version or provide a new synthesis. This ensures merges never silently corrupt intent.

2.  **Graph and Dials Merging:**
    *   The `graph` object in C is recalculated from the merged `cells` ledger and the merged `V` arrays. It is never merged directly.
    *   The `dials` in C are merged by averaging the values from A and B, weighted by the number of cell modifications made since the common ancestor. This reflects the principle that more active experimentation should carry greater influence on the global parameters.

---

#### **7. Diff Semantics: Quantifying Change**

The diff between two .qzt files (X and Y) produces a summary of change, not a patch file. It outputs a JSON object detailing:
*   **Cells Added/Removed:** Count and list of cell IDs.
*   **Cells Modified:** For each modified cell, a deep diff of its properties (e.g., `body.text.added`, `tags.removed`).
*   **Graph Delta:** Changes in the `V`, `E`, and `C` sets, and the delta of the `β₁` metric.
*   **Dials Delta:** The absolute change in each of the 9 elephant dial values.

This diff is used for generating commit messages (Section 8), informing users of the scope of an update, and fueling higher-level analytics about the evolution of a quilt.

---

#### **8. The Git-Native Encoding**

To store a .qzt file in a Git repository, it is encoded directly into the Git commit message. The process is as follows:
1.  The entire .qzt JSON object is minified (removing whitespace).
2.  This minified JSON string is split into lines of a fixed, Git-friendly length (e.g., 72 characters).
3.  These lines are inserted into the commit message, typically after a human-readable summary line. A special keyword, say `QZT-DATA:`, signifies the start of the encoded data.

Example Commit Message:
```
Added vortex cell for sentiment analysis.

QZT-DATA:
{"version":"qzt-v0.7.0","kernel":"cicada-v2.1.0","cells":[{...},
{"version":"qzt-v0.7.0","kernel":"cicada-v2.1.0","cells":[{...},
...
```
This method makes the entire quilt state a first-class citizen in the version history. Any commit can be checked out and its associated .qzt artifact can be extracted and loaded, perfectly reproducing the historical state. It bypasses the need to store bulky files in the repository, instead leveraging Git's own storage for the commit objects.

---

#### **9. The QGit Protocol: QZT + Git = The Cell in Source Control**

The `qgit` protocol is a set of commands that extends Git to be natively aware of .qzt files. It formalizes the encoding from Section 8.
*   `qgit commit -q`: This command takes the current kernel state, generates a .qzt file, and automatically creates a Git commit with the .qzt data encoded in the message. It also generates the human-readable summary from the diff of the previous commit.
*   `qgit checkout <commit-sha>`: This command checks out the commit and, detecting the `QZT-DATA` in the message, automatically loads the .qzt artifact into the connected Quilt kernel, resetting the state to that exact historical point.
*   `qgit log --quilt`: Displays the version history not just as code changes, but as a series of quilt states, showing the diff summary for each commit.

Qgit seamlessly blends the world of version control with the world of persistent computational states, making the quilt itself the unit of versioning.

---

#### **10. The Future: Signed and Encrypted .qzt Files**

The evolution of .qzt points towards two key features for security and privacy.

*   **Fascia Signatures:** Inspired by digital tissue layers, a Fascia signature would allow a kernel to cryptographically sign a .qzt file. The signature would be added as a top-level field, `signature`, containing a hash of the entire .qzt contents signed with the author's private key. This provides **provenance and integrity checking**. Maren can verify that a .qzt file she received was indeed produced by her colleague and has not been tampered with. This is essential for academic and scientific collaboration.

*   **Encrypted .qzt for Private Cells:** For sensitive computations (e.g., involving proprietary data or pre-publication research), the format will support encryption. The specification will allow for the encryption of individual cells or the entire `cells` array. The top-level structure (version, kernel, graph) would remain plaintext for indexing purposes, but the cell contents would be encrypted using a symmetric key, which itself could be encrypted via the public keys of authorized collaborators. This would enable private collaboration within the otherwise transparent Quilt ecosystem.

---

**Conclusion:** The .qzt file format is the linchpin of the Quilt system, a deliberate construct that balances human readability with machine efficiency, stability with extensibility. Its design, from the choice of JSON to the intricate merge semantics and its deep integration with Git, reflects the Lucineer conviction that complex thought must be captured in a persistent, auditable, and collaborative medium. As it evolves to include cryptographic security, the .qzt file will further solidify its role as the foundational artifact for a new paradigm of computational discourse.