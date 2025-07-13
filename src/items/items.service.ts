import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Items = CreateItemDto;

@Injectable()
export class ItemsService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // Replace with your actual spreadsheet ID
  private sheetName = 'Inventory';
  private range = `${this.sheetName}!A2:J`;

  constructor(private readonly sheetsService: SheetsService) {}

  async create(item: CreateItemDto): Promise<Items> {
    const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);

  // Check if itemCode already exists
  const existingItem = existingRows.find(row => row[0] === item.itemCode);
  if (existingItem) {
    throw new Error(`Item with code "${item.itemCode}" already exists.`);
  }

    const newItem: Items = { ...item };

    // Push to Google Sheets
    const row = [[
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
      itemCode: row[0],
      itemName: row[1],
      brand: row[2],
      origin: row[3],
      stock: Number(row[4]),
      price1: Number(row[5]),
      price2: Number(row[6]),
      price3: Number(row[7]),
      price4: Number(row[8]),
    }));
  }

  async addStock(itemCode: string, quantityToAdd: number): Promise<void> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] === itemCode) {
        const currentStock = Number(row[4]) || 0;
        const newStock = currentStock + quantityToAdd;

        const rowNumber = i + 2; // Because data starts at row 2
        const cell = `E${rowNumber}`; // Column E = stock

        await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, cell, newStock);
        break;
      }
    }
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