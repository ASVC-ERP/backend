import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Items = CreateItemDto;

@Injectable()
export class ItemsService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // Replace with your actual spreadsheet ID
  private sheetName = 'Inventory';
  private range = `${this.sheetName}!A2:K`;

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
      newItem.minStock,
    ]];

    this.sheetsService.appendData(this.spreadsheetId, this.range, row).catch(console.error);

    return newItem;
  }

  async findAll(search?: string) {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    const items = data.map((row) => ({
      itemCode: row[0],
      itemName: row[1],
      brand: row[2],
      origin: row[3],
      stock: Number(row[4]),
      minStock: Number(row[5]),
      price : {
        price1: Number(row[7]),
        price2: Number(row[8]),
        price3: Number(row[9]),
        price4: Number(row[10])
      },
    }));

    if (search) {
      return items.filter(
        (item) =>
          (item.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.itemCode || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    return items;
  }

  async addStock(itemCode: string, quantityToAdd: number, convertedGrossPrice: number): Promise<void> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] === itemCode) {
        const currentStock = Number(row[4]) || 0;
        const newStock = currentStock + quantityToAdd;

        const newUnitCost = quantityToAdd ? convertedGrossPrice / quantityToAdd : 0;

        // Calculate prices
        const price1 = newUnitCost * 1.5; // 50% markup
        const price2 = newUnitCost * 1.4; // 40% markup
        const price3 = newUnitCost * 1.3; // 30% markup
  
        const rowNumber = i + 2;

        await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `E${rowNumber}`, newStock);

        // Update prices
        await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `G${rowNumber}`, price1.toFixed(2));
        await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `H${rowNumber}`, price2.toFixed(2));
        await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `I${rowNumber}`, price3.toFixed(2));

        break;
      }
    }
  }

  async removeStock(itemCode: string, quantityToRemove: number): Promise<void> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] === itemCode) {
        const currentStock = Number(row[4]) || 0;
        if (currentStock < quantityToRemove) {
          throw new Error(
            `Cannot remove ${quantityToRemove} units. Only ${currentStock} in stock.`
          );
        }

        const newStock = currentStock - quantityToRemove;
        const rowNumber = i + 2;
        const cell = `E${rowNumber}`;

        await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, cell, newStock);
        break;
      }
    } 
  }

/*
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
*/
}