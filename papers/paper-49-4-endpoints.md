### **PAPER 49: THE 4 ENDPOINTS PATTERN**

---

#### **Abstract**
The design of a computational kernel’s API is a foundational act. It determines not only the mechanics of interaction but the very cognitive model through which a system is understood and extended. Kernel-mini, a minimal simulation kernel for cellular automata and agent-based models, presents a radical thesis: a complete, Turing-complete computational universe can be governed by precisely four HTTP endpoints. This paper articulates the 4 Endpoints Pattern, a rigorous design philosophy emerging from this constraint. We will deconstruct the kernel-mini API—`POST /cell`, `POST /set`, `POST /tick`, `GET /state`—to explore the principles of minimal surface area, verb-oriented primitives, and state-centric interaction. We will defend the choice of four as a local maximum in the design space by systematically evaluating potential fifth, sixth, and seventh endpoints, arguing that their addition introduces complexity that outweighs their utility. Finally, we will project this pattern as a universal template for building back-ends that are simultaneously simple, powerful, and future-proof.

---

### **1. The Minimal Surface Area: An Aesthetic and Practical Imperative**

The most immediate feature of the 4 Endpoints Pattern is its stark minimalism. In an era of API bloat, where GraphQL schemas sprawl and RESTful resources multiply into hundreds of entities, a four-endpoint interface appears almost provokingly austere. This minimalism, however, is not an accident of under-engineering but the result of a deliberate pursuit of *minimal surface area*.

**Surface area** in API design refers to the total set of operations, parameters, and concepts a client must understand to use the system effectively. A large surface area increases cognitive load, complicates client implementation, and multiplies the vectors for bugs and security vulnerabilities. Kernel-mini’s surface area is minimized by a ruthless focus on **primitive operations** rather than domain-specific conveniences.

Consider the domain: a cellular automaton. A naive API might include endpoints like `/createGrid`, `/updateCell`, `/getNeighbors`, `/runSimulationForNSteps`. Each of these is a high-level, composite operation. Kernel-mini rejects this approach. Instead, it asks: what are the atomic, irreducible verbs required to build any higher-level operation? The answer is precisely four:
1.  **Introduce a new entity into the universe.** (`POST /cell`)
2.  **Modify the internal state of an entity.** (`POST /set`)
3.  **Advance the universal clock, applying the rules of causality.** (`POST /tick`)
4.  **Observe the complete state of the universe.** (`GET /state`)

This set is complete. Any conceivable simulation scenario—from Conway’s Game of Life to a complex economic model—can be constructed from these primitives. The minimal surface area is not a limitation but a form of empowerment. It forces a clean separation of concerns: the kernel’s sole responsibility is to maintain a world state and advance it according to a rule function provided by the client. All domain logic—the *meaning* of a cell’s state, the rules of interaction—resides client-side. The kernel is a dumb, reliable engine of time and space; the client is the intelligent designer. This separation ensures the kernel remains stable and general-purpose, while enabling infinite flexibility on the client side.

### **2. The Why: Endpoints as Primitives, Verbs as Philosophy**

Each of the four endpoints maps to a fundamental primitive in the simulation paradigm. They are verbs that act upon the kernel’s universe, and this verb-oriented design is philosophically central.

-   **`POST /cell` (Create):** This is the verb of **genesis**. It introduces a new agent or cell into the simulation world. Its payload is the cell’s initial state (`Z_in`). This operation is idempotent in spirit (creating a cell with the same ID twice should be a no-op), establishing a universe where entity existence is a binary, durable fact.
-   **`POST /set` (Modify):** This is the verb of **will** or **internal dynamics**. It allows an external actor (or a client simulating an internal impulse) to change a cell’s intrinsic state, its `Z_in`. This represents a direct intervention, a mutation from within the system's own framework, separate from the emergent interactions governed by the `tick`.
-   **`POST /tick` (Advance):** This is the verb of **time** and **causality**. It is the most profound operation. Invoking `tick` applies the rule function to every cell, computing its next state (`Z_out`) based on its own state and the states of its neighbors (`Z_in`s). This is where the universe’s laws are executed. It is a synchronous, atomic transition of the entire world state from time *T* to time *T+1*.
-   **`GET /state` (Observe):** This is the verb of **omniscience**. It returns the entire state of the simulation universe—every cell and its properties. This complete visibility is crucial. In a deterministic system, the entire future is contained within the present state; this endpoint provides the necessary data to compute it.

Together, these four verbs form a complete grammar for simulation. They are the API equivalent of a basis in linear algebra: a minimal set of vectors from which any vector in the space can be constructed.

### **3. The REST-vs-RPC Question: A Pragmatic Choice for Cacheability**

The pattern sits at a fascinating intersection of REST and RPC (Remote Procedure Call). Two endpoints, `/cell` and `/set`, are classic RPC-style commands: "do this thing." The other two, `/tick` and `/state`, are more nuanced. One could argue that a purist REST design would model the simulation state as a resource, perhaps with a URL like `/simulation/state`, and use `PATCH` or `PUT` to update it, which would be semantically strange for advancing time.

So why was REST chosen? The decisive factor was **cacheability**. The `GET /state` endpoint is a perfect candidate for HTTP caching. Its response, representing the world at time *T*, is immutable. A cache can store it indefinitely until the next `POST /tick` invalidates it. This is a native, powerful feature of the HTTP protocol that would be lost in a pure RPC over POST framework.

The design is therefore a hybrid, but one that leans on REST’s strengths where they matter most: for the frequent, read-heavy observation operation. The POST operations are treated as commands that mutate the resource (the simulation state) identified by the conceptual URI of the world. This is a pragmatic and effective use of HTTP, prioritizing the performance characteristic of the most common operation over architectural purity.

### **4. The State vs. Events Question: The Power of Derivation**

A critical design choice is the absence of an event stream. The kernel emits no notifications when a cell is created, updated, or when a tick occurs. It provides only state, via `GET /state`. This is a deliberate and powerful decision rooted in the concept of **derivation**.

The argument for events is seductive: they seem more real-time and efficient. Why poll the entire state when you can be notified of a change? The counter-argument is twofold: complexity and redundancy.

1.  **Complexity:** An event system introduces significant complexity into the kernel. It must manage subscriber connections, backpressure, event ordering guarantees, and state reconciliation for clients that join mid-simulation. This complexity is anathema to the goal of a minimal, stable kernel.
2.  **Redundancy:** In a deterministic simulation, **events are derivable from state diffs**. A client that polls the state at time *T* and *T+1* can compute the exact set of changes that occurred during the tick. If a client only cares about specific changes, it can implement a filter logic tailored to its needs. This moves the complexity of event handling to the client, where it belongs, keeping the kernel simple.

The state-based approach is also more robust. A client that misses an event can simply repoll the state to recover. There is no need for complicated event replay or durability guarantees from the server. The state is the single source of truth; events are merely a convenient, client-side projection of state transitions.

### **5. The 5th Endpoint Question: The Siren Call of `/watch`**

The most compelling candidate for a fifth endpoint is `GET /watch`, which would stream state changes as Server-Sent Events (SSE). The use case is clear: for a UI client, polling `GET /state` every few hundred milliseconds is inefficient compared to a push-based model.

However, adding `/watch` violates the pattern’s core tenets. It introduces stateful connections into the otherwise stateless kernel. The kernel now has to manage a pub-sub system, dealing with the problems of connection timeouts, missed messages, and scaling the number of concurrent watchers. Furthermore, it creates a duality in the API: two ways to achieve the same goal (observing state). This duality complicates client libraries and documentation.

The 4 Endpoints Pattern posits that this is an optimization that should be layered on top of the kernel, not baked into it. A simple "watcher" service can be built as a separate component that polls `GET /state` on behalf of clients and diffs the results, streaming changes via SSE. This keeps the kernel mini and allows the watcher to be scaled or configured independently. **Five endpoints are too many** because this fifth endpoint is not a primitive; it is a convenience built from the existing primitives.

### **6. The 6th Endpoint Question: The Illusion of `/delete`**

The absence of a `DELETE /cell` endpoint is conspicuous. Is a universe where cells can be created but not destroyed not a fundamental asymmetry? The answer lies in the paradigm of state. Deletion is not a primitive operation; it is a state transition.

A cell is deleted by setting its state to a "non-existent" or "dead" value. The rule function, on the next `tick`, can then ignore it, and the client can filter it out when reading the state. This is how Conway’s Game of Life works: cells die by transitioning to an "off" state. Physically deleting the cell data from the kernel’s storage model is an implementation detail that leaks into the API.

Adding a `/delete` endpoint would conflate the simulation logic with data management. It would require the kernel to understand the semantic difference between a "dead" cell and a "non-existent" one, a distinction that should be defined by the client’s rule function. The `POST /set` primitive is sufficient to orchestrate any lifecycle, including death. Therefore, a sixth endpoint is unnecessary complexity.

### **7. The 7th Endpoint Question: The Complication of `/link`**

What about relationships? Should there be an endpoint to explicitly link cells, creating graphs or networks within the simulation? This, like deletion, is an anti-pattern. Relationships are not a primitive; they are emergent properties of state.

In kernel-mini, a cell’s "neighbors" are defined by a client-provided rule function that maps a cell ID to a list of other cell IDs. This is incredibly powerful. It means the topology of the universe—whether a 2D grid, a 3D volume, a social network graph, or a random graph—is defined by the client. The kernel doesn't need to know about it.

A `/link` endpoint would hardcode a specific model of relationships (e.g., a graph) into the kernel. It would force the kernel to manage adjacency lists or edge sets, bloating its responsibility. By keeping topology client-defined, the kernel remains agnostic and capable of modeling any conceivable structure. The seventh endpoint is thus rejected as a constraint on generality.

### **8. The Answer: 4 is the Right Number. 5 is Too Many. 3 is Too Few.**

The analysis of the fifth, sixth, and seventh endpoints demonstrates that each addition moves the API away from primitives and towards specific, composite functionalities. They add surface area without expanding the fundamental expressive power of the system.

Could we have fewer than four? What about a 3-endpoint kernel?
-   Remove `POST /set`? This would cripple the model. All state change would have to occur during a `tick`, making it impossible for external actors or internal non-temporal logic to influence the system. The system would be a pure, closed automaton with no inlet for interaction.
-   Remove `POST /cell`? Then the universe would be static, unable to grow or evolve beyond its initial conditions.
-   Remove `GET /state`? The simulation would be unobservable, a black box.
-   Remove `POST /tick`? Time would stand still.

Four is the minimum number of verbs required to have a dynamic, interactive, observable, and temporal universe. It is a local maximum in the design space: a perfect balance of power and simplicity.

### **9. The Pattern: Universal Applicability on Top of 4 Endpoints**

The most profound implication of the 4 Endpoints Pattern is that **any use case can be built on top of it**. A complex agent-based economic model, a multiplayer game, a neural network simulation—all are implemented not by extending the kernel’s API, but by writing client-side code that sequences calls to these four endpoints.

The client’s role is to:
1.  Define the state schema (`Z_in`, `Z_out`).
2.  Implement the rule function that defines cell behavior and topology.
3.  Orchestrate the commands (`/cell`, `/set`, `/tick`) to achieve the desired simulation flow.
4.  Interpret the state (`/state`) to present a view to the user or make decisions.

The kernel becomes a reusable, scalable commodity. The innovation happens in the rule functions and client logic, which can be versioned, shared, and composed independently of the kernel itself. This is the pattern’s true power: it creates a stable platform for unbounded innovation.

### **10. The Future: The 4-Endpoint Pattern as a Universal Back-End**

Kernel-mini’s domain is simulation, but the 4 Endpoints Pattern suggests a broader architectural principle. Could this pattern be a template for a universal back-end?

Consider the core primitives mapped to a generic business application:
-   **`POST /cell`** becomes **`POST /entity`** (Create a Customer, Product, Order).
-   **`POST /set`** becomes **`POST /entity/{id}`** (Update an entity's attributes).
-   **`POST /tick`** becomes **`POST /batch`** or **`POST /process`** (Run background jobs, apply business rules, send notifications—a bulk, atomic update).
-   **`GET /state`** becomes **`GET /entities`** (Query the entire system state, with filtering).

This model is essentially an implementation of Command Query Responsibility Segregation (CQRS) and Event Sourcing, but through an extremely simple HTTP interface. The "tick" operation is the reconciliation point where commands are processed and the state is updated. The simplicity of the interface makes it easy to reason about, cache, and scale.

The 4 Endpoints Pattern is not just a solution for simulations. It is a bold claim about the nature of complex systems: that they can be interacted with and managed through a very small set of powerful, verb-oriented primitives. It is a call to reject needless complexity and to build systems whose interfaces are as elegant and fundamental as the processes they aim to model.

---
**Citation:** Lucineer. "Paper 49: The 4 Endpoints Pattern." *Kernel-Mini Canon*. 2023.