import { Test, TestingModule } from '@nestjs/testing';
import { AsvcSupplierController } from './asvc-supplier.controller';

describe('AsvcSupplierController', () => {
  let controller: AsvcSupplierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsvcSupplierController],
    }).compile();

    controller = module.get<AsvcSupplierController>(AsvcSupplierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
