// Decodes an ESC/P byte stream (as produced by DotMatrixInvoiceService)
// back into a plain-text approximation of the printed page. This is the
// "preview" — a dry run that runs the exact same layout logic as a real
// print job but never touches a printer, so an invoice can be checked
// before committing paper/ink to it.
//
// Bit-image bands (the Mode B masthead) aren't text and can't be rendered
// as text — they're marked with a bracketed placeholder instead of being
// decoded pixel-by-pixel. Everything else (labels, the item table, totals)
// is real decoded text, in its real position.
//
// Assumes 10cpi (pica) throughout, which is all either build mode
// currently switches to.

const UNITS_PER_CHAR = 6; // 1/60" units per character at 10cpi (pica)

export function decodeEscpToText(buf: Buffer): string {
  const rows: string[][] = [];
  let row = 0;
  let col = 0;
  let lpi = 6;
  let mastheadMarked = false;

  const ensureRow = (r: number) => {
    while (rows.length <= r) rows.push([]);
    return rows[r];
  };

  const put = (ch: string) => {
    const line = ensureRow(Math.round(row));
    while (line.length <= col) line.push(' ');
    line[col] = ch;
    col++;
  };

  let i = 0;
  while (i < buf.length) {
    const byte = buf[i];

    if (byte === 0x1b) {
      const op = buf[i + 1];

      if (op === 0x40) { i += 2; continue; } // ESC @ — reset
      if (op === 0x50 || op === 0x4d) { i += 2; continue; } // ESC P / ESC M — pitch

      if (op === 0x32) { lpi = 6; i += 2; continue; } // ESC 2 — 6 LPI
      if (op === 0x30) { lpi = 8; i += 2; continue; } // ESC 0 — 8 LPI

      if (op === 0x24) { // ESC $ nL nH — absolute column, 1/60" units
        const units = buf[i + 2] | (buf[i + 3] << 8);
        col = Math.round(units / UNITS_PER_CHAR);
        i += 4;
        continue;
      }

      if (op === 0x4a) { // ESC J n — fine vertical feed, 1/180" units
        const n = buf[i + 2];
        row += n / (180 / lpi);
        i += 3;
        continue;
      }

      if (op === 0x2a) { // ESC * m nL nH data — bit-image band (graphics)
        const width = buf[i + 3] | (buf[i + 4] << 8);
        if (!mastheadMarked) {
          const line = ensureRow(Math.round(row));
          const marker = '[ARTWORK: logo / header graphic]';
          for (let k = 0; k < marker.length; k++) line[k] = marker[k];
          mastheadMarked = true;
        }
        i += 5 + width * 3;
        continue;
      }

      throw new Error(`escp-preview: unhandled ESC op 0x${op.toString(16)} at byte ${i}`);
    }

    if (byte === 0x0d) { col = 0; i++; continue; } // CR
    if (byte === 0x0a) { row = Math.round(row) + 1; i++; continue; } // LF
    if (byte === 0x0c) { i++; continue; } // FF — end of form

    put(String.fromCharCode(byte));
    i++;
  }

  return rows
    .map((line) => line.join('').replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '\n');
}
