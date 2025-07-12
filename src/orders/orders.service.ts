import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Order = CreateOrderDto;

@Injectable()
export class OrdersService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // Replace with your actual spreadsheet ID
  private sheetName = 'Sales Order';
  private range = `${this.sheetName}!A2:J`;

  constructor(private readonly sheetsService: SheetsService) {}

  async create(order: CreateOrderDto): Promise<Order> {
      const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);
      // Check if itemCode already exists
      const existingItem = existingRows.find(row => row[0] === order.orderId);
      if (existingItem) {
        throw new Error(`order ID "${order.orderId}" already exists.`);
      }
    
        const newOrder: Order = {...order};
    
      const row = [[
        order.orderId,
        order.date,
        order.customerName,
        order.customerAddress,
        order.customerNumber,
        order.salesAgent,
        JSON.stringify(order.orderedItems),
        order.totalPrice
      ]];
  
      this.sheetsService.appendData(this.spreadsheetId, this.range, row).catch(console.error);
  
      return newOrder;
    }

  async findAll(): Promise<Order[]> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    return data.map((row, index) => ({
      orderId: row[0],
      date: row[1],
      customerName: row[2],
      customerAddress: row[3],
      customerNumber: row[4],
      status: row[5],
      orderedItems: JSON.parse(row[6] || "[]"),
      totalPrice: Number(row[7]),
      salesAgent: row[8],
    }));
  }
}
