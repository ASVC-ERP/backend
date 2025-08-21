import { Injectable, BadRequestException } from '@nestjs/common';
import { SheetsService } from '../../sheets/sheets.service';
import { ItemsService } from '../../items/items.service';
import { CreateInvoiceDto } from './dto/suppliers-invoice.dto';

@Injectable()
export class SuppliersInvoiceService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Supplier Invoice';
  private range = `${this.sheetName}!A2:M`;

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly itemsService: ItemsService,
  ) {}

  /** Generate dynamic invoice number */
  private async generateInvoiceNumber(): Promise<string> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      `${this.sheetName}!A2:A`,
    );
    const lastNumber = data.length
      ? Number(data[data.length - 1][0].replace('INV-', ''))
      : 0;
    return `INV-${lastNumber + 1}`;
  }

  /** Add invoice */
  async addInvoice(dto: CreateInvoiceDto) {
    const inventory = await this.sheetsService.getData(
      this.spreadsheetId,
      'Inventory!A2:A',
    );
    const existingItemCodes = inventory.map((row) => row[0]);

    for (const item of dto.items) {
      if (!existingItemCodes.includes(item.itemCode)) {
        throw new BadRequestException(
          `Item "${item.itemCode}" does not exist in inventory.`,
        );
      }
    }

    const invoiceID = await this.generateInvoiceNumber();

    const values = dto.items.map((item) => [
      invoiceID,
      dto.poNum,
      dto.purchaseDate,
      item.itemName,
      item.itemCode,
      item.quantity,
      item.unit,
      item.unitCost,
      item.currency || 'PHP',
      item.conversionFactor || 1,
      item.subTotal,
      dto.status || 'Purchased',
    ]);

    await this.sheetsService.appendData(this.spreadsheetId, this.range, values);

    for (const item of dto.items) {
      if (dto.status === 'Purchased') {
        await this.itemsService.addStock(
          item.itemCode,
          item.quantity,
          item.subTotal,
        );
      } else if (dto.status === 'Returned') {
        await this.itemsService.removeStock(item.itemCode, item.quantity);
      }
    }

    return { message: 'Invoice added successfully', invoiceID };
  }

  async findAll() {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    return data
      .map((row) => ({
        invoiceID: row[0] || '',
        poNum: row[1] || '',
        purchaseDate: row[2] || '',
        itemName: row[3] || '',
        itemCode: row[4] || '',
        quantity: Number(row[5]) || 0,
        unit: row[6] || '',
        unitCost: Number(row[7]) || 0,
        currency: row[8] || 'PHP',
        conversionFactor: Number(row[9]) || 1,
        subTotal: Number(row[10]) || 0,
        status: row[11] || 'Purchased',
        supplierID: row[12]?.trim() || '',
      }))
      .filter((row) => row.invoiceID && row.itemCode);
  }

  async findBySupplier(supplierID?: string) {
    const allInvoices = await this.findAll();
    const groupedMap = new Map<string, any>();

    for (const inv of allInvoices) {
      if (supplierID && inv.supplierID !== supplierID) continue;

      if (!groupedMap.has(inv.invoiceID)) {
        groupedMap.set(inv.invoiceID, {
          invoiceID: inv.invoiceID,
          poNum: inv.poNum,
          purchaseDate: inv.purchaseDate,
          status: inv.status,
          items: [],
        });
      }

      groupedMap.get(inv.invoiceID).items.push({
        itemName: inv.itemName,
        itemCode: inv.itemCode,
        quantity: inv.quantity,
        unit: inv.unit,
        unitCost: inv.unitCost,
        currency: inv.currency,
        conversionFactor: inv.conversionFactor,
        subTotal: inv.subTotal,
      });
    }

    return Array.from(groupedMap.values());
  }

  async findByItem(itemCode: string) {
    const allInvoices = await this.findAll();
    const code = itemCode?.trim();

    // Return all rows where itemCode matches
    return allInvoices.filter((inv) => inv.itemCode === code);
  }
}
