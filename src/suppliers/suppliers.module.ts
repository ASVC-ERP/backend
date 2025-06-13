// app.module.ts or suppliers.module.ts
import { Module } from '@nestjs/common';
import { SheetsModule } from '../sheets/sheets.module';
import { SuppliersController } from './suppliers.controller';

@Module({
  imports: [SheetsModule],
  controllers: [SuppliersController],
})
export class SuppliersModule {}
