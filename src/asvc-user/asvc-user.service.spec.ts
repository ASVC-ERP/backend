import { Test, TestingModule } from '@nestjs/testing';
import { AsvcUsersService } from './asvc-user.service';

describe('AsvcUsersService', () => {
  let service: AsvcUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AsvcUsersService],
    }).compile();

    service = module.get<AsvcUsersService>(AsvcUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
