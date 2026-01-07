import { Test, TestingModule } from '@nestjs/testing';
import { AsvcCustomerController } from './asvc-customer.controller';

describe('AsvcCustomerController', () => {
  let controller: AsvcCustomerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsvcCustomerController],
    }).compile();

    controller = module.get<AsvcCustomerController>(AsvcCustomerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
