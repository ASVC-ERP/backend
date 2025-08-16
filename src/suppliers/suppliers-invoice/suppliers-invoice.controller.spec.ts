import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersInvoiceController } from './suppliers-invoice.controller';

describe('SuppliersInvoiceController', () => {
  let controller: SuppliersInvoiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersInvoiceController],
    }).compile();

    controller = module.get<SuppliersInvoiceController>(SuppliersInvoiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
