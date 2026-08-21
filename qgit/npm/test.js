const { Qgit, PROTOCOL, makeEmptyCell } = require('./src/index.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use a temp dir
const tmpDir = path.join(os.tmpdir(), 'qgit-test-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

(async () => {
  const q = new Qgit(tmpDir);
  await q.init();
  console.log('✓ init');
  await q.addCell('a', 'number');
  console.log('✓ add cell a');
  await q.addCell('b', 'string');
  console.log('✓ add cell b');
  await q.tickCell('a');
  console.log('✓ tick a');
  await q.createRoom('alpha');
  console.log('✓ create room alpha');
  const status = await q.status();
  console.log('✓ status:', status.cells, 'cells,', status.rooms, 'rooms');
  fs.rmSync(tmpDir, { recursive: true });
  console.log('All tests passed!');
})();
