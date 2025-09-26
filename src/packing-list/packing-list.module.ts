import { Module } from '@nestjs/common';
import { PackingListController } from './packing-list.controller';

@Module({
  controllers: [PackingListController]
})
export class PackingListModule {}
