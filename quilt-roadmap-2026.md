# Quilt — 5-year roadmap (2026 → 2031)

A speculative document. Not a promise. A direction.

## The thesis

The dominant computing metaphor of the next decade will not be **files**,
**programs**, or **services**. It will be **cells** — reactive, addressable,
composable units of state and behavior that span devices, people, and time.

Quilt is the runtime for that metaphor.

Today, Quilt is a single-file reactive data OS in a browser. By 2031, the
same paradigm, refined, will be running in your car, your kitchen, your
factory, your hospital, your city. The spreadsheet becomes the *thing
itself* — not a metaphor for it.

This document imagines what that looks like, working, in 5 years, and
reverse-engineers the repos that need to exist to get there.

---

## The state in 2031 (the end picture)

It's a Tuesday morning in 2031.

You wake up. The bedside lamp, a Quilt node, is already lit. The cell
`bedside.lamp.brightness` is a formula: `=bedside.lamp.target` where
`target` is a listener that fired when your alarm went off. You don't
*program* the lamp. You edit its cell.

The thermostat cell `living.temp.target` knows you like 68°F at night and
72°F during the day. The heat pump cell `heat.pump.speed` is a formula
that depends on `living.temp.target - living.temp.current`. The whole
HVAC is six cells. They're spread across three devices: the thermostat,
the heat pump, the temperature sensor. They share a Quilt room.

Your phone is a Quilt node. It has 200 cells. Some are personal (your
calendar, your budget, your reading list). Some are mirrored from the
mesh (the temperature in the kitchen, the state of the dryer). All of
them are addressable, all of them are reactive.

You walk to the kitchen. The fridge has a Quilt node. The cell
`fridge.inventory.milk` is currently `0`. The cell
`fridge.suggestion.buy` is a formula: `=fridge.inventory.milk == 0 ? 'milk' : ''`. The
cell `phone.notification.from_kitchen` is a listener that fires when
`fridge.suggestion.buy` changes. Your phone buzzes. The whole flow
spanned three devices, two vendors, and zero cloud services.

You leave the house. The car is a Quilt node. The cell `car.engine.start`
is a value cell. Setting it true is a key turn. The cell
`car.route.eta` is a formula that depends on `traffic.current` and
`route.chosen`. The traffic data comes from a public Quilt mesh — the
city publishes a sheet. The route was chosen by an AI agent cell that
costs less than a cent per query.

The car has 4,000 cells. They were authored as a sheet. The mechanic
reads the sheet when something breaks. The insurance company reads the
sheet when something goes wrong. The software updates are cell-value
changes broadcast over the mesh.

At work, you sit down at a desk. The desk is a Quilt node. It knows the
height you prefer. The monitor is a Quilt node. It knows the brightness
you prefer. The coffee machine is a Quilt node. It knows your order.

The whole world is a sheet. Some cells are on your devices. Some are
on the devices of the people and places around you. Some are public
data from the city, the weather service, the news. Some are private
data locked to a single device. The reactive graph connects them all.

You don't *use* software anymore. You *edit cells*.

---

## The repos

The repos that need to exist for this future to arrive. Some will be
small. Some will be massive. Some will be built by us. Some by others.
All of them are *possible* today, with the right paradigm.

### Today (we already have these)

| Repo | What it is | Status |
| --- | --- | --- |
| [quilt](https://github.com/SuperInstance/quilt) | TypeScript core + TUI + simulator | v0.2.0, shipped |
| [quilt-rust](https://github.com/SuperInstance/quilt-rust) | Rust core + axum web + crossterm TUI | v0.2.0, shipped |
| [quilt-live](https://github.com/SuperInstance/quilt-live) | Single-file browser runtime, 54 examples | v0.2.0, shipped |

### Year 1 (2026) — the substrate

#### [quilt-esp32](https://github.com/SuperInstance/quilt-esp32)

**A Quilt runtime for ESP32-class microcontrollers.**

A `no_std` Rust port of the Quilt engine, with native bindings to the
ESP32 HAL. Sensors are first-class cells (`sensor.temp`, `sensor.moisture`).
Actuators are first-class cells (`actuator.fan`, `actuator.relay`). Formulas
compile to native via a tiny expression interpreter or a Wasm module.

A board plugs in, connects to WiFi, joins a Quilt room, and starts
publishing its cells. A 32KB flash footprint. 8KB RAM. Runs on a $3 chip.

**First release:** a binary that, flashed to an ESP32 dev board, exposes
its on-board temperature sensor and an LED as cells, reachable over
WiFi. The user opens a browser, sees the sheet, edits a value, the LED
changes.

#### [quilt-mesh](https://github.com/SuperInstance/quilt-mesh)

**A broker-less, CRDT-based mesh protocol for Quilt cells.**

A gossip protocol. Each node has a set of cells. Some are private.
Some are shared with a "room". A room is a logical group — your home,
your team, your carpool. The mesh syncs the cells in a room across
all members, even when some are offline.

Conflict resolution is CRDT-based (Yjs-style or Automerge). When two
nodes set a value simultaneously, both writes survive, ordered by
timestamp. When a value is set on one node, every other node in the
room sees it within seconds, on whatever network is available (WiFi,
BLE, LoRa, hardwired).

**First release:** a Rust crate that, given a set of cells and a
peer-to-peer transport, syncs them with eventual consistency. Tested
on a 100-node simulation.

#### [quilt-time](https://github.com/SuperInstance/quilt-time)

**Time-travel for cells.**

Every cell gets a full version history. You can replay any moment in
the past. You can branch the timeline. You can "what if" a change
without it affecting the live state. This is the cell-level equivalent
of git, but at runtime, not at file level.

**First release:** Quilt's per-context cache becomes a per-context
log. The `toJSON` format becomes a time-ordered event stream. A
"time-machine" view in the UI lets you scrub through history.

### Year 2 (2027) — the agent

#### [quilt-agent](https://github.com/SuperInstance/quilt-agent)

**AI agents where every capability is a cell.**

The agent is a sheet. Its memory is a set of value cells. Its tools
are API cells. Its reasoning is a chain of program cells. Its goals
are listener cells. Its conversation history is a value cell that
grows. Its prompt is a formula that depends on the conversation.

Multiple agents share cells. A "research agent" writes to a `findings`
cell; a "writing agent" reads from it. The graph IS the team.

**First release:** a sheet that wraps a single LLM call as a program
cell. The LLM is an `api` cell. The prompt is a value cell. The
response is a value cell. The user edits the prompt, the response
updates. The user adds a tool cell, the agent can now use it.

#### [quilt-packs](https://github.com/SuperInstance/quilt-packs)

**A marketplace of cell packs.**

A "pack" is a bundle of cells with documentation. `weather-pack` ships
50 cells: hourly forecast, daily forecast, alerts, sun position, UV
index, humidity, pressure, wind. `k8s-pack` ships 100 cells: pod
status, deployment state, log tails, metrics. `homeassistant-pack`
ships 200 cells: every entity in your smart home.

**First release:** a CLI that lets you `quilt pack install weather` and
adds the cells to your sheet. A registry at packs.quilt.dev that lists
the official and community packs.

#### [quilt-flow](https://github.com/SuperInstance/quilt-flow)

**A visual editor for sheets.**

Drag a cell from the palette. Drop it on the grid. Drag a wire from
its `out` to another cell's `in`. The wire is the dependency. The
graph is the sheet. Live data flows through the wires. Click a wire
to see its current value. Click a cell to inspect its dependencies.

Like Node-RED, but for the reactive paradigm. Like Scratch, but for
data. Like Blueprint, but for the real world.

**First release:** a web component that renders a sheet as a graph.
Users can drag new cells onto it, wire them up, edit their formulas.
The sheet remains a YAML file — the visual is just an editor.

### Year 3 (2028) — the operating system

#### [quilt-os](https://github.com/SuperInstance/quilt-os)

**A Linux distro where everything is a cell.**

systemd → cells. Cron → listener cells. nginx → API cells. The kernel
logs → output cells. The whole OS is a sheet. The boot process is a
sequence of cell-value-changes. The shutdown is a reverse sequence.
The package manager installs cell packs.

**First release:** a minimal Linux image that boots into a Quilt sheet
showing system state. The user can edit `cpu.governor` from `powersave`
to `performance` by editing a cell, not running a command.

#### [quilt-rooms](https://github.com/SuperInstance/quilt-rooms)

**A physical space is a sheet.**

A "room" is a set of cells that exist in a physical space. When you
walk into a room, your phone joins it. Your cells merge with the
room's cells. When you leave, you take a snapshot.

The home is a room. The office is a room. The car is a room. The
airplane seat is a room. Each one has its own sheet that describes
what's in it, what it can do, what state it's in.

**First release:** a mobile app that detects BLE beacons in a space
and joins the corresponding Quilt room. The user sees the room's
sheet on their phone. They can interact with the room's cells.

### Year 4 (2029) — the wild

#### [quilt-vision](https://github.com/SuperInstance/quilt-vision)

**Cells hold tensors.**

Image cells, video cells, depth cells, point cloud cells. Reactive
computer vision. A camera cell feeds a model cell feeds an alert
cell. The whole pipeline is a sheet.

**First release:** a cell that holds a WebGL texture. A program cell
that runs a YOLO model on it. An alert cell that fires when the model
detects a person. The sheet renders the texture live, with bounding
boxes drawn over the model output.

#### [quilt-music](https://github.com/SuperInstance/quilt-music)

**A full DAW as a sheet.**

Audio cells, MIDI cells, sample cells, track cells, plugin cells.
The mixer is a formula. The mastering chain is a listener. The whole
DAW is a sheet. You can version-control a song as a sheet. You can
fork a song. You can "what if" a different mastering chain.

**First release:** a WebAudio-based sheet where each cell is a node
in a graph. The user wires up a synth → reverb → output. Plays sound.
Saves as a sheet.

#### [quilt-print](https://github.com/SuperInstance/quilt-print)

**Cells drive physical fabrication.**

A 3D printer is a cell. A CNC mill is a cell. A laser cutter is a
cell. The G-code generator is a formula. The print is the value of a
cell. You can pause, branch, and resume a print by editing cells.

**First release:** a sheet that wraps a 3D printer. The `toolpath`
cell is a formula. The `progress` cell is a sensor. The `pause` cell
is a value. The user edits the sheet, the print changes.

#### [quilt-zk](https://github.com/SuperInstance/quilt-zk)

**Zero-knowledge proofs of cell computation.**

Prove that a cell computed a result without revealing the inputs.
Useful for: "the temperature in this room is below 25°C" without
revealing the exact temperature. "My budget is within target" without
revealing the amounts. "My model classified this image as benign"
without revealing the image.

**First release:** a Quilt cell that wraps a ZK proof system. The
cell has a public output and a private witness. The proof is verified
locally before the output is trusted.

### Year 5 (2030 → 2031) — the long bet

#### [quilt-fabric](https://github.com/SuperInstance/quilt-fabric)

**Smart clothing.**

A shirt with woven conductive thread. Each thread segment is a cell.
Body temperature → jacket heat. Posture → haptic feedback. Heart
rate → music tempo. The whole garment is a sheet. You can mix and
match garments. The clothes know each other.

**First release:** a proof-of-concept shirt with three cells: heart
rate, body temp, posture. A sheet that reads them and triggers
haptic feedback on the wrist when posture is bad.

#### [quilt-civic](https://github.com/SuperInstance/quilt-civic)

**A city is a sheet.**

Traffic, weather, power, water, waste, emergency services, civic
services — all cells. The city publishes a sheet. Citizens can read
it. Apps can subscribe to it. The whole city becomes legible as a
single reactive graph.

**First release:** a sheet that publishes a small city's traffic and
weather as cells. The user can build a sheet on top that shows the
shortest walk from home to work considering current traffic.

#### [quilt-energy](https://github.com/SuperInstance/quilt-energy)

**The grid is a sheet.**

Every solar panel, every battery, every load, every transformer is a
cell. The whole grid is reactive. A cloud passes over a panel, the
load shifts. A battery fills, the next cell in the queue charges.
The whole thing is one giant optimization sheet, with millions of
cells, updating in real time.

**First release:** a single-household sheet that balances solar
generation, battery state, and load. A formula chooses whether to
charge the battery or sell to the grid based on the current rate.

---

## The paradigm shifts

Three big shifts happen when Quilt becomes mainstream. None of them are
about technology. All of them are about how people think.

### 1. From files to cells

The file is the unit of persistence. The cell is the unit of
addressability. The file has a name and a path. The cell has an id
and a graph position.

When the unit becomes the cell, the file fades. You don't save
documents. You edit sheets. The sheet is the file. The cell is the
addressable thing inside it. The graph of dependencies between cells
*is* the document structure.

### 2. From programs to graphs

The program is a sequence of instructions. The graph is a network of
dependencies. The program runs once. The graph runs forever.

When the unit becomes the graph, the program fades. You don't write
scripts. You compose cells. The graph is the program. The cell is the
function. The wire is the call.

### 3. From services to rooms

The service is a thing you connect to over the network. The room is
a space you're in. The service is centralized. The room is distributed.

When the unit becomes the room, the service fades. You don't subscribe
to APIs. You join rooms. The room is the API. The cell is the
endpoint. The mesh is the network.

---

## The first 12 months

What we build next, in order:

1. **Month 1: quilt-time** — extend Quilt with full version history. The
   smallest change with the biggest leverage. Makes every other repo
   more powerful.

2. **Month 2: quilt-flow** — the visual editor. The biggest UX unlock.
   Non-coders can finally author Quilt sheets.

3. **Month 3-4: quilt-esp32** — the embedded runtime. The biggest
   category expansion. Opens up IoT, smart home, robotics.

4. **Month 5-6: quilt-mesh** — the mesh protocol. The biggest
   architecture shift. From "single engine" to "distributed graph".

5. **Month 7-8: quilt-rooms** — the room abstraction. Built on top of
   quilt-mesh. The killer app for the home.

6. **Month 9-10: quilt-agent** — agents as sheets. The biggest AI
   unlock. Agents become composable.

7. **Month 11: quilt-packs** — the marketplace. The biggest community
   unlock. The ecosystem becomes self-reinforcing.

8. **Month 12: quilt-os** — the OS. The biggest platform unlock. Quilt
   becomes the substrate, not the app.

After year 1, the community takes over. The wild ideas (quilt-vision,
quilt-music, quilt-fabric, quilt-civic, quilt-energy) emerge from
people we don't know yet, building on the substrate we built.

---

## The closer

Quilt today is a single HTML file. A grid. A list of cells. A reactive
engine. A handful of examples.

Quilt in 5 years is the runtime for the world.

The distance between these two things is not a technology problem. The
engine already works. The cells already compose. The graph already
reacts. The only thing missing is the realization that the cell is
the right unit, and the willingness to keep building until the world
sees it too.

The repos above are not predictions. They are decisions. We can
choose to build them. We can choose to refine the paradigm until it's
strong enough to support them. We can choose to make the spreadsheet
the *thing itself*.

The world is a sheet. Let's edit it.
