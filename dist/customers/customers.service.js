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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("../sheets/sheets.service");
let CustomersService = class CustomersService {
    sheetsService;
    spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    sheetName = 'Customer';
    range = `${this.sheetName}!A2:D`;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    async create(customer) {
        const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);
        let newIdNumber = 1;
        if (existingRows.length > 0) {
            const lastRow = existingRows[existingRows.length - 1];
            const lastId = lastRow[0];
            const lastNum = parseInt(lastId.replace('CUST-', ''), 10);
            newIdNumber = lastNum + 1;
        }
        const newCustomerId = `CUST-${newIdNumber.toString().padStart(3, '0')}`;
        const row = [
            [
                newCustomerId,
                customer.customerName,
                customer.customerContact,
                customer.customerAddress,
            ],
        ];
        await this.sheetsService.appendData(this.spreadsheetId, this.range, row);
        return {
            customerID: newCustomerId,
            customerName: customer.customerName,
            customerContact: customer.customerContact,
            customerAddress: customer.customerAddress,
        };
    }
    async findAll() {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        return data.map((row, index) => ({
            customerID: row[0],
            customerName: row[1],
            customerContact: row[2],
            customerAddress: row[3],
        }));
    }
    async search(query) {
        const data = await this.findAll();
        return data.filter((c) => (c.customerName || '').toLowerCase().includes(query.toLowerCase()));
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map