#!/usr/bin/env node
/**
 * quilt CLI — the entry point for working with sheets from the terminal.
 *
 * Commands:
 *   quilt init [name]         Scaffold a new sheet
 *   quilt run <sheet>         Run a sheet, watch cells update
 *   quilt serve <sheet>       Serve a sheet (stdio MCP or TUI)
 *   quilt get <sheet> <cell>  Get a cell's value
 *   quilt set <sheet> <cell>  Set a cell's value
 *   quilt test <sheet>        Run cell tests
 *   quilt inspect <sheet>     Show sheet structure
 *
 * The CLI is intentionally minimal — the real power is in the runtime
 * and the embedding surfaces (TUI, MCP, Web).
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { QuiltEngine, parseSheet, type SheetDef } from '@quilt/core';
import { startMcpServer } from '@quilt/mcp';

const HELP = `
quilt — a spreadsheet where every cell is a live, addressable capability

USAGE:
  quilt <command> [args]

COMMANDS:
  init [name]              Scaffold a new sheet
  run <sheet>              Run a sheet, print live cell values
  serve <sheet> [--mcp]    Serve a sheet (TUI by default, --mcp for MCP stdio)
  get <sheet> <cell>       Get a cell's current value
  set <sheet> <cell> <v>   Set a cell's value
  test <sheet>             Run cell tests
  inspect <sheet>          Show sheet structure as a tree
  help                     Show this help

EXAMPLES:
  quilt init my-autopilot
  quilt run examples/boat-autopilot/sheet.yaml
  quilt serve examples/agent-dashboard/sheet.yaml --mcp
  quilt get examples/boat-autopilot/sheet.yaml rudder.command
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      return init(args[1]);
    case 'run':
      return runSheet(args[1]);
    case 'serve':
      return serveSheet(args[1], args.includes('--mcp'));
    case 'get':
      return getCell(args[1], args[2]);
    case 'set':
      return setCell(args[1], args[2], args[3]);
    case 'inspect':
      return inspect(args[1]);
    case 'test':
      return testSheet(args[1]);
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP);
      return;
    default:
      console.error(`unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

async function loadSheet(path: string): Promise<{ engine: QuiltEngine; sheet: SheetDef }> {
  const abs = resolve(path);
  const source = await readFile(abs, 'utf8');
  const sheet = parseSheet(source);
  const engine = new QuiltEngine(sheet.id);
  engine.loadSheet(sheet);
  return { engine, sheet };
}

async function init(name?: string): Promise<void> {
  const projectName = name ?? 'my-quilt-sheet';
  const template = `id: ${projectName}
title: "${projectName}"
description: "A new Quilt sheet"
version: 0.1.0

axes:
  rows: { name: instance }
  cols: { name: capability }

cells:
  - id: hello
    kind: value
    value: "Hello, Quilt!"
    description: "A static value cell"

  - id: greeting
    kind: formula
    expr: "=hello + ' Welcome to the grid.'"
    description: "A formula that depends on hello"

  - id: doubled
    kind: formula
    expr: "=2 * 3"
    description: "Pure computation"
`;

  const fs = await import('node:fs/promises');
  const filename = `${projectName}.quilt.yaml`;
  await fs.writeFile(filename, template, 'utf8');
  console.log(`✓ Scaffolded ${filename}`);
  console.log(`  Run with: quilt run ${filename}`);
  console.log(`  Inspect:  quilt inspect ${filename}`);
}

async function runSheet(path?: string): Promise<void> {
  if (!path) {
    console.error('usage: quilt run <sheet>');
    process.exit(1);
  }
  const { engine, sheet } = await loadSheet(path);
  console.log(`▶ Running sheet: ${sheet.id} (${sheet.title ?? ''})`);
  console.log(`  ${engine.listCells().length} cells loaded.\n`);

  for (const cell of engine.listCells()) {
    try {
      const v = await engine.get(cell.id);
      const symbol = kindSymbol(cell.def.kind);
      const status = v.status === 'ready' ? '✓' : v.status === 'error' ? '✗' : '…';
      const value = formatValue(v.data);
      console.log(`  ${symbol} ${cell.id.padEnd(30)} [${cell.def.kind.padEnd(8)}] ${status} ${value}`);
    } catch (err) {
      console.error(`  ! ${cell.id} failed:`, err);
    }
  }
}

async function serveSheet(path?: string, mcp: boolean = false): Promise<void> {
  if (!path) {
    console.error('usage: quilt serve <sheet> [--mcp]');
    process.exit(1);
  }
  const { engine, sheet } = await loadSheet(path);

  if (mcp) {
    console.error(`[quilt] serving sheet '${sheet.id}' as MCP server on stdio`);
    await startMcpServer(engine, { sheetName: sheet.id });
    return;
  }

  // Default: TUI (basic — full TUI in @quilt/tui)
  console.log(`▶ Serving sheet: ${sheet.id}`);
  console.log('  (TUI mode — install @quilt/tui for the full experience)');
  console.log('  (Use --mcp to expose as MCP server)\n');
  await runSheet(path);
}

async function getCell(path?: string, cellId?: string): Promise<void> {
  if (!path || !cellId) {
    console.error('usage: quilt get <sheet> <cell>');
    process.exit(1);
  }
  const { engine } = await loadSheet(path);
  const v = await engine.get(cellId);
  console.log(JSON.stringify(v, null, 2));
}

async function setCell(path?: string, cellId?: string, value?: string): Promise<void> {
  if (!path || !cellId || value === undefined) {
    console.error('usage: quilt set <sheet> <cell> <value>');
    process.exit(1);
  }
  const { engine } = await loadSheet(path);
  let parsed: unknown = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    // keep as string
  }
  await engine.set(cellId, parsed);
  console.log(`✓ set ${cellId} = ${JSON.stringify(parsed)}`);
}

async function inspect(path?: string): Promise<void> {
  if (!path) {
    console.error('usage: quilt inspect <sheet>');
    process.exit(1);
  }
  const { engine } = await loadSheet(path);
  const cells = engine.listCells();
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Sheet: ${engine.id}`);
  console.log(`Cells: ${cells.length}`);
  console.log(`${'─'.repeat(70)}\n`);

  // Group by kind
  const byKind = new Map<string, typeof cells>();
  for (const cell of cells) {
    if (!byKind.has(cell.def.kind)) byKind.set(cell.def.kind, []);
    byKind.get(cell.def.kind)!.push(cell);
  }

  for (const [kind, group] of byKind) {
    console.log(`[${kind}] (${group.length})`);
    for (const cell of group) {
      const deps = Array.from(cell.dependencies);
      const depStr = deps.length ? ` ← ${deps.join(', ')}` : '';
      const desc = cell.def.description ? ` — ${cell.def.description}` : '';
      console.log(`  ${cell.id}${depStr}${desc}`);
    }
    console.log();
  }
}

async function testSheet(path?: string): Promise<void> {
  if (!path) {
    console.error('usage: quilt test <sheet>');
    process.exit(1);
  }
  const { engine } = await loadSheet(path);
  let passed = 0;
  let failed = 0;
  for (const cell of engine.listCells()) {
    try {
      const v = await engine.get(cell.id);
      if (v.status === 'ready') {
        passed++;
        console.log(`  ✓ ${cell.id}`);
      } else if (v.status === 'error') {
        failed++;
        console.log(`  ✗ ${cell.id}: ${v.error?.message}`);
      } else {
        passed++;
        console.log(`  · ${cell.id} (${v.status})`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${cell.id}: ${msg}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed (${engine.listCells().length} total)`);
  if (failed > 0) process.exit(1);
}

function kindSymbol(kind: string): string {
  switch (kind) {
    case 'value': return '○';
    case 'formula': return 'ƒ';
    case 'api': return '↗';
    case 'program': return '⚙';
    case 'sensor': return '◉';
    case 'listener': return '⚡';
    case 'router': return '⇄';
    case 'io': return '⇆';
    default: return '?';
  }
}

function formatValue(v: unknown): string {
  if (v === undefined) return '∅';
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v.length > 40 ? v.slice(0, 40) + '…' : v}"`;
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 40 ? s.slice(0, 40) + '…' : s;
  }
  return String(v);
}

main().catch((err) => {
  console.error('[quilt] error:', err);
  process.exit(1);
});
