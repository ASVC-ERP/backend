import { Test, TestingModule } from '@nestjs/testing';
import { AsvcOrderService } from './asvc-order.service';

describe('AsvcOrderService', () => {
  let service: AsvcOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AsvcOrderService],
    }).compile();

    service = module.get<AsvcOrderService>(AsvcOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
