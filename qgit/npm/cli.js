#!/usr/bin/env node
// qgit CLI
const { Qgit } = require('./index.js');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`qgit — Quilt-Git: a git-native Quilt protocol.

Usage:
  qgit init                    # init a quilt repo
  qgit cell add <id> <kind>    # add a cell
  qgit cell tick <id>          # tick a cell (commit)
  qgit cell list               # list cells
  qgit room create <name>      # create a room (branch)
  qgit room enter <name>       # enter a room
  qgit room list               # list rooms
  qgit status                  # show status
`);
    return;
  }
  const cmd = args[0];
  const rest = args.slice(1);
  const q = new Qgit(process.cwd());
  try {
    if (cmd === 'init') {
      const cfg = await q.init();
      console.log(`qgit ${cfg.protocol} initialized at ${process.cwd()}`);
    } else if (cmd === 'cell') {
      const sub = rest[0];
      if (sub === 'add') await q.addCell(rest[1], rest[2] || 'cell');
      else if (sub === 'tick') await q.tickCell(rest[1]);
      else if (sub === 'list') {
        const cells = await q.listCells();
        for (const c of cells) console.log(`  ${c}`);
      }
    } else if (cmd === 'room') {
      const sub = rest[0];
      if (sub === 'create') await q.createRoom(rest[1]);
      else if (sub === 'enter') await q.enterRoom(rest[1]);
      else if (sub === 'list') {
        const rooms = await q.listRooms();
        for (const r of rooms) console.log(`  ${r}`);
      }
    } else if (cmd === 'status') {
      const s = await q.status();
      console.log(`qgit ${s.protocol}`);
      console.log(`  cells: ${s.cells}, rooms: ${s.rooms}`);
      console.log(`  recent:`);
      for (const c of s.recent_commits) console.log(`    ${c}`);
    } else {
      console.log(`Unknown: ${cmd}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
