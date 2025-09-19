import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Items = CreateItemDto;

@Injectable()
export class ItemsService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // Replace with your actual spreadsheet ID
  private sheetName = 'Inventory';
  private range = `${this.sheetName}!A2:P`;

  constructor(private readonly sheetsService: SheetsService) {}

  async create(item: CreateItemDto): Promise<Items> {
    const existingRows = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    // Check if itemCode already exists
    const existingItem = existingRows.find((row) => row[0] === item.itemCode);
    if (existingItem) {
      throw new Error(`Item with code "${item.itemCode}" already exists.`);
    }

    const newItem: Items = { ...item };

    console.log('Creating item:', newItem);

    // Push to Google Sheets
    const row = [
      [
        newItem.itemCode,
        newItem.itemName,
        newItem.brand,
        newItem.origin,
        newItem.minStock,
        newItem.stock,
        newItem.cost,
        newItem.price.price1,
        newItem.price.price2,
        newItem.price.price3,
        newItem.price.price4,
        newItem.partNum,
        newItem.interNum,
        newItem.unit,
        newItem.model,
      ],
    ];

    this.sheetsService
      .appendData(this.spreadsheetId, this.range, row)
      .catch(console.error);

    return newItem;
  }

  async findAll(search?: string) {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    const items = data.map((row) => ({
      itemCode: row[0],
      itemName: row[1],
      brand: row[2],
      origin: row[3],
      minStock: Number(row[4]),
      stock: Number(row[5]),
      cost: Number(row[6]),
      price: {
        price1: Number(row[7]),
        price2: Number(row[8]),
        price3: Number(row[9]),
        price4: Number(row[10]),
      },
      partNum: row[11],
      interNum: row[12],
      unit: row[13],
      model: row[14],
    }));

    if (search) {
      return items.filter(
        (item) =>
          (item.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
          (item.itemCode || '').toLowerCase().includes(search.toLowerCase()),
      );
    }

    return items;
  }

  async addStock(
    itemCode: string,
    quantityToAdd: number,
    convertedGrossPrice: number,
  ): Promise<void> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] === itemCode) {
        // itemCode is column A
        const currentStock = Number(row[5]) || 0; // stock is column F
        const newStock = currentStock + quantityToAdd;

        // Calculate unit cost based on new stock
        const newUnitCost = quantityToAdd
          ? convertedGrossPrice / quantityToAdd
          : 0;

        // Update prices with your markups
        const price1 = (newUnitCost * 1.5).toFixed(2);
        const price2 = (newUnitCost * 1.4).toFixed(2);
        const price3 = (newUnitCost * 1.3).toFixed(2);

        const rowNumber = i + 2; // sheet rows start at 2

        // Update sheet cells
        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `F${rowNumber}`,
          newStock,
        ); // stock
        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `G${rowNumber}`,
          newUnitCost.toFixed(2),
        ); // cost
        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `H${rowNumber}`,
          price1,
        );
        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `I${rowNumber}`,
          price2,
        );
        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `J${rowNumber}`,
          price3,
        );

        console.log(
          `[Inventory] Updated ${itemCode}: stock=${newStock}, cost=${newUnitCost.toFixed(
            2,
          )}, prices=[${price1},${price2},${price3}]`,
        );

        break;
      }
    }
  }

  async removeStock(itemCode: string, quantityToRemove: number): Promise<void> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] === itemCode) {
        // itemCode is column A
        const currentStock = Number(row[5]) || 0; // stock is column F

        if (currentStock < quantityToRemove) {
          throw new BadRequestException(
            `Cannot remove ${quantityToRemove} units. Only ${currentStock} in stock.`,
          );
        }

        const newStock = currentStock - quantityToRemove;
        const rowNumber = i + 2;

        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `F${rowNumber}`,
          newStock,
        );

        console.log(
          `[Inventory] Removed ${quantityToRemove} from ${itemCode}, new stock: ${newStock}`,
        );
        break;
      }
    }
  }

  async getPrices(itemCode: string) {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] === itemCode) {
        // Columns: H=price1, I=price2, J=price3
        return {
          price1: Number(row[7]),
          price2: Number(row[8]),
          price3: Number(row[9]),
        };
      }
    }

    throw new NotFoundException(`Item with code "${itemCode}" not found.`);
  }

  async addItems(
    items: {
      itemCode: string;
      itemName: string;
      brand: string;
      origin: string;
      minStock: number;
      partNum: string;
      interNum: string;
      unit: string;
      model: string;
    }[],
  ) {
    const values = items.map((item) => [
      item.itemCode, // col 1
      item.itemName, // col 2
      item.brand, // col 3
      item.origin, // col 4
      item.minStock, // col 5
      '',
      '',
      '',
      '',
      '',
      '', // col 6–11 (stock, cost, price1–4)
      item.partNum, // col 12
      item.interNum, // col 13
      item.unit, // col 14
      item.model, // col 15
    ]);

    await this.sheetsService.appendData(
      this.spreadsheetId,
      'Inventory!A:O', // covers all 15 columns
      values,
    );
  }

  async deleteItem(itemCode: string) {
    if (!itemCode) {
      throw new BadRequestException('Item code is required.');
    }

    const rows = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    // Find the row with matching itemCode (col A = row[0])
    const rowIndex = rows.findIndex(
      (row) => row[0]?.toString() === itemCode.toString(),
    );

    if (rowIndex === -1) {
      throw new NotFoundException(`Item with code "${itemCode}" not found.`);
    }

    // +2 because rows start at A2, and Google Sheets rows are 1-based
    await this.sheetsService.deleteRowByName(
      this.spreadsheetId,
      this.sheetName,
      rowIndex + 2,
    );

    return { message: `Item "${itemCode}" deleted successfully.` };
  }
}
