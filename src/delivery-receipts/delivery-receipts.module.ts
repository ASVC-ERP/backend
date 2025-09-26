import { Module } from '@nestjs/common';
import { DeliveryReceiptsController } from './delivery-receipts.controller';

@Module({
  controllers: [DeliveryReceiptsController]
})
export class DeliveryReceiptsModule {}
