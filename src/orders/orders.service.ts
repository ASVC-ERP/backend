import { Injectable, NotFoundException} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Order = CreateOrderDto;

@Injectable()
export class OrdersService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Sales Order';
  private range = `${this.sheetName}!A2:K`; // A–K = 11 columns

  constructor(private readonly sheetsService: SheetsService) {}

  async create(order: CreateOrderDto): Promise<Order> {
    const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);

    // Check if orderId already exists in ANY row
    const exists = existingRows.some(row => row[0] === order.orderId);
    if (exists) {
      throw new Error(`Order ID "${order.orderId}" already exists.`);
    }

    // One row per ordered item
    const rows = order.orderedItems.map(item => ([
      order.orderId,         // A
      order.date,            // B
      order.customerName,    // C
      order.customerAddress, // D
      order.customerNumber,  // E
      order.status,          // F
      item.itemName,         // G
      item.quantity,         // H
      item.price,            // I
      order.totalPrice,      // J
      order.salesAgent       // K
    ]));

    await this.sheetsService.appendData(this.spreadsheetId, this.range, rows);
    return order;
  }

  async findAll(): Promise<Order[]> {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    const ordersMap: Record<string, Order> = {};

    for (const row of data) {
      const orderId = row[0];

      // Skip completely blank or invalid rows
      if (!orderId || row.every(cell => !cell)) {
        continue;
      }

      if (!ordersMap[orderId]) {
        ordersMap[orderId] = {
          orderId,
          date: row[1],
          customerName: row[2],
          customerAddress: row[3],
          customerNumber: row[4],
          status: row[5],
          salesAgent: row[10],
          orderedItems: [],
          totalPrice: Number(row[9] || 0),
        };
      }

      // Push item only if it exists
      if (row[6]) {
        ordersMap[orderId].orderedItems.push({
          itemName: row[6],
          quantity: Number(row[7] || 0),
          price: Number(row[8] || 0),
        });
      }
    }

    return Object.values(ordersMap);
  }

  async findOne(orderId: string): Promise<CreateOrderDto> {
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);
    const orderRows = rows.filter(r => r.orderId === orderId);

    if (!orderRows.length) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Group rows into a single order
    const firstRow = orderRows[0];
    return {
      orderId: firstRow.orderId,
      date: firstRow.date,
      customerName: firstRow.customerName,
      customerAddress: firstRow.customerAddress,
      customerNumber: firstRow.customerNumber,
      salesAgent: firstRow.salesAgent,
      status: firstRow.status, // ✅ include
      totalPrice: orderRows.reduce((sum, r) => sum + Number(r.price) * Number(r.quantity), 0),
      orderedItems: orderRows.map(r => ({
        itemCode: r.itemCode,
        itemName: r.itemName,
        quantity: Number(r.quantity),
        price: Number(r.price),
      })),
    };
  }

}
