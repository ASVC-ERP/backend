import { Injectable } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Items = CreateItemDto & { id: number };

@Injectable()
export class ItemsService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // Replace with your actual spreadsheet ID
  private sheetName = 'Inventory';
  private range = `${this.sheetName}!A1:J`;

  constructor(private readonly sheetsService: SheetsService) {}

  async create(item: CreateItemDto): Promise<Items> {
    const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);

    const newItem: Items = {
    id: existingRows.length + 1,
    ...item,
  };

    // Push to Google Sheets
    const row = [[
      newItem.id,
      newItem.itemCode,
      newItem.itemName,
      newItem.brand,
      newItem.origin,
      newItem.stock,
      newItem.price1,
      newItem.price2,
      newItem.price3,
      newItem.price4
    ]];

    this.sheetsService.appendData(this.spreadsheetId, this.range, row).catch(console.error);

    return newItem;
  }

  async findAll() {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
    return data.map((row, index) => ({
      id: index + 1,
      itemCode: row[1],
      itemName: row[2],
      brand: row[3],
      origin: row[4],
      stock: Number(row[5]),
      price1: Number(row[6]),
      price2: Number(row[7]),
      price3: Number(row[8]),
      price4: Number(row[9]),
    }));
  }

  async search(query: string) {
    const data = await this.sheetsService.searchInventory(this.spreadsheetId, this.range);

    console.log('🔍 Raw data from Sheets:', data);

    for (const item of data) {
      console.log('🔎 itemName:', item['itemName']);
    }

    return data.filter(item =>
      (item['itemName'] || '').toLowerCase().includes(query.toLowerCase())
    );
  }
}