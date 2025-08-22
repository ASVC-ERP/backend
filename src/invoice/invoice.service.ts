import { Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SheetsService } from '../sheets/sheets.service';

export class Invoice {
  date: string;
  invoiceID: string;
  customerName: string;
  numItems: number;
  grossPrice: number;
  discount: number;
  netPrice: number;
  status: string;
}

@Injectable()
export class InvoiceService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // Replace with your actual spreadsheet ID
  private sheetName = 'Sales Invoice';
  private range = `${this.sheetName}!A2:H`;

  constructor(private readonly sheetsService: SheetsService) {}

  async findAll(): Promise<Invoice[]> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    return data.map((row, index) => ({
      date: row[0],
      invoiceID: row[1],
      customerName: row[2],
      numItems: row[3],
      grossPrice: row[4],
      discount: row[5],
      netPrice: row[6],
      status: row[7],
    }));
  }

  async search(query: string): Promise<Invoice[]> {
    const data = await this.findAll();

    return data.filter((i) =>
      (i.invoiceID || '').toLowerCase().includes(query.toLowerCase()),
    );
  }

  async createInvoiceFromOrder(order: any): Promise<Invoice> {
    const invoices = await this.findAll();
    const lastInvoice = invoices[invoices.length - 1];
    const lastNumber = lastInvoice
      ? parseInt(lastInvoice.invoiceID.replace('INV', '')) || 0
      : 0;
    const invoiceID = `INV${(lastNumber + 1).toString().padStart(3, '0')}`;

    const grossPrice = order.orderedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const discount = 0;
    const netPrice = grossPrice - discount;

    const payload = [
      [
        order.date,
        invoiceID,
        order.customerName,
        order.orderedItems.length,
        grossPrice,
        discount,
        netPrice,
        'Pending',
      ],
    ];

    await this.sheetsService.appendData(this.spreadsheetId, this.range, payload);

    return {
      date: order.date,
      invoiceID,
      customerName: order.customerName,
      numItems: order.orderedItems.length,
      grossPrice,
      discount,
      netPrice,
      status: 'Pending',
    };
  }
}
