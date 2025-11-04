import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AddCustomerDto } from './dto/add-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Customer = {
  customerID: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  customerTIN: string;
  customerTerms: string;
};

@Injectable()
export class CustomersService {
  private spreadsheetId: string;
  
  constructor(private readonly sheetsService: SheetsService,
    private readonly configService: ConfigService,
  ) {
    const id = this.configService.get<string>('SPREADSHEET_ID');
    if (!id) { throw new Error('SPREADSHEET_ID is not set in environment variables'); }
    this.spreadsheetId = id;
  }
  private sheetName = 'Customer';
  private range = `${this.sheetName}!A2:F`;

  async create(customer: AddCustomerDto): Promise<Customer> {
    try {
      const existingRows = await this.sheetsService.getData(
        this.spreadsheetId,
        this.range,
      );

      // 🆔 Determine new customer ID
      let newIdNumber = 1;
      if (existingRows.length > 0) {
        const lastRow = existingRows[existingRows.length - 1];
        const lastId = lastRow[0]; // e.g., "CUST-015"
        const lastNum = parseInt(lastId.replace('CUST-', ''), 10);

        newIdNumber = lastNum + 1;
      }

      const newCustomerId = `CUST-${newIdNumber.toString().padStart(3, '0')}`;

      // 📝 Create row to push
      const row = [
        [
          newCustomerId,
          customer.customerName,
          customer.customerContact,
          customer.customerAddress,
          customer.customerTIN,
          customer.customerTerms,
        ],
      ];

      await this.sheetsService.appendData(this.spreadsheetId, this.range, row);

      return {
        customerID: newCustomerId,
        customerName: customer.customerName,
        customerContact: customer.customerContact,
        customerAddress: customer.customerAddress,
        customerTIN: customer.customerTIN,
        customerTerms: customer.customerTerms,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error; // pass duplicate error to frontend
      }

      console.error('❌ Error creating customer:', error);
      throw new InternalServerErrorException('Failed to create customer.');
    }
  }

  async getCustomers(): Promise<Customer[]> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    return data.map((row) => ({
      customerID: row[0],
      customerName: row[1],
      customerContact: row[2],
      customerAddress: row[3],
      customerTIN: row[4] || '',
      customerTerms: row[5] || '',
    }));
  }

  async findByIds(idList: string[]): Promise<Customer[]> {
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);

    if (!rows || rows.length === 0) {
      throw new Error('No customer data found.');
    }

    // Assuming your columns: ID | Name | Contact | Address | TIN | Terms
    const matchedCustomers: Customer[] = [];

    for (const id of idList) {
      const normalizedId = id.trim().toLowerCase();

      const row = rows.find(r => (r[0] ?? '').trim().toLowerCase() === normalizedId);
      if (row) {
        matchedCustomers.push({
          customerID: row[0],
          customerName: row[1],
          customerContact: row[2],
          customerAddress: row[3],
          customerTIN: row[4],
          customerTerms: row[5],
        });
      }
    }

    return matchedCustomers;
  }

  async findByCustomerName(name: string): Promise<Customer | null> {
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);
    if (!rows || rows.length === 0) {
      throw new Error('No customer data found.');
    }

    const normalizedQuery = name.trim().toLowerCase().normalize('NFKC');

    for (const row of rows) {
      const customerName = (row[1] || '').trim().toLowerCase().normalize('NFKC');
      if (customerName === normalizedQuery) {
        return {
          customerID: row[0],
          customerName: row[1],
          customerContact: row[2],
          customerAddress: row[3],
          customerTIN: row[4],
          customerTerms: row[5],
        };
      }
    }

    return null;
  }

  async search(query: string): Promise<Customer[]> {
    const data = await this.getCustomers();

    return data.filter((c) =>
      (c.customerName || '').toLowerCase().includes(query.toLowerCase()),
    );
  }

  async update(customerID: string, dto: UpdateCustomerDto): Promise<Customer> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    const rowIndex = data.findIndex((row) => row[0] === customerID);
    if (rowIndex === -1) throw new Error('Customer not found');

    const row = data[rowIndex];

    // Update values if provided
    row[1] = dto.customerName ?? row[1];
    row[2] = dto.customerContact ?? row[2];
    row[3] = dto.customerAddress ?? row[3];
    row[4] = dto.customerTIN ?? row[4];
    row[5] = dto.customerTerms ?? row[5]; 

    // SheetsService may need full range like 'Customer!A{rowIndex+2}:E{rowIndex+2}'
    const updateRange = `${this.sheetName}!A${rowIndex + 2}:F${rowIndex + 2}`;
    await this.sheetsService.updateData(this.spreadsheetId, updateRange, [row]);

    return {
      customerID: row[0],
      customerName: row[1],
      customerContact: row[2],
      customerAddress: row[3],
      customerTIN: row[4],
      customerTerms: row[5],
    };
  }

  async delete(customerID: string): Promise<void> {
    // Fetch all customer rows
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    // Find the index of the customer to delete
    const rowIndex = data.findIndex((row) => row[0] === customerID);
    if (rowIndex === -1) {
      throw new Error(`Customer with ID ${customerID} not found`);
    }

    // Delete the row (add 2 because your range starts at A2)
    await this.sheetsService.deleteRowByName(
      this.spreadsheetId,
      this.sheetName,
      rowIndex + 2,
    );
  }
}
