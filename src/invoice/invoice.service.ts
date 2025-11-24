import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SheetsService } from '../sheets/sheets.service';

export interface InvoiceItem {
  itemName: string;
  itemCode: string;
  quantity: number;
  price: number;
  totalPrice: number;
  unit: string;
}

export class Invoice {
  invoiceID: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerNumber?: string;
  customerTIN?: string;
  salesAgent?: string;
  waybillNumber?: string;
  courier?: string;
  shipDate?: string;
  items: InvoiceItem[];
}

@Injectable()
export class InvoiceService {
  private sheetName = 'Sales Invoice';
  private range = `${this.sheetName}!A2:P`;

  private spreadsheetId: string;
  
  constructor(private readonly sheetsService: SheetsService,
    private readonly configService: ConfigService,
  ) {
    const id = this.configService.get<string>('SPREADSHEET_ID');
    if (!id) { throw new Error('SPREADSHEET_ID is not set in environment variables'); }
    this.spreadsheetId = id;
  }

  // Fetch all invoices grouped by invoiceID
  async findAll(): Promise<Invoice[]> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
    const invoicesMap: Record<string, Invoice> = {};

    for (const row of data ?? []) {
      const invoiceID = row[0] ?? '-';
      if (!invoiceID || row.every(cell => !cell)) continue;

      if (!invoicesMap[invoiceID]) {
        invoicesMap[invoiceID] = {
          invoiceID,
          date: row[1] ?? '-',
          customerName: row[2] ?? '-',
          customerAddress: row[3] ?? '-',
          customerNumber: row[4] ?? '-',
          waybillNumber: row[5] ?? '',
          salesAgent: row[10] ?? '-',
          items: [],
          customerTIN: row[11] ?? '-',
          courier: row[14] ?? '',
          shipDate: row[15] ?? "",
        };
      }

      if (row[6]) {
        invoicesMap[invoiceID].items.push({
          itemName: row[6],
          itemCode: row[13],
          quantity: Number(row[7] ?? 0),
          price: Number(row[8] ?? 0),
          totalPrice: Number(row[9] ?? 0),
          unit: row[12] ?? '-',
        });
      }
    }

    return Object.values(invoicesMap).reverse();
  }

  // Search invoices by invoiceID or customerName
  async search(query: string): Promise<Invoice[]> {
    const all = await this.findAll();
    const q = query.toLowerCase();
    return all.filter(
      inv =>
        (inv.invoiceID ?? '').toLowerCase().includes(q) ||
        (inv.customerName ?? '').toLowerCase().includes(q)
    );
  }

  // Optionally, fetch a single invoice by ID
  async findOne(invoiceID: string): Promise<Invoice> {
    const all = await this.findAll();
    const invoice = all.find(inv => inv.invoiceID === invoiceID);
    if (!invoice) throw new Error(`Invoice ${invoiceID} not found`);
    return invoice;
  }
/*
  async updateWaybillNumber(invoiceID: string, newWaybillNumber: string): Promise<void> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    if (!data) return;
    const rowsToUpdate: number[] = [];

    data.forEach((row, index) => {
      if (row[0] === invoiceID) {
        rowsToUpdate.push(index + 2); // +2 because data starts from row 2 (A2:K)
      }
    });

    if (rowsToUpdate.length === 0) {
      throw new Error(`Invoice ${invoiceID} not found in sheet`);
    }

    for (const rowIndex of rowsToUpdate) {
      const waybillRange = `${this.sheetName}!F${rowIndex}`;
      await this.sheetsService.updateData(this.spreadsheetId, waybillRange, [[newWaybillNumber]]);
    }
  }
*/

/*
  async updateShippingDetails(
    invoiceID: string,
    waybillNumber: string,
    courier: string,
    shipDate: string,
  ): Promise<void> {

    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
    if (!data) return;

    const rowsToUpdate: number[] = [];

    data.forEach((row, index) => {
      if (row[0] === invoiceID) {
        rowsToUpdate.push(index + 2); // Since data starts at row 2
      }
    });

    if (rowsToUpdate.length === 0) {
      throw new Error(`Invoice ${invoiceID} not found`);
    }

    for (const rowIndex of rowsToUpdate) {
      await this.sheetsService.batchUpdateData(
        this.spreadsheetId,
        [
          { range: `${this.sheetName}!F${rowIndex}`, values: [[waybillNumber]] },
          { range: `${this.sheetName}!O${rowIndex}`, values: [[courier]] },
          { range: `${this.sheetName}!P${rowIndex}`, values: [[shipDate]] },
        ]
      );
    }
  }
*/

async updateShippingDetails(
  invoiceID: string,
  waybillNumber: string,
  courier: string,
  shipDate: string,
): Promise<void> {

  console.log("=== updateShippingDetails CALLED ===");
  console.log("invoiceID:", invoiceID);
  console.log("waybillNumber:", waybillNumber);
  console.log("courier:", courier);
  console.log("shipDate RECEIVED:", shipDate);

  const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

  console.log("Loaded rows:", data?.length);

  if (!data) return;

  const rowsToUpdate: number[] = [];

  data.forEach((row, index) => {
    if (row[0] === invoiceID) {
      console.log(`Match found at row index ${index} (Sheet row ${index + 2})`);
      rowsToUpdate.push(index + 2); // Since sheet data starts at row 2
    }
  });

  if (rowsToUpdate.length === 0) {
    console.error(`Invoice ${invoiceID} not found`);
    throw new Error(`Invoice ${invoiceID} not found`);
  }

  for (const rowIndex of rowsToUpdate) {
    console.log(`\n--- Updating Sheet Row ${rowIndex} ---`);
    console.log(`Waybill → F${rowIndex}:`, waybillNumber);
    console.log(`Courier → O${rowIndex}:`, courier);
    console.log(`ShipDate → P${rowIndex}:`, shipDate);

    await this.sheetsService.batchUpdateData(
      this.spreadsheetId,
      [
        { range: `${this.sheetName}!F${rowIndex}`, values: [[waybillNumber]] },
        { range: `${this.sheetName}!O${rowIndex}`, values: [[courier]] },
        { range: `${this.sheetName}!P${rowIndex}`, values: [[shipDate]] },
      ]
    );

    console.log(`Row ${rowIndex} updated successfully.`);
  }

  console.log("=== END updateShippingDetails ===\n");
}



  async deleteInvoice(invoiceID: string): Promise<void> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
    if (!data) return;

    // Find all rows with the given invoiceID
    const rowsToDelete: number[] = [];
    const itemsToReturn: { itemName: string; quantity: number }[] = [];

    data.forEach((row, index) => {
      if (row[0] === invoiceID) {
        rowsToDelete.push(index + 2); // +2 because A2:K
        if (row[6] && row[7]) { // itemName and quantity columns
          itemsToReturn.push({ itemName: row[6], quantity: Number(row[7]) });
        }
      }
    });

    if (rowsToDelete.length === 0) {
      throw new Error(`Invoice ${invoiceID} not found in sheet`);
    }

    // 1️⃣ Return items to stock
    for (const item of itemsToReturn) {
      await this.sheetsService.updateInventoryStock(this.spreadsheetId, 'Inventory', item.itemName, item.quantity);
    }
    console.log('Items returned to stock:', itemsToReturn);
    console.log('Switching back to ', this.sheetName, ' sheet');
    console.log('Rows to delete for invoiceID', invoiceID, ':', rowsToDelete);
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      await this.sheetsService.deleteRowByName(this.spreadsheetId, this.sheetName, rowsToDelete[i]);
    }

    console.log(`Invoice ${invoiceID} deleted successfully`);
  }
}
