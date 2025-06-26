  import { Module } from '@nestjs/common';
  import { AuthController } from './auth.controller';
  import { AuthService } from './auth.service';
  import { SheetsModule } from '../sheets/sheets.module';

  @Module({
    imports: [SheetsModule],
    controllers: [AuthController],
    providers: [AuthService]
  })
  export class AuthModule {}
