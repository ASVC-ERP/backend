// One-off asset build: renders the Mode B invoice masthead (title + the
// real "Autosync Ventures Corp." logo/header block, matching the text
// already hardcoded in asvc-print.controller.ts's generate_dr_a) as SVG,
// rasterizes it with sharp, thresholds it to 1-bit monochrome, and packs it
// into ESC/P bit-image commands.
//
// This is the ONLY static, non-interleaved region of the invoice: nothing
// variable is ever printed over or below it in the same forward pass, so
// it's the one part of the layout that can be a single pre-baked bitmap.
// Everything below it (labels, item grid, totals, footer) has to be plain
// ESC/P text, forward-interleaved with the variable data.
//
// Re-run whenever the masthead design or company header text changes:
//   node scripts/build-invoice-masthead.js
//
// Requires a fresh `nest build` first (reads compiled escp-image.js).
// Writes:
//   assets/dot-matrix/invoice-masthead.bin        (ESC/P bytes)
//   assets/dot-matrix/invoice-masthead.meta.json  (dimensions + lines consumed)

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  encodeBitImage,
  linesConsumed,
} = require('../dist/asvc-print/dot-matrix/escp-image');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const OUT_DIR = path.join(ASSETS_DIR, 'dot-matrix');

const WIDTH = 960; // 8" printable width at 120 dpi (ESC * 33 horizontal resolution)
const HEIGHT = 240; // 1.33" tall at 180 dpi (ESC * 33 dot pitch) — 10 bands of 24, exactly 8 lines at 6 LPI
const LPI = 6;

async function main() {
  const logoPath = path.join(ASSETS_DIR, 'logo_nobg.png');
  const logoDataUri = `data:image/png;base64,${fs
    .readFileSync(logoPath)
    .toString('base64')}`;

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"
         xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      <text x="20" y="58" font-family="Arial, sans-serif" font-weight="700" font-size="40" fill="#000000">INVOICE</text>
      <image x="520" y="12" width="110" height="62" href="${logoDataUri}" xlink:href="${logoDataUri}"/>
      <text x="640" y="40" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#000000">Autosync Ventures Corp.</text>
      <text x="640" y="55" font-family="Arial, sans-serif" font-size="8" fill="#000000">Unit 207, 210 Speaker Perez St., Corner Del Monte Ave, Quezon City</text>
      <text x="640" y="67" font-family="Arial, sans-serif" font-size="8" fill="#000000">VAT Reg. TIN: 682-408-625-00000</text>
    </svg>
  `;

  const { data, info } = await sharp(Buffer.from(svg))
    .flatten({ background: '#ffffff' })
    .greyscale()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== WIDTH || info.height !== HEIGHT) {
    throw new Error(
      `Rendered masthead is ${info.width}x${info.height}, expected ${WIDTH}x${HEIGHT}`,
    );
  }

  // sharp's threshold() yields 0 = black, 255 = white; escp-image wants
  // non-zero = black, so invert while packing into a 0/1 buffer.
  const pixels = new Uint8Array(info.width * info.height);
  for (let i = 0; i < pixels.length; i++) pixels[i] = data[i] < 128 ? 1 : 0;

  const escp = encodeBitImage({ width: info.width, height: info.height, pixels });
  const lines = linesConsumed(info.height, LPI);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'invoice-masthead.bin'), escp);
  fs.writeFileSync(
    path.join(OUT_DIR, 'invoice-masthead.meta.json'),
    JSON.stringify(
      { widthDots: info.width, heightDots: info.height, lpi: LPI, linesConsumed: lines },
      null,
      2,
    ),
  );

  console.log(
    `Wrote invoice-masthead.bin (${escp.length} bytes), consumes ${lines} lines at ${LPI} LPI.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
