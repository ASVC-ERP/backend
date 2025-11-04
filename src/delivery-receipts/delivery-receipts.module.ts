import { Module } from '@nestjs/common';
import { DeliveryReceiptsController } from './delivery-receipts.controller';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [CustomersModule],
  controllers: [DeliveryReceiptsController]
})
export class DeliveryReceiptsModule {}
