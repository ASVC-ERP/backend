import { Injectable } from '@nestjs/common';
import { AddCustomerDto } from './dto/add-customer.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Customer = {
  customerID: string;
  customerName: string;
  customerContact: number;
  customerAddress: string;
};

@Injectable()
export class CustomersService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // Replace with your actual spreadsheet ID
  private sheetName = 'Customer';
  private range = `${this.sheetName}!A2:D`;

  constructor(private readonly sheetsService: SheetsService) {}

  async create(customer: AddCustomerDto): Promise<Customer> {
    const existingRows = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    // Determine the last customer ID
    let newIdNumber = 1;
    if (existingRows.length > 0) {
      const lastRow = existingRows[existingRows.length - 1];
      const lastId = lastRow[0]; // e.g., "CUST-015"
      const lastNum = parseInt(lastId.replace('CUST-', ''), 10);

      newIdNumber = lastNum + 1;
    }

    const newCustomerId = `CUST-${newIdNumber.toString().padStart(3, '0')}`;

    // Create row to push
    const row = [
      [
        newCustomerId,
        customer.customerName,
        customer.customerContact,
        customer.customerAddress,
      ],
    ];

    await this.sheetsService.appendData(this.spreadsheetId, this.range, row);

    return {
      customerID: newCustomerId,
      customerName: customer.customerName,
      customerContact: customer.customerContact,
      customerAddress: customer.customerAddress,
    };
  }

  async findAll(): Promise<Customer[]> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    return data.map((row, index) => ({
      customerID: row[0],
      customerName: row[1],
      customerContact: row[2],
      customerAddress: row[3],
    }));
  }

  async search(query: string): Promise<Customer[]> {
    const data = await this.findAll();

    return data.filter((c) =>
      (c.customerName || '').toLowerCase().includes(query.toLowerCase()),
    );
  }
}
