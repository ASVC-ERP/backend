import { Injectable, BadRequestException } from '@nestjs/common';
import { SheetsService } from '../../sheets/sheets.service';
import { ItemsService } from '../../items/items.service';
import { CreateInvoiceDto } from './dto/suppliers-invoice.dto';

@Injectable()
export class SuppliersInvoiceService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Supplier Invoice';
  private range = `${this.sheetName}!A2:O`;

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly itemsService: ItemsService,
  ) {}

  /** Generate dynamic invoice number */
  private async generateInvoiceNumber(): Promise<string> {
    const data = await this.sheetsService.getData(this.spreadsheetId, `${this.sheetName}!A2:A`);
    const lastNumber = data.length ? Number(data[data.length - 1][0].replace('INV-', '')) : 0;
    return `INV-${lastNumber + 1}`;
  }

  /** Add invoice */
  async addInvoice(dto: CreateInvoiceDto) {
    const inventory = await this.sheetsService.getData(this.spreadsheetId, 'Inventory!A2:A');
    const existingItemCodes = inventory.map(row => row[0]);

    for (const item of dto.items) {
      if (!existingItemCodes.includes(item.itemCode)) {
        throw new BadRequestException(`Item "${item.itemCode}" does not exist in inventory.`);
      }
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const values = dto.items.map(item => [
      invoiceNumber,
      dto.poNumber || '',
      dto.purchaseDate,
      item.itemName,
      item.itemCode,
      item.quantity,
      item.unit,
      item.unitCost,
      item.discount || 0,
      item.grossPrice,
      item.currency || 'USD',
      item.conversionFactor || 1,
      item.convertedGrossPrice || item.grossPrice,
      dto.status || 'purchase',
    ]);

    await this.sheetsService.appendData(this.spreadsheetId, this.range, values);

    for (const item of dto.items) {
      if (dto.status === 'purchase') {
        await this.itemsService.addStock(item.itemCode, item.quantity, item.grossPrice);
      } else if (dto.status === 'return') {
        await this.itemsService.removeStock(item.itemCode, item.quantity);
      }
    }

    return { message: 'Invoice added successfully', invoiceNumber };
  }

  async findAll() {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    return data
      .map(row => ({
        supplierInvoiceID: row[0] || '',
        poNumber: row[1] || '',
        purchaseDate: row[2] || '',
        itemName: row[3] || '',
        itemCode: row[4] || '',
        quantity: Number(row[5]) || 0,
        unit: row[6] || '',
        unitCost: Number(row[7]) || 0,
        discount: Number(row[8]) || 0,
        grossPrice: Number(row[9]) || 0,
        currency: row[10] || 'PHP',
        conversionFactor: Number(row[11]) || 1,
        convertedGrossPrice: Number(row[12]) || 0,
        status: row[13] || 'purchase',
        supplierID: row[14]?.trim() || '',
      }))
      .filter(row => row.supplierInvoiceID && row.itemCode);
  }

  async findBySupplier(supplierID?: string) {
    const allInvoices = await this.findAll();
    const groupedMap = new Map<string, any>();

    for (const inv of allInvoices) {
      if (supplierID && inv.supplierID !== supplierID) continue;

      if (!groupedMap.has(inv.supplierInvoiceID)) {
        groupedMap.set(inv.supplierInvoiceID, {
          supplierInvoiceID: inv.supplierInvoiceID,
          poNumber: inv.poNumber,
          purchaseDate: inv.purchaseDate,
          items: [],
        });
      }

      groupedMap.get(inv.supplierInvoiceID).items.push({
        itemName: inv.itemName,
        itemCode: inv.itemCode,
        quantity: inv.quantity,
        unit: inv.unit,
        unitCost: inv.unitCost,
        discount: inv.discount,
        grossPrice: inv.grossPrice,
        currency: inv.currency,
        conversionFactor: inv.conversionFactor,
        convertedGrossPrice: inv.convertedGrossPrice,
        status: inv.status,
      });
    }

    return Array.from(groupedMap.values());
  }

  async findByItem(itemCode: string) {
    const allInvoices = await this.findAll();
    const code = itemCode?.trim();

    // Return all rows where itemCode matches
    return allInvoices.filter(inv => inv.itemCode === code);
  }

}
