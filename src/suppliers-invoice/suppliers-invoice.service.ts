import { Injectable, BadRequestException } from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';
import { ItemsService } from '../items/items.service';
import { CreateInvoiceDto } from './dto/suppliers-invoice.dto';

export type Invoice = CreateInvoiceDto;

@Injectable()
export class SuppliersInvoiceService {

  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Supplier Invoice';
  private range = `${this.sheetName}!A2:I`;

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly itemsService: ItemsService,
  ) {}

  async addInvoice(dto: CreateInvoiceDto) {
    const values = dto.items.map((item) => ([
        dto.supplierInvoiceID,
        dto.purchaseDate,
        item.itemCode,
        item.quantity,
        item.unit,
        item.unitCost,
        item.discount,
        item.grossPrice,
        dto.supplierID,
    ]));

    const inventory = await this.sheetsService.getData(this.spreadsheetId, 'Inventory!A2:A'); // only get itemCode
    const existingItemCodes = inventory.map(row => row[0]);

    for (const item of dto.items) {
      if (!existingItemCodes.includes(item.itemCode)) {
        throw new BadRequestException({
          statusCode: 400,
          message: `Item "${item.itemCode}" does not exist in inventory.`,
          error: 'Invalid Item Code',
        });
      }
    }

    await this.sheetsService.appendData(this.spreadsheetId, this.range, values);

    for (const item of dto.items) {
        await this.itemsService.addStock(item.itemCode, item.quantity);
    }

    return { message: 'Invoice added successfully' };
  }

  async findAll() {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    const invoices = data
    .map((row) => ({
      supplierInvoiceID: row[0] || '',
      purchaseDate: row[1] || '',
      itemCode: row[2] || '',
      quantity: Number(row[3]) || 0,
      unit: row[4] || '',
      unitCost: Number(row[5]) || 0,
      discount: Number(row[6]) || 0,
      grossPrice: Number(row[7]) || 0,
      supplierID: row[8]?.trim() || '',
    }))

    .filter(row =>
      row.supplierInvoiceID &&
      row.itemCode &&
      row.supplierID
    );

    return invoices;
    
  }

  async findBySupplier(supplierID: string) {
    const all = await this.findAll();
    const filtered = all.filter(invoice => invoice.supplierID === supplierID);
    const grouped = new Map();

    for (const row of filtered) {
        const key = row.supplierInvoiceID;

        if (!grouped.has(key)) {
        grouped.set(key, {
            supplierInvoiceID: row.supplierInvoiceID,
            purchaseDate: row.purchaseDate,
            supplierID: row.supplierID,
            items: [],
        });
        }

        grouped.get(key).items.push({
        itemCode: row.itemCode,
        quantity: row.quantity,
        unit: row.unit,
        unitCost: row.unitCost,
        discount: row.discount,
        grossPrice: row.grossPrice,
        });
    }

    return Array.from(grouped.values());
  }

}
