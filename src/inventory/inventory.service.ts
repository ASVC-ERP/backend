import { Injectable } from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';

@Injectable()
export class InventoryService {
  constructor(private readonly sheetsService: SheetsService) {}

  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private itemSheet = 'Item List';
  private itemRange = `${this.itemSheet}!A2:I`; // Adjust based on columns
  private supplierSheet = 'Supplier List';
  private supplierRange = `${this.supplierSheet}!A2:C`;
  private purchaseLogSheet = 'Supplier Purchases';
  private purchaseRange = `${this.purchaseLogSheet}!A2:I`;

  async processPurchase(dto: {
    supplierInvoiceID: string;
    purchaseDate: string;
    itemCode: string;
    quantity: number;
    unit: string;
    unitCost: number;
    discount: number;
    grossPrice: number;
    supplierCode: string;
  }) {
    const {
      supplierInvoiceID,
      purchaseDate,
      itemCode,
      quantity,
      unit,
      unitCost,
      discount,
      grossPrice,
      supplierCode,
    } = dto;

    const items = await this.sheetsService.getData(this.spreadsheetId, this.itemRange);
    const suppliers = await this.sheetsService.getData(this.spreadsheetId, this.supplierRange);

    const itemIndex = items.findIndex(row => row[0] === itemCode);
    if (itemIndex === -1) return { success: false, message: 'Item not found' };

    const supplierExists = suppliers.some(row => row[0] === supplierCode);
    if (!supplierExists) return { success: false, message: 'Supplier not found' };

    // Update stock
    const stockCell = `E${itemIndex + 2}`; // Column E is "stock"
    const currentStock = parseInt(items[itemIndex][4] || '0', 10);
    const updatedStock = currentStock + quantity;
    await this.sheetsService.updateCell(this.spreadsheetId, this.itemSheet, stockCell, updatedStock);

    // Append to purchase logs
    await this.sheetsService.appendData(this.spreadsheetId, this.purchaseRange, [[
      supplierInvoiceID,
      purchaseDate,
      itemCode,
      quantity,
      unit,
      unitCost,
      discount,
      grossPrice,
      supplierCode,
    ]]);

    return { success: true, message: 'Stock updated and purchase logged' };
  }
}
