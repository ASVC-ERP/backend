import { Module } from '@nestjs/common';
import { PackingListService } from './packing-list.service';
import { PackingListController } from './packing-list.controller';

@Module({
  providers: [PackingListService],
  controllers: [PackingListController]
})
export class PackingListModule {}
