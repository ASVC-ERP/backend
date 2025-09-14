// src/suppliers/suppliers.module.ts
import { Module } from '@nestjs/common';
import { SheetsModule } from '../sheets/sheets.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [SheetsModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
