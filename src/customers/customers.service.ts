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
  private range = `${this.sheetName}!A2:E`; // Added column E for TIN

  async create(customer: AddCustomerDto): Promise<Customer> {
    try {
      const existingRows = await this.sheetsService.getData(
        this.spreadsheetId,
        this.range,
      );

      // 🔍 Check for duplicate customer (by TIN or Name/Contact)
      const duplicate = existingRows.find(
        (row) =>
          row[1] === customer.customerName || // assuming col 1 = name
          row[2] === customer.customerContact || // assuming col 2 = contact
          row[4] === customer.customerTIN, // assuming col 4 = TIN
      );

      if (duplicate) {
        throw new ConflictException(
          `Customer already exists (duplicate Name, Contact, or TIN).`,
        );
      }

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
        ],
      ];

      await this.sheetsService.appendData(this.spreadsheetId, this.range, row);

      return {
        customerID: newCustomerId,
        customerName: customer.customerName,
        customerContact: customer.customerContact,
        customerAddress: customer.customerAddress,
        customerTIN: customer.customerTIN,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error; // pass duplicate error to frontend
      }

      console.error('❌ Error creating customer:', error);
      throw new InternalServerErrorException('Failed to create customer.');
    }
  }

  async findAll(): Promise<Customer[]> {
    const data = await this.sheetsService.getData(
      this.spreadsheetId,
      this.range,
    );

    return data.map((row) => ({
      customerID: row[0],
      customerName: row[1],
      customerContact: row[2],
      customerAddress: row[3],
      customerTIN: row[4] || '', // Added TIN
    }));
  }

  async search(query: string): Promise<Customer[]> {
    const data = await this.findAll();

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
    row[4] = dto.customerTIN ?? row[4]; // Update TIN

    // SheetsService may need full range like 'Customer!A{rowIndex+2}:E{rowIndex+2}'
    const updateRange = `${this.sheetName}!A${rowIndex + 2}:E${rowIndex + 2}`;
    await this.sheetsService.updateData(this.spreadsheetId, updateRange, [row]);

    return {
      customerID: row[0],
      customerName: row[1],
      customerContact: row[2],
      customerAddress: row[3],
      customerTIN: row[4],
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
