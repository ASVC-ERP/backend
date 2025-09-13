// suppliers.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  NotFoundException,
  Body,
} from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly sheetsService: SheetsService) {}

  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Supplier List'; // must match the tab name in your Google Sheet
  private range = `${this.sheetName}!A2:C`; // adjust if headers are in A1:B1

  @Get()
  async getSuppliers() {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );
    return data.map(([id, name, address]) => ({ id, name, address }));
    //return data.map(row => ({ name: row[0], address: row[1] }));
  }

  @Post()
  async addSupplier(
    @Body() body: { id: string; name: string; address: string },
  ) {
    const { id, name, address } = body;
    await this.sheetsService.appendData(this.spreadsheetId, this.range, [
      [id, name, address],
    ]);
    return { message: 'Supplier added successfully' };
  }

  //TODO: need to refactor cause too many lines
  @Put(':id')
  async updateSupplier(
    @Param('id') supplierId: string,
    @Body() body: { newId?: string; name?: string; address?: string },
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

    return { message: 'Supplier updated successfully.' };
  }

  @Delete(':id')
  async deleteSupplier(@Param('id') supplierId: string) {
    const rows = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );
    const rowIndex = rows.findIndex((row) => row[0] === supplierId);
    if (rowIndex === -1)
      throw new NotFoundException(
        `Supplier with ID "${supplierId}" not found.`,
      );

    // Remove the row completely instead of just clearing it
    await this.sheetsService.deleteRow(
      this.spreadsheetId,
      this.sheetName,
      rowIndex + 1,
    );

    return { message: 'Supplier deleted successfully.' };
  }
}
