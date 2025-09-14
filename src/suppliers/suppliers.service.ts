// src/suppliers/suppliers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';

@Injectable()
export class SuppliersService {
  private spreadsheetId =
    '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Supplier List';
  private range = `${this.sheetName}!A2:D`;

  constructor(private readonly sheetsService: SheetsService) {}

  async getSuppliers() {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );
    return data.map(([id, name, address, currency]) => ({ id, name, address, currency }));
  }

  async addSupplier(id: string, name: string, address: string, currency: string) {
    await this.sheetsService.appendData(this.spreadsheetId, this.range, [
      [id, name, address, currency],
    ]);
    return { message: 'Supplier added successfully' };
  }

  async updateSupplier(
    supplierId: string,
    body: { newId?: string; name?: string; address?: string; currency?: string },
  ) {
    const rows = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    const rowIndex = rows.findIndex((row) => row[0] === supplierId);
    if (rowIndex === -1) {
      throw new NotFoundException(
        `Supplier with ID "${supplierId}" not found.`,
      );
    }

    const rowNumber = rowIndex + 2;

    if (body.newId) {
      await this.sheetsService.updateCell(
        this.spreadsheetId,
        this.sheetName,
        `A${rowNumber}`,
        body.newId,
      );
    }
    if (body.name) {
      await this.sheetsService.updateCell(
        this.spreadsheetId,
        this.sheetName,
        `B${rowNumber}`,
        body.name,
      );
    }
    if (body.address) {
      await this.sheetsService.updateCell(
        this.spreadsheetId,
        this.sheetName,
        `C${rowNumber}`,
        body.address,
      );
    }
    if (body.currency) {
      await this.sheetsService.updateCell(
        this.spreadsheetId,
        this.sheetName,
        `D${rowNumber}`,
        body.currency,
      );
    }

    return { message: 'Supplier updated successfully.' };
  }

  async deleteSupplier(supplierId: string) {
    const rows = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );
    const rowIndex = rows.findIndex((row) => row[0] === supplierId);
    if (rowIndex === -1) {
      throw new NotFoundException(
        `Supplier with ID "${supplierId}" not found.`,
      );
    }

    await this.sheetsService.deleteRowByName(
      this.spreadsheetId,
      this.sheetName,
      rowIndex + 1,
    );

    return { message: 'Supplier deleted successfully.' };
  }
}
