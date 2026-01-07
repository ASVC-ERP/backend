import { Test, TestingModule } from '@nestjs/testing';
import { AsvcSupplierService } from './asvc-supplier.service';

describe('AsvcSupplierService', () => {
  let service: AsvcSupplierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AsvcSupplierService],
    }).compile();

    service = module.get<AsvcSupplierService>(AsvcSupplierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
