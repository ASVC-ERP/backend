import { Controller, Get, Post, Body } from '@nestjs/common';
import { SheetsService } from './sheets.service';

const SPREADSHEET_ID = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
const RANGE = 'Sheet1!A2:D';

@Controller('sheets')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Get()
  async getData() {
    return await this.sheetsService.getData(SPREADSHEET_ID, RANGE);
  }

  @Post()
  async addData(@Body() body: any) {
    const row = [[body.name, body.quantity, body.price, new Date().toISOString()]];
    await this.sheetsService.appendData(SPREADSHEET_ID, RANGE, row);
    return { message: 'Row added' };
  }
}
