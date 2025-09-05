import { Controller, Post, Body, BadRequestException, Get, Query, Patch } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

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
    const sheetName = 'Supplier Invoice';
    const columnHeader = 'itemName'; 

    return this.inventoryService.findRowsAsObjectsByColumnHeader(
      spreadsheetId,
      sheetName,
      columnHeader,
      itemName,
    );
  }

  @Get('physical-count')
  async getPhysicalCount(@Query('itemName') itemName: string) {
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    const sheetName = 'Physical Adjustment';
    const columnHeader = 'itemName'; 

    return this.inventoryService.findRowsAsObjectsByColumnHeader(spreadsheetId,
      sheetName,
      columnHeader,
      itemName,);
  }

  @Get('sales-order-history')
  async getSalesOrderHistory(@Query('itemName') itemName: string) {
    const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    const sheetName = 'Sales Order History';
    const columnHeader = 'itemName'; 

    return this.inventoryService.findRowsAsObjectsByColumnHeader(spreadsheetId,
      sheetName,
      columnHeader,
      itemName,);
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

    return this.inventoryService.updateInventoryItem(spreadsheetId, body.itemName, {
      brand: body.brand,
      minStock: body.minStock,
      partNum: body.partNum,
      interNum: body.interNum,
      unit: body.unit,
      model: body.model,
      category: body.category,
    });
  }

}
