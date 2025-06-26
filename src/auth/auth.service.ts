import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI'; // same ID
  private sheetName = 'Users';
  private range = `${this.sheetName}!A1:C`; // skip header row

  constructor(private readonly sheetsService: SheetsService) {}

  async validateUser({ username, password }: LoginDto) {
    const data = await this.sheetsService.getData(this.spreadsheetId, this.range);

    for (const row of data) {
      const [id, storedUsername, storedPassword] = row;

      if (
        storedUsername?.trim() === username &&
        storedPassword?.trim() === password
      ) {
        return { id, username: storedUsername };
      }
    }

    throw new UnauthorizedException('Invalid credentials');
  }
}
