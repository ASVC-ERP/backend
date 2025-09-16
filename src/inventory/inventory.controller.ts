import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
  Patch,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ItemsService } from '../items/items.service';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly itemsService: ItemsService,
  ) {}

  @Post('add')
  async addInventory(@Body() body: any) {
    const result = await this.inventoryService.processPurchase(body);
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return result;
  }

  @Get('cost-history')
  async findByHeaderObjects(@Query('itemName') itemName: string) {
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    const supplierSheet = 'Supplier Invoice';
    const columnHeader = 'itemName';

    // 1. Get all supplier invoice rows for this item
    const history = await this.inventoryService.findRowsAsObjectsByColumnHeader(
      spreadsheetId,
      supplierSheet,
      columnHeader,
      itemName,
    );

    // 2. Get Inventory sheet data
    const inventory = await this.itemsService.findAll(); // returns items with price info
    const itemInfo = inventory.find((r) => r.itemName === itemName);

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

  @Get('physical-count')
  async getPhysicalCount(@Query('itemName') itemName: string) {
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    const sheetName = 'Physical Adjustment';
    const columnHeader = 'itemName';

    return this.inventoryService.findRowsAsObjectsByColumnHeader(
      spreadsheetId,
      sheetName,
      columnHeader,
      itemName,
    );
  }

  @Get('sales-order-history')
  async getSalesOrderHistory(@Query('itemName') itemName: string) {
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    const sheetName = 'Sales Order History';
    const columnHeader = 'itemName';

    return this.inventoryService.findRowsAsObjectsByColumnHeader(
      spreadsheetId,
      sheetName,
      columnHeader,
      itemName,
    );
  }

  @Get('adjust-stock')
  async adjustStock(
    @Query('itemName') itemName: string,
    @Query('PIC') PIC: string,
    @Query('stock') stock: string,
    @Query('remarks') remarks: string,
  ) {
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';

    return this.inventoryService.adjustStock(
      spreadsheetId,
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
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';

    return this.inventoryService.updateItemPrice(
      spreadsheetId,
      itemName,
      Number(price),
    );
  }

  @Patch('update-inventory')
  async updateInventory(@Body() body: any) {
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';

    return this.inventoryService.updateInventoryItem(
      spreadsheetId,
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
