import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SheetsService } from '../sheets/sheets.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private sheetName = 'Users';
  private range = `${this.sheetName}!A1:F`; // skip header row

  private spreadsheetId: string;
  
  constructor(private readonly sheetsService: SheetsService,
    private readonly configService: ConfigService,
  ) {
    const id = this.configService.get<string>('SPREADSHEET_ID');
    if (!id) { throw new Error('SPREADSHEET_ID is not set in environment variables'); }
    this.spreadsheetId = id;
  }

  async validateUser({ username, password }: LoginDto) {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    for (const row of data) {
      const [id, storedUsername, storedPassword, firstName, lastName, role] = row;

      if (
        storedUsername?.trim() === username &&
        storedPassword?.trim() === password
      ) {
        return { 
          id, 
          username: storedUsername, 
          firstName,
          lastName,
          role
        };
      }
    }

    throw new UnauthorizedException('Invalid credentials');
  }
}
