import { Injectable, NotFoundException} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
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
    const orderRows = rows.filter(r => r[0] === orderId); // ✅ use r[0] for orderId

    if (!orderRows.length) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const firstRow = orderRows[0];
    return {
      orderId: firstRow[0],
      date: firstRow[1],
      customerName: firstRow[2],
      customerAddress: firstRow[3],
      customerNumber: firstRow[4],
      salesAgent: firstRow[10],
      status: firstRow[5],
      totalPrice: orderRows.reduce((sum, r) => sum + Number(r[8] || 0) * Number(r[7] || 0), 0),
      orderedItems: orderRows.map(r => ({
        itemName: r[6],
        quantity: Number(r[7] || 0),
        price: Number(r[8] || 0),
      })),
    };
  }
/*
  async update(orderId: string, dto: UpdateOrderDto): Promise<Order> {
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);

    // Find all rows belonging to this orderId
    const rowIndexes = rows
      .map((row, i) => (row[0] === orderId ? i : -1))
      .filter(i => i !== -1);

    if (rowIndexes.length === 0) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (!dto.orderedItems || dto.orderedItems.length === 0) {
      throw new Error("Update must include at least one ordered item.");
    }

    // Build new rows
    const newRows = dto.orderedItems.map(item => ([
      dto.orderId,
      dto.date,
      dto.customerName,
      dto.customerAddress,
      dto.customerNumber,
      dto.status,
      item.itemName,
      item.quantity,
      item.price,
      dto.totalPrice,
      dto.salesAgent,
    ]));

    // Overwrite each row by exact index
    for (let i = 0; i < newRows.length; i++) {
      const sheetRowNumber = rowIndexes[i] + 2; // map rowIndexes directly
      await this.sheetsService.updateRow(
        this.spreadsheetId,
        this.sheetName,
        sheetRowNumber,
        newRows[i]
      );
    }

    // If new order has fewer rows, clear leftovers
    if (newRows.length < rowIndexes.length) {
      for (let i = newRows.length; i < rowIndexes.length; i++) {
        const sheetRowNumber = rowIndexes[i] + 2;
        await this.sheetsService.clearRow(this.spreadsheetId, this.sheetName, sheetRowNumber);
      }
    }
    return dto as Order;
  }

  async update(orderId: string, dto: UpdateOrderDto): Promise<Order> {
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);

    // Find all rows for this orderId
    const rowIndexes = rows
      .map((row, i) => (row[0] === orderId ? i : -1))
      .filter(i => i !== -1);

    if (rowIndexes.length === 0) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // ✅ Existing items in sheet
    const existingItems = rowIndexes.map(i => rows[i][6]); // col G = itemName

    // ✅ Separate new vs existing
    const itemsToUpdate: any[] = [];
    const itemsToAdd: any[] = [];

    dto.orderedItems.forEach(item => {
      if (existingItems.includes(item.itemName)) {
        itemsToUpdate.push(item);
      } else {
        itemsToAdd.push(item);
      }
    });

    // ✅ Update existing rows
    for (let i = 0; i < rowIndexes.length; i++) {
      const sheetRowNumber = rowIndexes[i] + 2;
      const item = itemsToUpdate.find(it => it.itemName === rows[rowIndexes[i]][6]);
      if (item) {
        await this.sheetsService.updateRow(
          this.spreadsheetId,
          this.sheetName,
          sheetRowNumber,
          [
            dto.orderId,
            dto.date,
            dto.customerName,
            dto.customerAddress,
            dto.customerNumber,
            dto.status,
            item.itemName,
            item.quantity,
            item.price,
            dto.totalPrice,
            dto.salesAgent,
          ]
        );
      }
    }

    // ✅ Append brand new items
    if (itemsToAdd.length > 0) {
      const newRows = itemsToAdd.map(item => ([
        dto.orderId,
        dto.date,
        dto.customerName,
        dto.customerAddress,
        dto.customerNumber,
        dto.status,
        item.itemName,
        item.quantity,
        item.price,
        dto.totalPrice,
        dto.salesAgent,
      ]));
      await this.sheetsService.appendData(this.spreadsheetId, this.range, newRows);
    }

    return dto as Order;
  }
*/

  async update(orderId: string, dto: UpdateOrderDto) {
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);

    // Find rows for this order
    const orderRows = rows.filter(row => row[0] === orderId);

    if (orderRows.length === 0) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (!dto.orderedItems || dto.orderedItems.length === 0) {
      throw new Error("Update must include at least one ordered item.");
    }

    // Keep all rows not belonging to this order
    const otherRows = rows.filter(row => row[0] !== orderId);

    // Calculate totalPrice
    const totalPrice = dto.orderedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

    // Build new rows for this order
    const updatedRows = dto.orderedItems.map(item => ([
      dto.orderId,
      dto.date,
      dto.customerName,
      dto.customerAddress,
      dto.customerNumber,
      dto.status,
      item.itemName,
      item.quantity,
      item.price,
      dto.totalPrice,
      dto.salesAgent,
    ]));

    // Rewrite sheet with old orders + updated one
    await this.sheetsService.clear(this.spreadsheetId, this.range);
    await this.sheetsService.appendData(
      this.spreadsheetId,
      this.range,
      [...otherRows, ...updatedRows],
    );

    return {
      message: `Order ${orderId} updated successfully`,
      updatedItems: dto.orderedItems.length,
    };
  }

}
