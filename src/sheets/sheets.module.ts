import { Module } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { SheetsController } from './sheets.controller';

@Module({
  providers: [SheetsService],
  controllers: [SheetsController],
  exports: [SheetsService], // Exporting SheetsService for use in other modules
})
export class SheetsModule {}
