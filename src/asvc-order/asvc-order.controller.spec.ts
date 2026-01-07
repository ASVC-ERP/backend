import { Test, TestingModule } from '@nestjs/testing';
import { AsvcOrderController } from './asvc-order.controller';

describe('AsvcOrderController', () => {
  let controller: AsvcOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsvcOrderController],
    }).compile();

    controller = module.get<AsvcOrderController>(AsvcOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
