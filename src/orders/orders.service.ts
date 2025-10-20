import { Injectable, NotFoundException} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';
import { SheetsService } from '../sheets/sheets.service';

export type Order = CreateOrderDto;

@Injectable()
export class OrdersService {
  private spreadsheetId: string;
  
  constructor(private readonly sheetsService: SheetsService,
    private readonly configService: ConfigService,
  ) {
    const id = this.configService.get<string>('SPREADSHEET_ID');
    if (!id) { throw new Error('SPREADSHEET_ID is not set in environment variables'); }
    this.spreadsheetId = id;
  }

  private sheetName = 'Sales Order';
  private range = `${this.sheetName}!A2:P`;

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
      order.discount || 0,   // K
      order.customerTIN || '', // L
      order.salesAgent,       // M
      '',                    // N
      item.unit || '',       // O
      item.itemCode,
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
          customerTIN: row[11],
          salesAgent: row[12],
          approvalStatus: row[13] || '',
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
          unit: row[14] || '',
          itemCode: row[15] || '',
        });
      }
    }

    // Convert to array and sort by date (assuming a.date is in a valid date format like "2025-09-19")
    const sortedOrders = Object.values(ordersMap).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending (newest first). Use `dateA - dateB` for ascending.
    });

    return sortedOrders;
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
      status: firstRow[5],
      salesAgent: firstRow[12],
      customerTIN: firstRow[11],
      approvalStatus: firstRow[13] || '',
      totalPrice: orderRows.reduce((sum, r) => sum + Number(r[8] || 0) * Number(r[7] || 0), 0),
      orderedItems: orderRows.map(r => ({
        itemName: r[6],
        quantity: Number(r[7] || 0),
        price: Number(r[8] || 0),
        discount: Number(r[11] || 0),
        unit: r[14] || '',
        itemCode: r[15] || '',
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
      totalPrice,
      dto.discount ?? 0,
      dto.customerTIN ?? '',
      dto.salesAgent,
      item.unit || '',
      item.itemCode || '',
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
  private readonly approvalSheet = 'Approval!A:D';

  async serveApprovedOrders(orderIds: string[]) {
    console.log(`[serveApprovedOrders] Starting process for ${orderIds.length} orders:`, orderIds);

    // 1. Fetch all necessary data in parallel
    console.log('[serveApprovedOrders] Step 1: Fetching approval sheet data and sales order headers...');
    const [approvalSheetData, ordersHeader] = await Promise.all([
      this.sheetsService.getData(this.spreadsheetId, this.approvalSheet),
      this.sheetsService.getData(this.spreadsheetId, `${this.sheetName}!1:1`),
    ]);

    const approvalHeaders = approvalSheetData?.[0] || [];
    const approvalOrderIdCol = approvalHeaders.indexOf('orderId');
    const approvalItemNameCol = approvalHeaders.indexOf('itemName');
    const approvalQtyServedCol = approvalHeaders.indexOf('quantityServed');
    const approvalQtyUnservedCol = approvalHeaders.indexOf('quantityUnserved');

    if ([approvalOrderIdCol, approvalItemNameCol, approvalQtyServedCol, approvalQtyUnservedCol].includes(-1)) {
      throw new Error('Approval sheet is missing required columns: orderId, itemName, quantityServed, quantityUnserved');
    }

    type SuccessResult = {
      orderId: string;
      status: 'success';
      message: string;
      rowsLogged: { history: number; invoice: number };
      invoiceId: string;
    };
    type ErrorResult = { orderId: string; status: 'error'; message: string };
    const results: (SuccessResult | ErrorResult)[] = [];
    for (const orderId of orderIds) {
      try {
        console.log(`[serveApprovedOrders] Processing orderId: ${orderId}`);
        // 2. Build serveData for each order
        console.log(`[serveApprovedOrders] Step 2.1: Fetching original order data for ${orderId}...`);
        const orderData = await this.findOne(orderId);
        console.log(`[serveApprovedOrders] Step 2.2: Building serveData for ${orderId} from approval sheet...`);
        const approvalDataForOrder = approvalSheetData
          .slice(1) // Skip header
          .filter(row => row[approvalOrderIdCol] === orderId)
          .reduce((acc, row) => {
            const itemName = row[approvalItemNameCol];
            if (itemName) {
              acc[itemName] = {
                quantityServed: Number(row[approvalQtyServedCol] || 0),
                quantityUnserved: Number(row[approvalQtyUnservedCol] || 0),
              };
            }
            return acc;
          }, {} as Record<string, { quantityServed: number; quantityUnserved: number }>);

        const serveData: ServeOrderDto = {
          date: orderData.date,
          customerName: orderData.customerName,
          customerAddress: orderData.customerAddress,
          customerNumber: orderData.customerNumber,
          customerTIN: orderData.customerTIN,
          salesAgent: orderData.salesAgent,
          items: orderData.orderedItems.map(item => ({
            itemName: item.itemName,
            price: item.price,
            quantityOrdered: item.quantity,
            quantityServed: approvalDataForOrder[item.itemName]?.quantityServed ?? 0,
            quantityUnserved: approvalDataForOrder[item.itemName]?.quantityUnserved ?? 0,
            itemCode: item.itemCode,
            unit: item.unit,
          })),
        };
        console.log(`[serveApprovedOrders] Constructed serveData for ${orderId}:`, JSON.stringify(serveData, null, 2));

        // 3. Execute admin logic
        console.log(`[serveApprovedOrders] Step 3: Executing admin logic for ${orderId}...`);
        const result = await this._serveOrderAdminLogic(orderId, serveData, ordersHeader);
        console.log(`[serveApprovedOrders] Admin logic successful for ${orderId}.`);
        results.push({ orderId, status: 'success', ...result } as SuccessResult);

        // 4. Clear served order from Approval sheet
        console.log(`[serveApprovedOrders] Step 4: Clearing served order ${orderId} from Approval sheet...`);
        const rowsToKeep = approvalSheetData.filter(row => row[approvalOrderIdCol] !== orderId);
        await this.sheetsService.clear(this.spreadsheetId, this.approvalSheet);
        await this.sheetsService.appendData(this.spreadsheetId, this.approvalSheet, rowsToKeep);
        console.log(`[serveApprovedOrders] Successfully processed and cleared order ${orderId}.`);

      } catch (error: unknown) {
        console.error(`[serveApprovedOrders] FAILED to serve order ${orderId}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        results.push({ orderId, status: 'error', message });
      }
    }

    return {
      message: 'Finished serving approved orders.',
      summary: `Processed ${orderIds.length} orders. Success: ${results.filter(r => r.status === 'success').length}, Error: ${results.filter(r => r.status === 'error').length}.`,
      results,
    };
  }

  async serveOrder(orderId: string, serveData: ServeOrderDto, role: string) {
  try {
    console.log(`Serving order ${orderId} by role: ${role}`);
    console.log('Incoming serveData:', serveData);
    // -------------------------------
    // 1) Update Orders sheet status
    // -------------------------------
    const ordersHeader = await this.sheetsService.getData(
      this.spreadsheetId,
      `${this.sheetName}!1:1`, // adjust to your actual Orders sheet name
    );

    if (role === 'admin') {
      return this._serveOrderAdminLogic(orderId, serveData, ordersHeader);
    } else { 
      // for agent role 
      const headers = ordersHeader?.[0] || [];
      const orderIdCol = headers.indexOf('orderID');
      const statusCol = headers.indexOf('status');
      const approvalStatusCol = headers.indexOf('approvalStatus');

      if (orderIdCol === -1 || statusCol === -1 || approvalStatusCol === -1) {
        throw new Error('Orders sheet must have "orderId", "status", and "approvalStatus" columns');
      }

      const orderRows = await this.sheetsService.getData(
        this.spreadsheetId,
        `${this.sheetName}!A2:Z`
      );
      // Find all row indices for the given orderId
      const matchingRowIndices = orderRows.reduce((acc, row, index) => {
        if ((row[orderIdCol] || '').toString().trim() === orderId) {
          acc.push(index);
        }
        return acc;
      }, [] as number[]);

      // 1) Append to Approval sheet
      const approvalRows = serveData.items.map(item => [
        orderId,
        item.itemName,
        item.quantityServed,
        item.quantityUnserved,
      ]);

      await this.sheetsService.appendData(
        this.spreadsheetId,
        this.approvalSheet,
        approvalRows,
      );

      // 2) Update Sales Order sheet status
      if (matchingRowIndices.length > 0) {
        const statusColLetter = String.fromCharCode(65 + statusCol);
        const approvalStatusColLetter = String.fromCharCode(65 + approvalStatusCol);
        const updatePromises: Promise<void>[] = [];

        for (const rowIndex of matchingRowIndices) {
          const sheetRow = rowIndex + 2; // +2 because sheets are 1-based and we skipped the header

          // Update status to 'Pending'
          updatePromises.push(this.sheetsService.updateCell(
            this.spreadsheetId,
            this.sheetName,
            `${statusColLetter}${sheetRow}`,
            'For Request',
          ));
          // Update approvalStatus to 'Pending'
          updatePromises.push(this.sheetsService.updateCell(
            this.spreadsheetId,
            this.sheetName,
            `${approvalStatusColLetter}${sheetRow}`,
            'Pending',
          ));
        }
        await Promise.all(updatePromises);
      }

      return {
        message: 'Order submitted for approval.',
        orderId,
        itemsForApproval: approvalRows.length,
      };
    }
  } catch (err) {
    console.error('serveOrder error:', err);
    throw err; // rethrow so NestJS still returns 500
  }
}

  private async _serveOrderAdminLogic(orderId: string, serveData: ServeOrderDto, ordersHeader: any[][]) {
    const headers = ordersHeader?.[0] || [];
    const orderIdCol = headers.indexOf('orderID');
    const statusCol = headers.indexOf('status');
    const approvalStatusCol = headers.indexOf('approvalStatus');

    if (orderIdCol === -1 || statusCol === -1 || approvalStatusCol === -1) {
      throw new Error('Orders sheet must have "orderId" and "status" columns');
    } 

      // -------------------------------
      // 1.1) Update Orders sheet status for Admin
      // -------------------------------
      const orderRows = await this.sheetsService.getData(this.spreadsheetId, `${this.sheetName}!A2:Z`);
      // Find all row indices for the given orderId
      const matchingRowIndices = orderRows.reduce((acc, row, index) => {
        if ((row[orderIdCol] || '').toString().trim() === orderId) {
          acc.push(index);
        }
        return acc;
      }, [] as number[]);

      if (matchingRowIndices.length > 0) {
        const approvalStatusColLetter = String.fromCharCode(65 + approvalStatusCol);
        const statusColLetter = String.fromCharCode(65 + statusCol);
        const updatePromises: Promise<void>[] = [];

        for (const rowIndex of matchingRowIndices) {
          const sheetRow = rowIndex + 2; // +2 because sheets are 1-based and we skipped the header
          updatePromises.push(this.sheetsService.updateCell(
            this.spreadsheetId,
            this.sheetName,
            `${approvalStatusColLetter}${sheetRow}`,
            'Approved'
          ));
          updatePromises.push(this.sheetsService.updateCell(
            this.spreadsheetId,
            this.sheetName,
            `${statusColLetter}${sheetRow}`,
            'Served'
          ));
        }
        await Promise.all(updatePromises);
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
        item.itemCode,
      ]);

      await this.sheetsService.appendData(
        this.spreadsheetId,
        this.salesOrderHistorySheet,
        historyRows
      );

      // -------------------------------
      // 3) Append to Sales Invoice (status Pending)
      // -------------------------------
      const date = new Date();
      const formattedDate = date.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
      const invoiceId = `INV-${orderId}-${formattedDate}`;

      // 🔍 Debug logs
      console.log("Raw date:", date);
      console.log("Formatted date:", formattedDate);
      console.log("Generated invoiceID:", invoiceId);
      const invoiceRows = serveData.items.map(item => {
        const quantity = item.quantityServed ?? item.quantityOrdered ?? 0;
        const price = item.price ?? 0;

        return [
          invoiceId,                 // A: invoiceID
          serveData.date,            // B: date
          serveData.customerName,    // C: customerName
          serveData.customerAddress || '', // D: customerAddress
          serveData.customerNumber || '',  // E: customerNumber
          '',                        // F: waybillNumber (empty at creation)
          item.itemName || '',       // G: itemName
          quantity,                  // H: quantity
          price,                     // I: price
          quantity * price,          // J: totalPrice
          serveData.salesAgent || '',// K: salesAgent
          serveData.customerTIN || '', // L: customerTIN
          item.unit || '',           // M: unit
          item.itemCode || '',
        ];
      });

      console.log("invoiceRows: ", invoiceRows);

      await this.sheetsService.appendData(
        this.spreadsheetId,
        this.salesInvoiceSheet,
        invoiceRows
      );

      // -------------------------------
      // 4) Adjust Inventory Stock
      // -------------------------------
      console.log(`[serveOrderAdminLogic] Step 4: Adjusting inventory stock for order ${orderId}...`);
      const inventorySheetName = 'Inventory';
      const inventoryRows = await this.sheetsService.getData(this.spreadsheetId, `${inventorySheetName}!A1:Z`);
      if (inventoryRows.length < 2) {
        console.error('[serveOrderAdminLogic] Inventory sheet is empty or has no data rows.');
      } else {
        const inventoryHeaders = inventoryRows[0];
        const itemNameCol = inventoryHeaders.indexOf('itemName');
        const stockCol = inventoryHeaders.indexOf('stock');

        if (itemNameCol === -1 || stockCol === -1) {
          throw new Error('Inventory sheet must have "itemName" and "stock" columns.');
        }

        const stockUpdatePromises: Promise<void>[] = [];

        for (const item of serveData.items) {
          if (item.quantityServed > 0) {
            const itemRowIndex = inventoryRows.findIndex((row, index) => index > 0 && row[itemNameCol] === item.itemName);

            if (itemRowIndex !== -1) {
              const currentStock = Number(inventoryRows[itemRowIndex][stockCol] || 0);

              if (currentStock < item.quantityServed) {
                throw new Error(`Insufficient stock for item "${item.itemName}". Available: ${currentStock}, Required: ${item.quantityServed}.`);
              }

              const newStock = currentStock - item.quantityServed;
              
              // The sheet row is index + 1 because sheets are 1-based
              const sheetRow = itemRowIndex + 1;
              const stockColLetter = String.fromCharCode(65 + stockCol);
              const stockCellAddress = `${stockColLetter}${sheetRow}`;

              console.log(`[serveOrderAdminLogic] Updating stock for "${item.itemName}": from ${currentStock} to ${newStock}.`);
              stockUpdatePromises.push(
                this.sheetsService.updateCell(this.spreadsheetId, inventorySheetName, stockCellAddress, newStock)
              );
            } else {
              console.warn(`[serveOrderAdminLogic] WARNING: Item "${item.itemName}" from order ${orderId} not found in Inventory. Stock not updated.`);
            }
          }
        }
        await Promise.all(stockUpdatePromises);
        console.log(`[serveOrderAdminLogic] Inventory stock adjustment completed for order ${orderId}.`);
      }

      return {
        message: 'Order served, history logged, invoice created',
        rowsLogged: {
          history: historyRows.length,
          invoice: invoiceRows.length,
        },
        invoiceId,
      };
  }
  
  async getSalesOrdersByStatus(status: string): Promise<Record<string, string>[]> {
    // Step 1: Read all rows from the "Sales Order" sheet
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.sheetName);
    if (rows.length === 0) return [];
  
    // Step 2: Get header row
    const headers = rows[0];
    const statusIndex = headers.indexOf('approvalStatus');
    const orderIdIndex = headers.indexOf('orderID');
  
    if (statusIndex === -1 || orderIdIndex === -1) {
      throw new Error(`Columns "orderId" and/or "approvalStatus" not found in ${this.sheetName} sheet`);
        }
    
      // Step 3: Filter rows where status matches and collect unique orders
      const uniqueOrders = new Map<string, string[]>();
      const matchingRows = rows.slice(1).filter(
        (row) => row[statusIndex]?.toLowerCase() === status.toLowerCase(),
      );
    
      for (const row of matchingRows) {
        const orderId = row[orderIdIndex];
        if (orderId && !uniqueOrders.has(orderId)) {
          uniqueOrders.set(orderId, row);
        }
      }
    
      // Step 4: Map unique rows into objects
      const result: Record<string, string>[] = Array.from(uniqueOrders.values()).map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] ?? '';
        });
        return obj;
      });
      return result;
    }

  async rejectOrders(orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) {
      return { message: 'No order IDs provided' };
    }

    console.log("orderIds:", orderIds);

    // 1️⃣ Get all rows from the sheet
    const rows = await this.sheetsService.getData(this.spreadsheetId, this.sheetName);

    // 2️⃣ Loop through rows and find matching order IDs
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const orderId = row[0]?.trim(); // Column A = orderID

      if (orderIds.includes(orderId)) {
        const sheetRowNumber = i + 1; // +2 because row[0] = header row 1 in Sheets
        console.log(`Updating row ${sheetRowNumber} for orderId: ${orderId}`);

        // 3️⃣ Update only the "status" (column F) and "approvalStatus" (column N)
        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `F${sheetRowNumber}`, // status column
          'Pending',
        );

        await this.sheetsService.updateCell(
          this.spreadsheetId,
          this.sheetName,
          `N${sheetRowNumber}`, // approvalStatus column
          '',
        );
      }
    }

    return { message: 'Orders rejected successfully' };
  }


}