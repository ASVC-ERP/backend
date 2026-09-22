import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { exec } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Sends a raw ESC/P byte buffer straight to a shared printer queue via the
// Windows spooler's RAW datatype, bypassing GDI so column/row positioning
// survives untouched. The printer must be shared (even if local) and set to
// the Generic / Text Only driver (or vendor ESC/P driver in raw mode) — a
// normal driver will reflow the bytes instead of passing them through.
@Injectable()
export class PrinterTransportService {
  async sendRaw(buffer: Buffer, sharedPrinterName: string): Promise<void> {
    if (!sharedPrinterName) {
      throw new InternalServerErrorException('No printer name provided');
    }

    const file = join(tmpdir(), `escp-${Date.now()}-${process.pid}.prn`);
    await writeFile(file, buffer);

    try {
      await new Promise<void>((resolve, reject) => {
        exec(
          `copy /b "${file}" "\\\\%COMPUTERNAME%\\${sharedPrinterName}"`,
          (err, _stdout, stderr) =>
            err
              ? reject(new InternalServerErrorException(stderr || err.message))
              : resolve(),
        );
      });
    } finally {
      await unlink(file).catch(() => undefined);
    }
  }
}
