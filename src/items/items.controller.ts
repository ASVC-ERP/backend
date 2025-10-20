import { Controller, Get, Post, Body, Query, Param, UseInterceptors, UploadedFile, Delete, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import * as ExcelJS from 'exceljs';
import { Express } from 'express';
import { Multer } from 'multer';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';

@Controller('items')
export class ItemsController {
  private sheetName = 'Inventory';
  private range = `${this.sheetName}!A2:P`;

  private spreadsheetId: string;
  
  constructor(private readonly sheetsService: SheetsService,
    private readonly itemsService: ItemsService,
    private readonly configService: ConfigService,
  ) {
    const id = this.configService.get<string>('SPREADSHEET_ID');
    if (!id) { throw new Error('SPREADSHEET_ID is not set in environment variables'); }
    this.spreadsheetId = id;
  }

  @Post()
  create(@Body() dto: CreateItemDto) {
    console.log('📥 Received item from frontend:', dto);
    return this.itemsService.create(dto);
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.itemsService.findAll(search);
  }

  @Get('check-code')
  async checkItemCode(@Query('itemCode') itemCode: string) {
    if (!itemCode) {
      throw new BadRequestException('Item code is required.');
    }

    const exists = await this.itemsService.checkItemCodeExists(itemCode);
    return { exists };
  }


  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    const items: {
      itemCode: string;
      itemName: string;
      brand: string;
      origin: string;
      minStock: number;
      partNum: string;
      interNum: string;
      unit: string;
      model: string;
    }[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const itemCode = row.getCell(1).value;
      const itemName = row.getCell(2).value;
      const brand = row.getCell(3).value;
      const origin = row.getCell(4).value;
      const minStock = row.getCell(5).value;
      //skip 6-11: stock, cost, price1-4
      const partNum = row.getCell(12).value;
      const interNum = row.getCell(13).value;
      const unit = row.getCell(14).value;
      const model = row.getCell(15).value;

      if (itemCode && itemName) {
        items.push({
          itemCode: String(itemCode),
          itemName: String(itemName),
          brand: String(brand),
          origin: String(origin),
          minStock: Number(minStock || 0),
          //skip stock, cost, price1-4
          partNum: String(partNum),
          interNum: String(interNum),
          unit: String(unit),
          model: String(model),
        });
      }
    });

    // Check for duplicates
    const existingRows = await this.sheetsService.getData(
      this.spreadsheetId,
      'Inventory!A:A',
    );
    const existingCodes = existingRows.flat().map(String);
    const newItems = items.filter(
      (item) => !existingCodes.includes(item.itemCode),
    );

    if (newItems.length === 0) {
      return { message: 'No new items to import', count: 0 };
    }

    const values = newItems.map((item) => [
      item.itemCode,
      item.itemName,
      item.brand,
      item.origin,
      item.minStock,
      '',
      '',
      '',
      '',
      '',
      '',
      item.partNum,
      item.interNum,
      item.unit,
      item.model,
    ]);
    await this.itemsService.addItems(newItems);

    return { message: 'Import successful', count: newItems.length };
  }

  @Delete(':id')
  async deleteItem(@Param('id') itemCode: string) {
    return this.itemsService.deleteItem(itemCode);
  }
}
