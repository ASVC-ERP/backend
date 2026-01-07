import { Test, TestingModule } from '@nestjs/testing';
import { AsvcUsersController } from './asvc-user.controller';

describe('AsvcUsersController', () => {
  let controller: AsvcUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsvcUsersController],
    }).compile();

    controller = module.get<AsvcUsersController>(AsvcUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
