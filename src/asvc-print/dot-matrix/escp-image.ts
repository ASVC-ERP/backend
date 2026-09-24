import { EscpBuilder } from './escp-builder';

// ESC/P 24-dot double-density bit image (ESC * 33), the standard way to put
// a graphic on an ESC/P dot-matrix printer. Bands of 24 vertical dots are
// printed at 1/180" spacing. Mode B (dot-matrix-invoice.service.ts) uses
// this for the entire invoice page — see svg-to-bitimage.ts.

export const BIT_IMAGE_BAND_DOTS = 24;
export const BIT_IMAGE_DOT_UNIT_INCH = 1 / 180;

export type MonoBitmap = {
  width: number;
  height: number;
  // Row-major, one byte per pixel, 0 = white, non-zero = black.
  pixels: Uint8Array;
};

// Packs a monochrome bitmap into ESC * 33 band commands plus the ESC J
// micro-feeds between them, advancing the print head exactly the image's
// height with no gap or overlap.
export function encodeBitImage(bitmap: MonoBitmap): Buffer {
  const { width, height, pixels } = bitmap;
  const b = new EscpBuilder();

  const bandCount = Math.ceil(height / BIT_IMAGE_BAND_DOTS);
  const nL = width & 0xff;
  const nH = (width >> 8) & 0xff;

  for (let band = 0; band < bandCount; band++) {
    b.column(0);
    b.raw([0x1b, 0x2a, 33, nL, nH]);

    const data = new Array<number>(width * 3);
    for (let x = 0; x < width; x++) {
      for (let byteIdx = 0; byteIdx < 3; byteIdx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const y = band * BIT_IMAGE_BAND_DOTS + byteIdx * 8 + bit;
          const isBlack = y < height && pixels[y * width + x] !== 0;
          if (isBlack) byte |= 0x80 >> bit;
        }
        data[x * 3 + byteIdx] = byte;
      }
    }

    b.raw(data);
    b.microFeed(BIT_IMAGE_BAND_DOTS);
  }

  return b.build();
}
