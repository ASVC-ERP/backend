import { Test, TestingModule } from '@nestjs/testing';
import { PrintService } from './asvc-print.service';

describe('PrintService', () => {
  let service: PrintService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrintService],
    }).compile();

    service = module.get<PrintService>(PrintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
