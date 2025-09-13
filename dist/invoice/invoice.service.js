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
exports.InvoiceService = exports.Invoice = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("../sheets/sheets.service");
class Invoice {
    invoiceID;
    date;
    customerName;
    customerAddress;
    customerNumber;
    status;
    salesAgent;
    items;
}
exports.Invoice = Invoice;
let InvoiceService = class InvoiceService {
    sheetsService;
    spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    sheetName = 'Sales Invoice';
    range = `${this.sheetName}!A2:K`;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    async findAll() {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const invoicesMap = {};
        for (const row of data ?? []) {
            const invoiceID = row[0] ?? '-';
            if (!invoiceID || row.every(cell => !cell))
                continue;
            if (!invoicesMap[invoiceID]) {
                invoicesMap[invoiceID] = {
                    invoiceID,
                    date: row[1] ?? '-',
                    customerName: row[2] ?? '-',
                    customerAddress: row[3] ?? '-',
                    customerNumber: row[4] ?? '-',
                    status: row[5] ?? '-',
                    salesAgent: row[10] ?? '-',
                    items: [],
                };
            }
            if (row[6]) {
                invoicesMap[invoiceID].items.push({
                    itemName: row[6],
                    quantity: Number(row[7] ?? 0),
                    price: Number(row[8] ?? 0),
                    totalPrice: Number(row[9] ?? 0),
                });
            }
        }
        return Object.values(invoicesMap);
    }
    async search(query) {
        const all = await this.findAll();
        const q = query.toLowerCase();
        return all.filter(inv => (inv.invoiceID ?? '').toLowerCase().includes(q) ||
            (inv.customerName ?? '').toLowerCase().includes(q));
    }
    async createInvoiceFromOrder(order) {
        const invoiceID = `INV-${order.orderID}-${Date.now()}`;
        const rows = order.items.map(item => [
            invoiceID,
            order.date,
            order.customerName,
            order.customerAddress ?? '',
            order.customerNumber ?? '',
            'Pending',
            item.itemName,
            item.quantityServed ?? item.quantityOrdered ?? 0,
            item.price ?? 0,
            (item.price ?? 0) * (item.quantityServed ?? item.quantityOrdered ?? 0),
            order.salesAgent ?? '',
        ]);
        await this.sheetsService.appendData(this.spreadsheetId, this.range, rows);
        const invoice = {
            invoiceID,
            date: order.date,
            customerName: order.customerName,
            customerAddress: order.customerAddress ?? '',
            customerNumber: order.customerNumber ?? '',
            status: 'Pending',
            salesAgent: order.salesAgent ?? '',
            items: rows.map(r => ({
                itemName: r[6],
                quantity: r[7],
                price: r[8],
                totalPrice: r[9],
            })),
        };
        return [invoice];
    }
    async findOne(invoiceID) {
        const all = await this.findAll();
        const invoice = all.find(inv => inv.invoiceID === invoiceID);
        if (!invoice)
            throw new Error(`Invoice ${invoiceID} not found`);
        return invoice;
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map