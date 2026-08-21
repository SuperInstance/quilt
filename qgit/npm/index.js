// qgit — Quilt-Git: a git-native Quilt protocol.
// A cell is a git commit. A room is a git branch. An agent is a git hook.

const { simpleGit } = require('simple-git');
const fs = require('fs');
const path = require('path');

const PROTOCOL = 'qgit/0.6.0';
const CELL_CONVENTION = 'cells/<id>/state.json';
const ROOM_CONVENTION = 'room/<name>';

// 8 Quilt primitives
const PRIMITIVES = ['Z_in', 'Z_out', 'JEPA', 'DoubleEntry', 'Vibe', 'GC', 'Murmur', 'Graph'];

function makeEmptyCell(id, kind) {
  return {
    id,
    kind,
    tick: 0,
    z_in: {},
    z_out: {},
    jepa_surprise: 0.0,
    double_entry: { gamma: 0.5, eta: 0.5 },
    vibe: { position: 0, velocity: 0, acceleration: 0 },
    gc: { phase: 'ready', cycles: 0 },
    murmur: { subscriptions: [], gossip_count: 0 },
    graph: { parents: [], children: [] },
  };
}

class Qgit {
  constructor(repoPath = '.') {
    this.repoPath = path.resolve(repoPath);
    this.git = simpleGit(this.repoPath);
  }

  async init() {
    if (!fs.existsSync(this.repoPath)) {
      fs.mkdirSync(this.repoPath, { recursive: true });
    }
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      await this.git.init(false, '-b', 'main');
    }
    await this.git.addConfig('user.email', 'quilt@superinstance.dev');
    await this.git.addConfig('user.name', 'Quilt-Git');
    fs.mkdirSync(path.join(this.repoPath, 'cells'), { recursive: true });
    fs.mkdirSync(path.join(this.repoPath, 'rooms'), { recursive: true });
    const config = {
      protocol: PROTOCOL,
      cell_convention: CELL_CONVENTION,
      room_convention: ROOM_CONVENTION,
      primitives: PRIMITIVES,
    };
    fs.writeFileSync(
      path.join(this.repoPath, '.qgit.json'),
      JSON.stringify(config, null, 2)
    );
    await this.git.add('.qgit.json');
    await this.git.add('cells/');
    await this.git.add('rooms/');
    await this.git.commit('qgit: init | Graph | {cells: 0, edges: 0}');
    return config;
  }

  async addCell(id, kind = 'cell') {
    const cellDir = path.join(this.repoPath, 'cells', id);
    fs.mkdirSync(cellDir, { recursive: true });
    const state = makeEmptyCell(id, kind);
    fs.writeFileSync(
      path.join(cellDir, 'state.json'),
      JSON.stringify(state, null, 2)
    );
    await this.git.add(`cells/${id}/`);
    await this.git.commit(`cell: ${id} | Z_in | spawn:${kind}`);
    return state;
  }

  async tickCell(id) {
    const stateFile = path.join(this.repoPath, 'cells', id, 'state.json');
    if (!fs.existsSync(stateFile)) throw new Error(`Cell ${id} not found`);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    state.tick += 1;
    state.vibe.velocity += state.vibe.acceleration;
    state.vibe.position += state.vibe.velocity;
    state.vibe.velocity *= 0.99;
    state.murmur.gossip_count += 1;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    await this.git.add(`cells/${id}/`);
    await this.git.commit(`cell: ${id} | Vibe | tick:${state.tick}`);
    return state;
  }

  async createRoom(name) {
    const branch = `room/${name}`;
    await this.git.checkoutLocalBranch(branch);
    fs.mkdirSync(path.join(this.repoPath, 'rooms'), { recursive: true });
    const room = {
      name,
      created: Date.now(),
      cells: [],
      beta_1: 0,
    };
    fs.writeFileSync(
      path.join(this.repoPath, 'rooms', `${name}.json`),
      JSON.stringify(room, null, 2)
    );
    await this.git.add(`rooms/${name}.json`);
    await this.git.commit(`room: ${name} | spawn | empty`);
    return room;
  }

  async enterRoom(name) {
    await this.git.checkout(`room/${name}`);
  }

  async listRooms() {
    const summary = await this.git.branch(['-a']);
    return summary.all.filter(b => b.startsWith('room/'));
  }

  async listCells() {
    const cellsDir = path.join(this.repoPath, 'cells');
    if (!fs.existsSync(cellsDir)) return [];
    return fs.readdirSync(cellsDir)
      .filter(f => fs.statSync(path.join(cellsDir, f)).isDirectory());
  }

  async status() {
    const cells = await this.listCells();
    const rooms = await this.listRooms();
    const log = await this.git.log({ n: 10 });
    return {
      protocol: PROTOCOL,
      cells: cells.length,
      rooms: rooms.length,
      recent_commits: log.all.map(c => c.message),
    };
  }
}

module.exports = { Qgit, PROTOCOL, PRIMITIVES, makeEmptyCell };
