import { Test, TestingModule } from '@nestjs/testing';
import { AsvcCustomerService } from './asvc-customer.service';

describe('AsvcCustomerService', () => {
  let service: AsvcCustomerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AsvcCustomerService],
    }).compile();

    service = module.get<AsvcCustomerService>(AsvcCustomerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
