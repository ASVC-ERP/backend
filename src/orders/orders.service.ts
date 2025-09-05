import { Injectable, NotFoundException} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Order = CreateOrderDto;

@Injectable()
export class OrdersService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private sheetName = 'Sales Order';
  private range = `${this.sheetName}!A2:K`;

  constructor(private readonly sheetsService: SheetsService) {}

  async create(order: CreateOrderDto): Promise<Order> {
    const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);

    const exists = existingRows.some(row => row[0] === order.orderId);
    if (exists) {
      throw new Error(`Order ID "${order.orderId}" already exists.`);
    }

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

    const otherRows = rows.filter(row => row[0] !== orderId);
    const totalPrice = dto.orderedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

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

  private readonly salesOrderHistorySheet = 'Sales Order History!A:I';
  private readonly salesInvoiceSheet = 'Sales Invoice!A:K';

  async serveOrder(orderId: string, serveData: ServeOrderDto) {
  try {
    console.log('Incoming serveData:', serveData);
    // -------------------------------
    // 1) Update Orders sheet status
    // -------------------------------
    const ordersHeader = await this.sheetsService.getData(
      this.spreadsheetId,
      `${this.sheetName}!1:1`, // adjust to your actual Orders sheet name
    );
    const headers = ordersHeader?.[0] || [];
    const orderIdCol = headers.indexOf('orderID');
    const statusCol = headers.indexOf('status');

    if (orderIdCol === -1 || statusCol === -1) {
      throw new Error('Orders sheet must have "orderId" and "status" columns');
    }

    const orderRows = await this.sheetsService.getData(
      this.spreadsheetId,
      `${this.sheetName}!A2:Z`
    );
    const foundRowIndex = orderRows.findIndex(
      row => (row[orderIdCol] || '').toString().trim() === orderId
    );
    if (foundRowIndex !== -1) {
      const sheetRow = foundRowIndex + 2; // offset for header
      const statusColLetter = String.fromCharCode(65 + statusCol); // A=65
      const statusCell = `${statusColLetter}${sheetRow}`;
      await this.sheetsService.updateCell(
        this.spreadsheetId,
        this.sheetName,
        statusCell,
        'Served'
      );
    }

    // -------------------------------
    // 2) Append to Sales Order History
    // -------------------------------
    const historyRows = serveData.items.map(item => [
      serveData.date,
      orderId,
      serveData.customerName,
      item.price,
      item.itemName,
      item.quantityOrdered,
      item.quantityServed,
      item.quantityUnserved,
      item.price * item.quantityOrdered,
    ]);

    await this.sheetsService.appendData(
      this.spreadsheetId,
      this.salesOrderHistorySheet,
      historyRows
    );

    // -------------------------------
    // 3) Append to Sales Invoice (status Pending)
    // -------------------------------
    const invoiceId = `INV-${orderId}-${Date.now()}`; // simple unique ID
    const invoiceRows = serveData.items.map(item => [
      invoiceId,
      serveData.date,
      serveData.customerName,
      serveData.customerAddress || '',
      serveData.customerNumber || '',
      'Pending',
      item.itemName,
      item.quantityServed ?? item.quantityOrdered,
      item.price,
      item.price * (item.quantityServed ?? item.quantityOrdered),
      serveData.salesAgent || '',
    ]);

    await this.sheetsService.appendData(
      this.spreadsheetId,
      this.salesInvoiceSheet,
      invoiceRows
    );

    return {
      message: 'Order served, history logged, invoice created',
      rowsLogged: {
        history: historyRows.length,
        invoice: invoiceRows.length,
      },
      invoiceId,
    };
  } catch (err) {
    console.error('serveOrder error:', err);
    throw err; // rethrow so NestJS still returns 500
  }
}


}
