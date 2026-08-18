//! # input.ts
//!
//! Read keystrokes from stdin one at a time. We use raw mode
//! (the terminal doesn't line-buffer input) and parse the
//! resulting bytes into `TuiKey` events.
//!
//! ## Why not readline / blessed
//!
//! - `readline` line-buffers; we need keystroke-level control.
//! - `blessed` is a full TUI framework; we want a focused tool.
//!
//! Raw mode is set with `process.stdin.setRawMode(true)`. We
//! restore it on exit. We also handle the special escape
//! sequences for arrow keys, Home, End, etc.
//!
//! ## Quit handling
//!
//! When the user presses `q` (or `Ctrl+C`), we want to cleanly
//! restore the terminal. The TUI exposes a `shutdown()` function
//! that the caller is expected to run on exit.

import { EventEmitter } from 'node:events';

/** The keys we care about. Everything else is ignored. */
export type TuiKey =
  | { type: 'char'; char: string }
  | { type: 'enter' }
  | { type: 'escape' }
  | { type: 'backspace' }
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'home' }
  | { type: 'end' }
  | { type: 'pageup' }
  | { type: 'pagedown' }
  | { type: 'ctrl'; char: string };

/** A reader that turns stdin bytes into `TuiKey` events. */
export class KeyReader extends EventEmitter {
  private raw: boolean = false;

  /** Begin reading keys. Call this once at startup. */
  start(): void {
    if (!process.stdin.isTTY) {
      // Not a TTY — we can't go into raw mode. Emit a warning
      // and let the caller decide what to do (typically: run in
      // "headless" mode and just dump state once).
      this.emit('error', new Error('stdin is not a TTY — TUI will not be interactive'));
      return;
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    this.raw = true;

    process.stdin.on('data', (chunk: string) => this.handleChunk(chunk));
  }

  /** Restore the terminal. Call this on exit. */
  shutdown(): void {
    if (this.raw) {
      process.stdin.setRawMode(false);
      this.raw = false;
    }
  }

  private handleChunk(chunk: string): void {
    // CSI sequences (arrow keys, etc.) start with ESC [
    if (chunk === '\x1b') {
      // Could be a bare ESC or the start of a sequence. Buffer
      // briefly to disambiguate. For MVP we treat bare ESC as
      // escape and ESC [ as the start of a CSI.
      this.emit('key', { type: 'escape' } satisfies TuiKey);
      return;
    }
    if (chunk.startsWith('\x1b[')) {
      this.handleCsi(chunk);
      return;
    }
    if (chunk === '\r' || chunk === '\n') {
      this.emit('key', { type: 'enter' } satisfies TuiKey);
      return;
    }
    if (chunk === '\x7f' || chunk === '\b') {
      this.emit('key', { type: 'backspace' } satisfies TuiKey);
      return;
    }
    if (chunk === '\x03') {
      // Ctrl+C — treat as quit.
      this.emit('key', { type: 'ctrl', char: 'c' } satisfies TuiKey);
      return;
    }
    if (chunk.length === 1) {
      this.emit('key', { type: 'char', char: chunk } satisfies TuiKey);
      return;
    }
    // Multi-char chunk — emit each char.
    for (const c of chunk) {
      this.emit('key', { type: 'char', char: c } satisfies TuiKey);
    }
  }

  private handleCsi(chunk: string): void {
    // We only care about a small subset: A=up, B=down, C=right,
    // D=left, H=home, F=end, 5~=pageup, 6~=pagedown.
    if (chunk === '\x1b[A') this.emit('key', { type: 'up' } satisfies TuiKey);
    else if (chunk === '\x1b[B') this.emit('key', { type: 'down' } satisfies TuiKey);
    else if (chunk === '\x1b[C') this.emit('key', { type: 'right' } satisfies TuiKey);
    else if (chunk === '\x1b[D') this.emit('key', { type: 'left' } satisfies TuiKey);
    else if (chunk === '\x1b[H') this.emit('key', { type: 'home' } satisfies TuiKey);
    else if (chunk === '\x1b[F') this.emit('key', { type: 'end' } satisfies TuiKey);
    else if (chunk === '\x1b[5~') this.emit('key', { type: 'pageup' } satisfies TuiKey);
    else if (chunk === '\x1b[6~') this.emit('key', { type: 'pagedown' } satisfies TuiKey);
  }
}
