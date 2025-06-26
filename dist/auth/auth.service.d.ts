import { SheetsService } from '../sheets/sheets.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly sheetsService;
    private spreadsheetId;
    private sheetName;
    private range;
    constructor(sheetsService: SheetsService);
    validateUser({ username, password }: LoginDto): Promise<{
        id: any;
        username: any;
    }>;
}
