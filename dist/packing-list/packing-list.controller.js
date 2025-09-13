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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackingListController = void 0;
const common_1 = require("@nestjs/common");
const PDFDocument = require("pdfkit");
let PackingListController = class PackingListController {
    async createInvoice(data, res) {
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="packing-list.pdf"');
        doc.pipe(res);
        doc.font("Helvetica-Bold");
        doc.fontSize(12).text('Sales Order', 50, 90, { underline: true, align: 'center' });
        doc.font("Helvetica");
        doc.fontSize(12).text(`Order ID: ${data.orderId}`, 400, 120);
        doc.text(`Date: ${data.date || ''}`, 400, 135);
        doc.text(`Customer: ${data.customerName}`, 50, 120);
        doc.text(`Address: ${data.customerAddress}`, 50, 135);
        const tableTop = 200;
        const colX = { desc: 100, qty: 50 };
        doc.font('Helvetica-Bold');
        doc.text('Item', colX.desc, tableTop);
        doc.text('Qty', colX.qty, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica');
        let y = tableTop + 25;
        let total = 0;
        (data.orderedItems || []).forEach(item => {
            doc.text(item.quantity.toString(), colX.qty, y);
            doc.text(item.itemName, colX.desc, y, { width: 200 });
            y += 20;
        });
        doc.end();
    }
    async createInvoiceFinal(data, res) {
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="packing-list.pdf"');
        doc.pipe(res);
        doc.font("Helvetica-Bold");
        doc.fontSize(12).text('Packing List', 50, 90, { underline: true, align: 'center' });
        doc.font("Helvetica");
        doc.fontSize(12).text(`Invoice ID: ${data.invoiceID}`, 50, 120);
        doc.text(`Date: ${data.date || ''}`, 50, 135);
        doc.text(`Customer: ${data.customerName}`, 50, 150);
        doc.text(`Address: ${data.customerAddress}`, 50, 165);
        const tableTop = 200;
        const colX = { desc: 100, qty: 50 };
        doc.font('Helvetica-Bold');
        doc.text('Item', colX.desc, tableTop);
        doc.text('Qty', colX.qty, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica');
        let y = tableTop + 25;
        const itemsList = data.items || data.orderedItems || [];
        itemsList.forEach(item => {
            doc.text(item.quantity?.toString() || '0', colX.qty, y);
            doc.text(item.itemName || '', colX.desc, y, { width: 200 });
            y += 20;
        });
        doc.end();
    }
};
exports.PackingListController = PackingListController;
__decorate([
    (0, common_1.Post)('invoice'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PackingListController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Post)('invoice-final'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PackingListController.prototype, "createInvoiceFinal", null);
exports.PackingListController = PackingListController = __decorate([
    (0, common_1.Controller)('packing-list')
], PackingListController);
//# sourceMappingURL=packing-list.controller.js.map