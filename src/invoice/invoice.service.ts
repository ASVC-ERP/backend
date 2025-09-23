import { Injectable } from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';

export interface InvoiceItem {
  itemName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export class Invoice {
  invoiceID: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerNumber?: string;
  status: string;
  salesAgent?: string;
  items: InvoiceItem[];
}

@Injectable()
export class InvoiceService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Sales Invoice';
  private range = `${this.sheetName}!A2:K`;

  constructor(private readonly sheetsService: SheetsService) {}

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
          status: row[5] ?? '-',
          salesAgent: row[10] ?? '-',
          items: [],
        };
      }

      if (row[6]) {
        invoicesMap[invoiceID].items.push({
          itemName: row[6],
          quantity: Number(row[7] ?? 0),
          price: Number(row[8] ?? 0),
          totalPrice: Number(row[9] ?? 0),
        });
      }
    }

    return Object.values(invoicesMap);
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

  // Create invoice from an order and return grouped invoice
  async createInvoiceFromOrder(order: any): Promise<Invoice[]> {
    const invoiceID = `INV-${order.orderID}-${Date.now()}`;
    const rows = order.items.map(item => [
      invoiceID,
      order.date,
      order.customerName,
      order.customerAddress ?? '',
      order.customerNumber ?? '',
      'Pending',
      item.itemName,
      item.quantityServed ?? item.quantityOrdered ?? 0,
      item.price ?? 0,
      (item.price ?? 0) * (item.quantityServed ?? item.quantityOrdered ?? 0),
      order.salesAgent ?? '',
    ]);

    await this.sheetsService.appendData(this.spreadsheetId, this.range, rows);

    const invoice: Invoice = {
      invoiceID,
      date: order.date,
      customerName: order.customerName,
      customerAddress: order.customerAddress ?? '',
      customerNumber: order.customerNumber ?? '',
      status: 'Pending',
      salesAgent: order.salesAgent ?? '',
      items: rows.map(r => ({
        itemName: r[6],
        quantity: r[7],
        price: r[8],
        totalPrice: r[9],
      })),
    };

    return [invoice];
  }

  // Optionally, fetch a single invoice by ID
  async findOne(invoiceID: string): Promise<Invoice> {
    const all = await this.findAll();
    const invoice = all.find(inv => inv.invoiceID === invoiceID);
    if (!invoice) throw new Error(`Invoice ${invoiceID} not found`);
    return invoice;
  }

  async updateStatus(invoiceID: string, newStatus: string): Promise<void> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    if (!data) return;

    // Find all rows with the given invoiceID
    const rowsToUpdate: number[] = [];
    data.forEach((row, index) => {
      if (row[0] === invoiceID) {
        // index + 2 → because data starts from row 2 (A2:K)
        rowsToUpdate.push(index + 2);
      }
    });

    if (rowsToUpdate.length === 0) {
      throw new Error(`Invoice ${invoiceID} not found in sheet`);
    }

    // Update the "status" column (column F → index 6, but 1-based in A1 notation)
    for (const rowIndex of rowsToUpdate) {
      const statusRange = `${this.sheetName}!F${rowIndex}`;
      await this.sheetsService.updateData(this.spreadsheetId, statusRange, [[newStatus]]);
    }
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
