// Byte-level ESC/P helpers. No template engine, no layout math beyond what a
// caller passes in — deliberately dumb so the calibration config in
// invoice-field-map.ts stays the only thing that needs tuning against real
// hardware. See the dot-matrix invoice guide for the command reference.

export class EscpBuilder {
  private chunks: Buffer[] = [];

  reset() {
    return this.raw([0x1b, 0x40]); // ESC @
  }

  pica() {
    return this.raw([0x1b, 0x50]); // ESC P — 10 cpi
  }

  elite() {
    return this.raw([0x1b, 0x4d]); // ESC M — 12 cpi
  }

  lpi6() {
    return this.raw([0x1b, 0x32]); // ESC 2 — 1/6" line spacing
  }

  lpi8() {
    return this.raw([0x1b, 0x30]); // ESC 0 — 1/8" line spacing
  }

  // Absolute horizontal position, in 1/60" units (ESC $ nL nH).
  column(units: number) {
    const nL = units & 0xff;
    const nH = (units >> 8) & 0xff;
    return this.raw([0x1b, 0x24, nL, nH]);
  }

  // Fine vertical nudge, in 1/180" units (ESC J n) — lands inside a row
  // without committing to a full line feed.
  microFeed(n: number) {
    return this.raw([0x1b, 0x4a, n & 0xff]);
  }

  text(s: string) {
    this.chunks.push(Buffer.from(s, 'ascii'));
    return this;
  }

  cr() {
    return this.raw([0x0d]);
  }

  lf() {
    return this.raw([0x0a]);
  }

  formFeed() {
    return this.raw([0x0c]);
  }

  // Put `text` at an exact column on the current line, then advance one line.
  field(colUnits: number, text: string) {
    return this.column(colUnits).text(text).cr().lf();
  }

  // Advance to a specific line number from the current top-of-form, given
  // the active lines-per-inch. Only ever moves forward — ESC/P has no
  // reverse line feed on plain-paper (non-tractor) impact printers.
  advanceToRow(currentLine: number, targetLine: number) {
    const linesToFeed = targetLine - currentLine;
    for (let i = 0; i < linesToFeed; i++) this.lf();
    return this;
  }

  // Splices in bytes already assembled elsewhere — e.g. a pre-baked
  // bit-image buffer from escp-image.ts — without reinterpreting them.
  raw(bytes: number[] | Buffer) {
    this.chunks.push(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.chunks);
  }
}
