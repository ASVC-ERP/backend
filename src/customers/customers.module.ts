import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [SheetsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
