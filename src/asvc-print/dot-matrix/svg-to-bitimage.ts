// sharp's dual ESM/CJS package.json `exports` map resolves to a broken
// `.d.ts` under this project's (pre-existing) classic Node module
// resolution — `import sharp = require('sharp')` type-checks against the
// wrong declaration file and reports the function as not callable. Using
// plain `require` sidesteps the type resolution issue entirely without
// touching the project-wide tsconfig; it's exactly what the `import`
// syntax would compile down to here anyway (module: commonjs).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
import { encodeBitImage } from './escp-image';

// The invoice SVG template is authored at a uniform 120dpi on both axes
// (see invoice-svg-template.ts) so hand-picked coordinates stay visually
// square while writing it. But ESC/P 24-dot bit-image mode's real dot
// geometry is 120dpi horizontal, 180dpi vertical — not square. This
// stretches the rendered raster vertically to that real geometry before
// dithering, rather than baking the distortion into the template's
// coordinates (or ignoring it and letting the printed page come out
// vertically squashed relative to what was designed on screen).
const AUTHOR_DPI = 120;
const FINAL_VERTICAL_DPI = 180;
const VERTICAL_STRETCH = FINAL_VERTICAL_DPI / AUTHOR_DPI;

type DitheredRaster = { width: number; height: number; pixels: Uint8Array };

// A hard 1-bit threshold on small text will always drop some thin strokes
// (a lone "1", a lowercase "l") — a real limitation of a monochrome impact
// printer, not something to fully engineer around here. Biasing the cutoff
// well above the naive midpoint (128) keeps partially-covered anti-aliased
// pixels as ink rather than discarding them, which noticeably helps small
// text survive — the other lever is the template's own font sizes/weights
// (invoice-svg-template.ts), which matter at least as much as this value.
const THRESHOLD = 170;

// Shared by the real print path and the preview path, so a preview shows
// exactly the dithered result that would print — not a full-color
// approximation that could look meaningfully different once thresholded.
async function ditherSvg(svg: string, width: number, authorHeight: number): Promise<DitheredRaster> {
  const finalHeight = Math.round(authorHeight * VERTICAL_STRETCH);

  const { data, info } = await sharp(Buffer.from(svg))
    .resize(width, finalHeight, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .threshold(THRESHOLD)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // sharp's threshold() yields 0 = black, 255 = white; downstream wants
  // non-zero = black, so invert while packing into a 0/1 buffer.
  const pixels = new Uint8Array(info.width * info.height);
  for (let i = 0; i < pixels.length; i++) pixels[i] = data[i] < 128 ? 1 : 0;

  return { width: info.width, height: info.height, pixels };
}

export async function renderSvgToBitImage(svg: string, width: number, authorHeight: number): Promise<Buffer> {
  const raster = await ditherSvg(svg, width, authorHeight);
  return encodeBitImage(raster);
}

// Same dithered raster as the real print path, encoded as a viewable PNG
// instead of ESC/P bytes — for the preview endpoint.
export async function renderSvgToPreviewPng(svg: string, width: number, authorHeight: number): Promise<Buffer> {
  const raster = await ditherSvg(svg, width, authorHeight);
  const bytes = Buffer.from(raster.pixels.map((p) => (p ? 0 : 255)));
  return sharp(bytes, { raw: { width: raster.width, height: raster.height, channels: 1 } })
    .png()
    .toBuffer();
}
