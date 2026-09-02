import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../asvc-auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    const health = this.healthService.check();
    console.log("connection status: ", health.status);
    return health;
  }
}