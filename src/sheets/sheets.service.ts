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

  // Helper: get sheetId from sheet name
  private async getSheetId(
    spreadsheetId: string,
    sheetName: string,
  ): Promise<number> {
    const res = await this.sheetsClient.spreadsheets.get({ spreadsheetId });
    const sheet = res.data.sheets?.find(
      (s) => s.properties?.title === sheetName,
    );

    if (!sheet || !sheet.properties?.sheetId) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    return sheet.properties.sheetId;
  }

  async getData(spreadsheetId: string, range: string): Promise<any[]> {
    const res = await this.sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    console.log('Google Sheets fetched data:', res.data.values);
    return res.data.values || [];
  }

  async clearRow(spreadsheetId: string, sheetName: string, row: number) {
    const range = `${sheetName}!A${row}:K${row}`; // A–K = your 11 columns
    await this.sheetsClient.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }

  // Delete row by name
  async deleteRowByName(
    spreadsheetId: string,
    sheetName: string,
    rowNumber: number,
  ) {
    const sheetId = await this.getSheetId(spreadsheetId, sheetName);
    await this.sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // zero-based
                endIndex: rowNumber, // exclusive
              },
            },
          },
        ],
      },
    });
  }

  async appendData(
    spreadsheetId: string,
    range: string,
    values: any[][],
  ): Promise<void> {
    await this.sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  // 🔥 NEW: Clear a range
  async clear(spreadsheetId: string, range: string) {
    await this.sheetsClient.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }

  // 🔥 OPTIONAL: Update specific rows instead of full clear/append
  async updateData(spreadsheetId: string, range: string, values: any[][]) {
    console.log('Updating spreadsheet:', spreadsheetId);
    console.log('Range:', range);
    console.log('Values:', values);
    const result = await this.sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    console.log('Update response:', result.data);
  }

  // ✅ Update one row at a specific row number
  async updateRow(
    spreadsheetId: string,
    sheetName: string,
    rowNumber: number,
    values: any[],
  ) {
    const range = `${sheetName}!A${rowNumber}:K${rowNumber}`; // A–K columns
    await this.sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
  }

  async updateCell(
    spreadsheetId: string,
    sheetName: string,
    cell: string,
    newValue: any,
  ): Promise<void> {
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
    const items = rows.slice(1).map((row) =>
      headers.reduce((acc, header, i) => {
        acc[header] = row[i];
        return acc;
      }, {}),
    );

    return items;
  }

  async updateInventoryStock(
    spreadsheetId: string,
    sheetName: string,
    itemName: string,
    quantityToAdd: number,
  ): Promise<void> {
    const range = `${sheetName}!A2:K`;
    const data = await this.getData(spreadsheetId, range);

    if (!data) {
      throw new Error('Inventory sheet is empty or could not fetch data.');
    }

    console.log(
      'Updating stock for item:',
      itemName,
      'by quantity:',
      quantityToAdd,
    );
    console.log('Current inventory data:', data);

    let found = false;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (
        row[1]?.toString().trim().toLowerCase() ===
        itemName.trim().toLowerCase()
      ) {
        const currentStock = Number(row[4] ?? 0);
        const newStock = currentStock + quantityToAdd;

        const stockCell = `${sheetName}!E${i + 2}`;
        await this.updateData(spreadsheetId, stockCell, [[newStock]]);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(
        `Item "${itemName}" not found in inventory sheet "${sheetName}".`,
      );
    }
  }

  async deleteRow(spreadsheetId: string, sheetName: string, rowIndex: number) {
    if (!this.sheetsClient) {
      throw new Error('Sheets client not initialized');
    }

    // Get sheetId using your helper
    const sheetId = await this.getSheetId(spreadsheetId, sheetName);

    // Delete the row
    await this.sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex, // 0-indexed
                endIndex: rowIndex + 1, // delete only this row
              },
            },
          },
        ],
      },
    });
  }
}
