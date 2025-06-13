import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SheetsService } from './sheets.service';

@Controller('sheets')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Get()
  async getData(
    @Query('spreadsheetId') spreadsheetId: string,
    @Query('range') range: string,
  ) {
    return await this.sheetsService.getData(spreadsheetId, range);
  }

  @Post()
  async addData(@Body() body: any) {
    const { spreadsheetId, range, values } = body;
    //const row = [[body.name, body.quantity, body.price, new Date().toISOString()]];
    await this.sheetsService.appendData(spreadsheetId, range, values);
    return { message: 'Row added' };
  }
}
