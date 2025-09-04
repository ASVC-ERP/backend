import { Test, TestingModule } from '@nestjs/testing';
import { PackingListService } from './packing-list.service';

describe('PackingListService', () => {
  let service: PackingListService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PackingListService],
    }).compile();

    service = module.get<PackingListService>(PackingListService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
