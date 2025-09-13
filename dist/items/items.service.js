"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemsService = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("../sheets/sheets.service");
let ItemsService = class ItemsService {
    sheetsService;
    spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    sheetName = 'Inventory';
    range = `${this.sheetName}!A2:K`;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    async create(item) {
        const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const existingItem = existingRows.find(row => row[0] === item.itemCode);
        if (existingItem) {
            throw new Error(`Item with code "${item.itemCode}" already exists.`);
        }
        const newItem = { ...item };
        const row = [[
                newItem.itemCode,
                newItem.itemName,
                newItem.brand,
                newItem.origin,
                newItem.minStock,
            ]];
        this.sheetsService.appendData(this.spreadsheetId, this.range, row).catch(console.error);
        return newItem;
    }
    async findAll(search) {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const items = data.map((row) => ({
            itemCode: row[0],
            itemName: row[1],
            brand: row[2],
            origin: row[3],
            stock: Number(row[4]),
            minStock: Number(row[5]),
            price: {
                price1: Number(row[7]),
                price2: Number(row[8]),
                price3: Number(row[9]),
                price4: Number(row[10])
            },
        }));
        if (search) {
            return items.filter((item) => (item.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
                (item.itemCode || "").toLowerCase().includes(search.toLowerCase()));
        }
        return items;
    }
    async addStock(itemCode, quantityToAdd, convertedGrossPrice) {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row[0] === itemCode) {
                const currentStock = Number(row[4]) || 0;
                const newStock = currentStock + quantityToAdd;
                const newUnitCost = quantityToAdd ? convertedGrossPrice / quantityToAdd : 0;
                const price1 = newUnitCost * 1.5;
                const price2 = newUnitCost * 1.4;
                const price3 = newUnitCost * 1.3;
                const rowNumber = i + 2;
                await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `E${rowNumber}`, newStock);
                await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `G${rowNumber}`, price1.toFixed(2));
                await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `H${rowNumber}`, price2.toFixed(2));
                await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, `I${rowNumber}`, price3.toFixed(2));
                break;
            }
        }
    }
    async removeStock(itemCode, quantityToRemove) {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row[0] === itemCode) {
                const currentStock = Number(row[4]) || 0;
                if (currentStock < quantityToRemove) {
                    throw new Error(`Cannot remove ${quantityToRemove} units. Only ${currentStock} in stock.`);
                }
                const newStock = currentStock - quantityToRemove;
                const rowNumber = i + 2;
                const cell = `E${rowNumber}`;
                await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, cell, newStock);
                break;
            }
        }
    }
};
exports.ItemsService = ItemsService;
exports.ItemsService = ItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], ItemsService);
//# sourceMappingURL=items.service.js.map