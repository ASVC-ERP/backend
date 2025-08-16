import { Module } from '@nestjs/common';
import { DeliveryReceiptsController } from './delivery-receipts.controller';
import { DeliveryReceiptsService } from './delivery-receipts.service';

@Module({
  controllers: [DeliveryReceiptsController],
  providers: [DeliveryReceiptsService]
})
export class DeliveryReceiptsModule {}
