import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryReceiptsController } from './delivery-receipts.controller';

describe('DeliveryReceiptsController', () => {
  let controller: DeliveryReceiptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryReceiptsController],
    }).compile();

    controller = module.get<DeliveryReceiptsController>(DeliveryReceiptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
