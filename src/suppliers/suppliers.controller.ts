// suppliers.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly sheetsService: SheetsService) {}

  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Supplier List'; // must match the tab name in your Google Sheet
  private range = `${this.sheetName}!A2:C`; // adjust if headers are in A1:B1

  @Get()
  async getSuppliers() {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
    return data.map(([id, name, address]) => ({ id, name, address }));
    //return data.map(row => ({ name: row[0], address: row[1] }));
  }

  @Post()
  async addSupplier(@Body() body: { id: string; name: string; address: string }) {
    const { id, name, address } = body;
    await this.sheetsService.appendData(this.spreadsheetId, this.range, [[id, name, address]]);
    return { message: 'Supplier added successfully' };
  }
}
