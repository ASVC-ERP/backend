// src/suppliers/suppliers.service.ts
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SheetsService } from '../sheets/sheets.service';

@Injectable()
export class SuppliersService {
  private spreadsheetId: string;
    
  constructor(private readonly sheetsService: SheetsService,
    private readonly configService: ConfigService,
  ) {
    const id = this.configService.get<string>('SPREADSHEET_ID');
    if (!id) { throw new Error('SPREADSHEET_ID is not set in environment variables'); }
    this.spreadsheetId = id;
  }
  private sheetName = 'Supplier';
  private range = `${this.sheetName}!A2:F`; // ✅ include 6 columns

  async getSuppliers() {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );
    return data.map(([id, name, address, currency, number, tin]) => ({
      id,
      name,
      address: address || '',
      currency: currency || '',
      number: number || '',
      tin: tin || '',
    }));
  }

  async addSupplier(
    id: string,
    name: string,
    address: string,
    currency: string,
    number: string,
    tin: string,
  ) {
    try {
      // 1️⃣ Get existing suppliers
      const existingRows = await this.sheetsService.getData(
        this.spreadsheetId,
        this.range,
      );

      // 2️⃣ Check duplicates by ID or TIN
      const duplicate = existingRows.find(
        (row) => row[0] === id,
      );

      if (duplicate) {
        throw new ConflictException(
          `Supplier with ID "${id}" already exists.`,
        );
      }

      // 3️⃣ Append new supplier
      await this.sheetsService.appendData(this.spreadsheetId, this.range, [
        [id, name, address, currency, number, tin],
      ]);

      return { message: 'Supplier added successfully' };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error; // rethrow conflict for frontend
      }

      console.error('❌ Error adding supplier:', error);
      throw new InternalServerErrorException('Failed to add supplier.');
    }
  }

  async updateSupplier(
    supplierId: string,
    body: {
      newId?: string;
      name?: string;
      address?: string;
      currency?: string;
      number?: string;
      tin?: string; // ✅ added TIN support
    },
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
    if (body.number) {
      await this.sheetsService.updateCell(
        this.spreadsheetId,
        this.sheetName,
        `E${rowNumber}`,
        body.number,
      );
    }
    if (body.tin) {
      await this.sheetsService.updateCell(
        this.spreadsheetId,
        this.sheetName,
        `F${rowNumber}`,
        body.tin,
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
      rowIndex + 2,
    );

    return { message: 'Supplier deleted successfully.' };
  }
}
