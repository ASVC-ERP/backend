import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersInvoiceService } from './suppliers-invoice.service';

describe('SuppliersInvoiceService', () => {
  let service: SuppliersInvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersInvoiceService],
    }).compile();

    service = module.get<SuppliersInvoiceService>(SuppliersInvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
