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
exports.SuppliersInvoiceService = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("../../sheets/sheets.service");
const items_service_1 = require("../../items/items.service");
let SuppliersInvoiceService = class SuppliersInvoiceService {
    sheetsService;
    itemsService;
    spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    sheetName = 'Supplier Invoice';
    range = `${this.sheetName}!A2:M`;
    constructor(sheetsService, itemsService) {
        this.sheetsService = sheetsService;
        this.itemsService = itemsService;
    }
    async generateInvoiceNumber() {
        const data = await this.sheetsService.getData(this.spreadsheetId, `${this.sheetName}!A2:A`);
        let maxNumber = 0;
        for (const row of data) {
            const invoiceId = row[0]?.trim() || '';
            if (invoiceId.startsWith('INV')) {
                const numericPart = invoiceId.replace('INV', '');
                const parsed = parseInt(numericPart, 10);
                if (!isNaN(parsed)) {
                    maxNumber = Math.max(maxNumber, parsed);
                }
            }
        }
        const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
        return `INV${nextNumber}`;
    }
    async addInvoice(dto) {
        const inventory = await this.sheetsService.getData(this.spreadsheetId, 'Inventory!A2:A');
        const existingItemCodes = inventory.map((row) => row[0]);
        for (const item of dto.items) {
            if (!existingItemCodes.includes(item.itemCode)) {
                throw new common_1.BadRequestException(`Item "${item.itemCode}" does not exist in inventory.`);
            }
        }
        const invoiceID = await this.generateInvoiceNumber();
        const values = dto.items.map((item) => [
            invoiceID,
            dto.poNum,
            dto.purchaseDate,
            item.itemName,
            item.itemCode,
            item.quantity,
            item.unit,
            item.unitCost,
            item.currency || 'PHP',
            item.conversionFactor || 1,
            item.subTotal,
            dto.status || 'Purchased',
            dto.supplierID
        ]);
        await this.sheetsService.appendData(this.spreadsheetId, this.range, values);
        for (const item of dto.items) {
            if (dto.status === 'Purchased') {
                await this.itemsService.addStock(item.itemCode, item.quantity, item.subTotal);
            }
            else if (dto.status === 'Returned') {
                await this.itemsService.removeStock(item.itemCode, item.quantity);
            }
        }
        return { message: 'Invoice added successfully', invoiceID };
    }
    async findAll() {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        return data
            .map((row) => ({
            invoiceID: row[0] || '',
            poNum: row[1] || '',
            purchaseDate: row[2] || '',
            itemName: row[3] || '',
            itemCode: row[4] || '',
            quantity: Number(row[5]) || 0,
            unit: row[6] || '',
            unitCost: Number(row[7]) || 0,
            currency: row[8] || 'PHP',
            conversionFactor: Number(row[9]) || 1,
            subTotal: Number(row[10]) || 0,
            status: row[11] || 'Purchased',
            supplierID: row[12]?.trim() || '',
        }))
            .filter((row) => row.invoiceID && row.itemCode);
    }
    async findBySupplier(supplierID) {
        const allInvoices = await this.findAll();
        const groupedMap = new Map();
        for (const inv of allInvoices) {
            if (supplierID && inv.supplierID !== supplierID)
                continue;
            if (!groupedMap.has(inv.invoiceID)) {
                groupedMap.set(inv.invoiceID, {
                    invoiceID: inv.invoiceID,
                    poNum: inv.poNum,
                    purchaseDate: inv.purchaseDate,
                    status: inv.status,
                    items: [],
                });
            }
            groupedMap.get(inv.invoiceID).items.push({
                itemName: inv.itemName,
                itemCode: inv.itemCode,
                quantity: inv.quantity,
                unit: inv.unit,
                unitCost: inv.unitCost,
                currency: inv.currency,
                conversionFactor: inv.conversionFactor,
                subTotal: inv.subTotal,
            });
        }
        return Array.from(groupedMap.values());
    }
    async findByItem(itemCode) {
        const allInvoices = await this.findAll();
        const code = itemCode?.trim();
        return allInvoices.filter((inv) => inv.itemCode === code);
    }
};
exports.SuppliersInvoiceService = SuppliersInvoiceService;
exports.SuppliersInvoiceService = SuppliersInvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService,
        items_service_1.ItemsService])
], SuppliersInvoiceService);
//# sourceMappingURL=suppliers-invoice.service.js.map