import { Injectable, OnModuleInit } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as path from 'path';

@Injectable()
export class SheetsService implements OnModuleInit {
  private sheetsClient: sheets_v4.Sheets;

  async onModuleInit() {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../../credentials/credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = (await auth.getClient()) as JWT;

    this.sheetsClient = google.sheets({
      version: 'v4',
      auth: authClient,
    });
  }
  async getData(spreadsheetId: string, range: string): Promise<any[]> {
    const res = await this.sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    console.log('🔍 Google Sheets fetched data:', res.data.values);
    return res.data.values || [];
  }

  async appendData(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    await this.sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  async updateCell(spreadsheetId: string, sheetName: string, cell: string, newValue: any): Promise<void> {
    const range = `${sheetName}!${cell}`;

    await this.sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[newValue]],
      },
    });
  }

  async searchInventory(spreadsheetId: string, range: string): Promise<any[]> {
    const res = await this.sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values || [];
    const headers = rows[0];
    const items = rows.slice(1).map(row =>
      headers.reduce((acc, header, i) => {
        acc[header] = row[i];
        return acc;
      }, {})
    );

    return items;
  }
}
