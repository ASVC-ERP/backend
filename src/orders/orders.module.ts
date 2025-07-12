import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [SheetsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
