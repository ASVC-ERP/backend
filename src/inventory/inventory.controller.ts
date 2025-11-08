import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from './inventory.service';
import { ItemsService } from '../items/items.service';

@Controller('inventory')
export class InventoryController {
  private spreadsheetId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryService,
    private readonly itemsService: ItemsService,
  ) {
    const id = this.configService.get<string>('SPREADSHEET_ID');
    if (!id) {
      throw new Error('SPREADSHEET_ID is not set in environment variables');
    }
    this.spreadsheetId = id;
  }

  @Post('add')
  async addInventory(@Body() body: any) {
    const result = await this.inventoryService.processPurchase(body);
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return result;
  }
  /*
  @Get('cost-history')
  async findByHeaderObjects(@Query('itemCode') itemCode: string) {
    const supplierSheet = 'Supplier Invoice';
    const columnHeader = 'itemCode';

    // 1. Get all supplier invoice rows for this item
    const history = await this.inventoryService.findRowsAsObjectsByColumnHeader(
      this.spreadsheetId,
      supplierSheet,
      columnHeader,
      itemCode,
    );

    // 2. Get Inventory sheet data
    const inventory = await this.itemsService.findAll(); // returns items with price info
    const itemInfo = inventory.find((r) => r.itemCode === itemCode);

    // 3. Add prices to each history row as separate fields
    const updatedHistory = history.map((row) => {
      if (itemInfo?.price) {
        return {
          ...row,
          price1: itemInfo.price.price1,
          price2: itemInfo.price.price2,
          price3: itemInfo.price.price3,
        };
      }
      return row;
    });

    return updatedHistory;
  }
*/
  @Get('cost-history')
  async getCostHistory(@Query('itemCode') itemCode: string) {
    if (!itemCode) {
      throw new BadRequestException('itemCode is required');
    }

    const supplierSheet = 'Supplier Invoice';
    const supplierInfoSheet = 'Supplier';
    const columnHeader = 'itemCode';

    // 1️⃣ Fetch all supplier invoice rows for this itemCode
    const history = await this.inventoryService.findRowsAsObjectsByColumnHeader(
      this.spreadsheetId,
      supplierSheet,
      columnHeader,
      itemCode.trim(),
    );

    if (!history.length) return [];

    // 2️⃣ Collect all unique supplier IDs
    const supplierIDs = [
      ...new Set(history.map((row) => row.supplierID).filter(Boolean)),
    ];

    // 3️⃣ Fetch supplier details for each ID
    const supplierDetails: Record<string, any> = {};
    for (const id of supplierIDs) {
      const supplierRow =
        await this.inventoryService.findRowsAsObjectsByColumnHeader(
          this.spreadsheetId,
          supplierInfoSheet,
          'id', // column in Supplier sheet
          id.trim(),
        );

      if (supplierRow.length > 0) {
        supplierDetails[id] = supplierRow[0]; // store supplier info keyed by its ID
      }
    }

    // 4️⃣ Combine everything
    const updatedHistory = history.map((row) => ({
      ...row,
      supplierName: supplierDetails[row.supplierID]?.name ?? null, // ✅ fixed key
    }));

    return updatedHistory;
  }

  @Get('physical-count')
  async getPhysicalCount(@Query('itemCode') itemCode: string) {
    const sheetName = 'Physical Adjustment';
    const columnHeader = 'itemCode';

    return this.inventoryService.findRowsAsObjectsByColumnHeader(
      this.spreadsheetId,
      sheetName,
      columnHeader,
      itemCode,
    );
  }

  @Get('sales-order-history')
  async getSalesOrderHistory(@Query('itemCode') itemCode: string) {
    const sheetName = 'Sales Order History';
    const columnHeader = 'itemCode';

    return this.inventoryService.findRowsAsObjectsByColumnHeader(
      this.spreadsheetId,
      sheetName,
      columnHeader,
      itemCode,
    );
  }

  @Get('sales-order-history/get-order-id')
  async getByOrder(@Query('orderId') orderId: string) {
    return this.inventoryService.findRowsAsObjectsByColumnHeader(
      this.spreadsheetId,
      'Sales Order History',
      'orderID',
      orderId,
    );
  }

  @Get('adjust-stock')
  async adjustStock(
    @Query('itemName') itemName: string,
    @Query('PIC') PIC: string,
    @Query('stock') stock: string,
    @Query('remarks') remarks: string,
  ) {
    return this.inventoryService.adjustStock(
      this.spreadsheetId,
      itemName,
      PIC,
      Number(stock),
      remarks,
    );
  }

  @Get('update-price')
  async updatePrice(
    @Query('itemName') itemName: string,
    @Query('price') price: string,
  ) {
    return this.inventoryService.updateItemPrice(
      this.spreadsheetId,
      itemName,
      Number(price),
    );
  }

  @Patch('update-inventory')
  async updateInventory(@Body() body: any) {
    return this.inventoryService.updateInventoryItem(
      this.spreadsheetId,
      body.itemCode,
      {
        itemName: body.itemName,
        brand: body.brand,
        minStock: body.minStock,
        partNum: body.partNum,
        interNum: body.interNum,
        unit: body.unit,
        model: body.model,
        origin: body.origin,
      },
    );
  }
}
