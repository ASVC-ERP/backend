import { Controller, Get, Post, Body, Query, Param, UseInterceptors, UploadedFile, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as ExcelJS from 'exceljs';
import { Express } from "express";
import { Multer } from 'multer';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';

@Controller('items')
export class ItemsController {

  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Inventory';
  private range = `${this.sheetName}!A2:K`;
  constructor(private readonly itemsService: ItemsService, private readonly sheetsService: SheetsService) {}

  @Post()
  create(@Body() dto: CreateItemDto) {
    console.log("📥 Received item from frontend:", dto);
    return this.itemsService.create(dto);
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.itemsService.findAll(search);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    const items: { itemCode: string; itemName: string }[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const itemCode = row.getCell(1).value;
      const itemName = row.getCell(2).value;

      if (itemCode && itemName) {
        items.push({
          itemCode: String(itemCode),
          itemName: String(itemName),
        });
      }
    });

    // Check for duplicates
    const existingRows = await this.sheetsService.getData(this.spreadsheetId, 'Inventory!A:A');
    const existingCodes = existingRows.flat().map(String);
    const newItems = items.filter(item => !existingCodes.includes(item.itemCode));

    if (newItems.length === 0) {
      return { message: 'No new items to import', count: 0 };
    }

    const values = newItems.map(item => [item.itemCode, item.itemName]);
    await this.itemsService.addItems(newItems);

    return { message: 'Import successful', count: newItems.length };
  }

}
