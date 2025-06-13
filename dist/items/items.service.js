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
    range = `${this.sheetName}!A2:J`;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    async create(item) {
        const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const newItem = {
            id: existingRows.length + 1,
            ...item,
        };
        const row = [[
                newItem.id,
                newItem.itemCode,
                newItem.itemName,
                newItem.brand,
                newItem.origin,
                newItem.stock,
                newItem.price1,
                newItem.price2,
                newItem.price3,
                newItem.price4
            ]];
        this.sheetsService.appendData(this.spreadsheetId, this.range, row).catch(console.error);
        return newItem;
    }
    async findAll() {
        console.log('📦 findAll() hit');
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        console.log('📄 Sheet data:', data);
        return data.map((row, index) => ({
            id: index + 1,
            itemCode: row[0],
            itemName: row[1],
            brand: row[2],
            origin: row[3],
            stock: Number(row[4]),
            price1: Number(row[5]),
            price2: Number(row[6]),
            price3: Number(row[7]),
            price4: Number(row[8]),
        }));
    }
};
exports.ItemsService = ItemsService;
exports.ItemsService = ItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], ItemsService);
//# sourceMappingURL=items.service.js.map