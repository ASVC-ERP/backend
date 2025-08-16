import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryReceiptsService } from './delivery-receipts.service';

describe('DeliveryReceiptsService', () => {
  let service: DeliveryReceiptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryReceiptsService],
    }).compile();

    service = module.get<DeliveryReceiptsService>(DeliveryReceiptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
