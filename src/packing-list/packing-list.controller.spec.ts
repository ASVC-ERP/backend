import { Test, TestingModule } from '@nestjs/testing';
import { PackingListController } from './packing-list.controller';

describe('PackingListController', () => {
  let controller: PackingListController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackingListController],
    }).compile();

    controller = module.get<PackingListController>(PackingListController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
