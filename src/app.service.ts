import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRun(): string {
    return 'Invetory management system backend running!';
  }
}
