import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRun(): string {
    return 'Inventory management system backend running!';
  }
}
