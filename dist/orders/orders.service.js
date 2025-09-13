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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("../sheets/sheets.service");
let OrdersService = class OrdersService {
    sheetsService;
    spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    sheetName = 'Sales Order';
    range = `${this.sheetName}!A2:K`;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    async create(order) {
        const existingRows = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const exists = existingRows.some(row => row[0] === order.orderId);
        if (exists) {
            throw new Error(`Order ID "${order.orderId}" already exists.`);
        }
        const rows = order.orderedItems.map(item => ([
            order.orderId,
            order.date,
            order.customerName,
            order.customerAddress,
            order.customerNumber,
            order.status,
            item.itemName,
            item.quantity,
            item.price,
            order.totalPrice,
            order.salesAgent
        ]));
        await this.sheetsService.appendData(this.spreadsheetId, this.range, rows);
        return order;
    }
    async findAll() {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const ordersMap = {};
        for (const row of data) {
            const orderId = row[0];
            if (!orderId || row.every(cell => !cell)) {
                continue;
            }
            if (!ordersMap[orderId]) {
                ordersMap[orderId] = {
                    orderId,
                    date: row[1],
                    customerName: row[2],
                    customerAddress: row[3],
                    customerNumber: row[4],
                    status: row[5],
                    salesAgent: row[10],
                    orderedItems: [],
                    totalPrice: Number(row[9] || 0),
                };
            }
            if (row[6]) {
                ordersMap[orderId].orderedItems.push({
                    itemName: row[6],
                    quantity: Number(row[7] || 0),
                    price: Number(row[8] || 0),
                });
            }
        }
        return Object.values(ordersMap);
    }
    async findOne(orderId) {
        const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const orderRows = rows.filter(r => r[0] === orderId);
        if (!orderRows.length) {
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        }
        const firstRow = orderRows[0];
        return {
            orderId: firstRow[0],
            date: firstRow[1],
            customerName: firstRow[2],
            customerAddress: firstRow[3],
            customerNumber: firstRow[4],
            salesAgent: firstRow[10],
            status: firstRow[5],
            totalPrice: orderRows.reduce((sum, r) => sum + Number(r[8] || 0) * Number(r[7] || 0), 0),
            orderedItems: orderRows.map(r => ({
                itemName: r[6],
                quantity: Number(r[7] || 0),
                price: Number(r[8] || 0),
            })),
        };
    }
    async update(orderId, dto) {
        const rows = await this.sheetsService.getData(this.spreadsheetId, this.range);
        const orderRows = rows.filter(row => row[0] === orderId);
        if (orderRows.length === 0) {
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        }
        if (!dto.orderedItems || dto.orderedItems.length === 0) {
            throw new Error("Update must include at least one ordered item.");
        }
        const otherRows = rows.filter(row => row[0] !== orderId);
        const totalPrice = dto.orderedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
        const updatedRows = dto.orderedItems.map(item => ([
            dto.orderId,
            dto.date,
            dto.customerName,
            dto.customerAddress,
            dto.customerNumber,
            dto.status,
            item.itemName,
            item.quantity,
            item.price,
            dto.totalPrice,
            dto.salesAgent,
        ]));
        await this.sheetsService.clear(this.spreadsheetId, this.range);
        await this.sheetsService.appendData(this.spreadsheetId, this.range, [...otherRows, ...updatedRows]);
        return {
            message: `Order ${orderId} updated successfully`,
            updatedItems: dto.orderedItems.length,
        };
    }
    salesOrderHistorySheet = 'Sales Order History!A:I';
    salesInvoiceSheet = 'Sales Invoice!A:K';
    async serveOrder(orderId, serveData) {
        try {
            console.log('Incoming serveData:', serveData);
            const ordersHeader = await this.sheetsService.getData(this.spreadsheetId, `${this.sheetName}!1:1`);
            const headers = ordersHeader?.[0] || [];
            const orderIdCol = headers.indexOf('orderID');
            const statusCol = headers.indexOf('status');
            if (orderIdCol === -1 || statusCol === -1) {
                throw new Error('Orders sheet must have "orderId" and "status" columns');
            }
            const orderRows = await this.sheetsService.getData(this.spreadsheetId, `${this.sheetName}!A2:Z`);
            const foundRowIndex = orderRows.findIndex(row => (row[orderIdCol] || '').toString().trim() === orderId);
            if (foundRowIndex !== -1) {
                const sheetRow = foundRowIndex + 2;
                const statusColLetter = String.fromCharCode(65 + statusCol);
                const statusCell = `${statusColLetter}${sheetRow}`;
                await this.sheetsService.updateCell(this.spreadsheetId, this.sheetName, statusCell, 'Served');
            }
            const historyRows = serveData.items.map(item => [
                serveData.date,
                orderId,
                serveData.customerName,
                item.price,
                item.itemName,
                item.quantityOrdered,
                item.quantityServed,
                item.quantityUnserved,
                item.price * item.quantityOrdered,
            ]);
            await this.sheetsService.appendData(this.spreadsheetId, this.salesOrderHistorySheet, historyRows);
            const invoiceId = `INV-${orderId}-${Date.now()}`;
            const invoiceRows = serveData.items.map(item => [
                invoiceId,
                serveData.date,
                serveData.customerName,
                serveData.customerAddress || '',
                serveData.customerNumber || '',
                'Pending',
                item.itemName,
                item.quantityServed ?? item.quantityOrdered,
                item.price,
                item.price * (item.quantityServed ?? item.quantityOrdered),
                serveData.salesAgent || '',
            ]);
            await this.sheetsService.appendData(this.spreadsheetId, this.salesInvoiceSheet, invoiceRows);
            return {
                message: 'Order served, history logged, invoice created',
                rowsLogged: {
                    history: historyRows.length,
                    invoice: invoiceRows.length,
                },
                invoiceId,
            };
        }
        catch (err) {
            console.error('serveOrder error:', err);
            throw err;
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map