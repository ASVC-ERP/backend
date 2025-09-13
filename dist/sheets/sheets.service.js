"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const path = require("path");
let SheetsService = class SheetsService {
    sheetsClient;
    async onModuleInit() {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../../credentials/credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const authClient = (await auth.getClient());
        this.sheetsClient = googleapis_1.google.sheets({
            version: 'v4',
            auth: authClient,
        });
    }
    async getData(spreadsheetId, range) {
        const res = await this.sheetsClient.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        console.log('Google Sheets fetched data:', res.data.values);
        return res.data.values || [];
    }
    async clearRow(spreadsheetId, sheetName, row) {
        const range = `${sheetName}!A${row}:K${row}`;
        await this.sheetsClient.spreadsheets.values.clear({
            spreadsheetId,
            range,
        });
    }
    async appendData(spreadsheetId, range, values) {
        await this.sheetsClient.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: { values },
        });
    }
    async clear(spreadsheetId, range) {
        await this.sheetsClient.spreadsheets.values.clear({
            spreadsheetId,
            range,
        });
    }
    async updateData(spreadsheetId, range, values) {
        await this.sheetsClient.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: "USER_ENTERED",
            requestBody: { values },
        });
    }
    async updateRow(spreadsheetId, sheetName, rowNumber, values) {
        const range = `${sheetName}!A${rowNumber}:K${rowNumber}`;
        await this.sheetsClient.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] },
        });
    }
    async updateCell(spreadsheetId, sheetName, cell, newValue) {
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
    async searchInventory(spreadsheetId, range) {
        const res = await this.sheetsClient.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        const rows = res.data.values || [];
        const headers = rows[0];
        const items = rows.slice(1).map(row => headers.reduce((acc, header, i) => {
            acc[header] = row[i];
            return acc;
        }, {}));
        return items;
    }
};
exports.SheetsService = SheetsService;
exports.SheetsService = SheetsService = __decorate([
    (0, common_1.Injectable)()
], SheetsService);
//# sourceMappingURL=sheets.service.js.map