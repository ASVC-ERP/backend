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
exports.DeliveryReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const PDFDocument = require("pdfkit");
let DeliveryReceiptsController = class DeliveryReceiptsController {
    async generateReceiptA(data, res) {
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="delivery-receipt-a.pdf"');
        doc.pipe(res);
        const logoPath = 'assets/logo_nobg.png';
        const logoWidth = 100;
        const logoHeight = 50;
        const pageWidth = doc.page.width;
        const margin = 50;
        doc.image(logoPath, pageWidth - margin - logoWidth, 30, { width: logoWidth, height: logoHeight });
        doc.fontSize(14).text('Autosync Ventures Corp.', margin, 30);
        doc.fontSize(10)
            .text('Unit 207, 210 Speaker Perez St., Corner Del Monte Ave, Quezon City', margin, 50)
            .text('VAT Reg. TIN: 682-408-625-00000', margin, 65);
        doc.fontSize(12).text('Delivery Receipt', 0, 90, { underline: true, align: 'center' });
        const yStart = 120;
        doc.fontSize(10)
            .text(`D.R.No: ${data.drNo || ''}`, 400, yStart)
            .text(`Date: ${data.date || ''}`, 400, yStart + 15)
            .text(`Terms: ${data.terms || ''}`, 400, yStart + 30)
            .text(`P.O. No: ${data.poNo || ''}`, 400, yStart + 45);
        doc.text(`SOLD TO: ${data.customerName || ''}`, 50, yStart)
            .text(`TIN: ${data.customerTIN || ''}`, 50, yStart + 15)
            .text(`Address: ${data.customerAddress || ''}`, 50, yStart + 30);
        const tableTop = 200;
        const colX = { qty: 50, unit: 100, desc: 160, price: 320, discount: 400, amount: 480 };
        doc.font('Helvetica-Bold');
        ['Quantity', 'Unit', 'Description', 'Unit Price', 'Discount', 'Amount'].forEach((h, i) => {
            const x = Object.values(colX)[i];
            doc.text(h, x, tableTop);
        });
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica');
        let y = tableTop + 25;
        (data.items || []).forEach(item => {
            const amount = (item.quantity || 0) * (item.price || 0);
            doc.text(item.quantity?.toString() || '', colX.qty, y);
            doc.text(item.unit || '', colX.unit, y);
            doc.text(item.itemName || '', colX.desc, y, { width: 220 });
            doc.text((item.price || 0).toFixed(2), colX.price, y, { width: 60, align: 'right' });
            doc.text((item.discount || 0).toFixed(2), colX.discount, y, { width: 60, align: 'right' });
            doc.text(amount.toFixed(2), colX.amount, y, { width: 70, align: 'right' });
            y += 20;
        });
        const netTotal = (data.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
        const vat = netTotal * 0.12;
        const vatSales = netTotal - vat;
        y += 20;
        doc.font('Helvetica').text(`Vatable Sales: `, colX.price, y, { width: 120 });
        doc.text(`${vatSales.toFixed(2)}`, colX.amount, y, { width: 70, align: 'right' });
        y += 20;
        doc.text(`VAT(12%): `, colX.price, y, { width: 60 });
        doc.text(`${vat.toFixed(2)}`, colX.amount, y, { width: 70, align: 'right' });
        y += 20;
        doc.font('Helvetica-Bold').text(`Total Amount Due: `, colX.price, y, { width: 120 });
        doc.text(`${(netTotal).toFixed(2)}`, colX.amount, y, { width: 70, align: 'right' });
        y += 50;
        doc.fontSize(8).text('Received the above goods in good order and condition.', colX.price, y);
        doc.text('By: ___________________________', colX.price, y + 20);
        doc.text('        Signature Over Printed Name', colX.price, y + 30);
        doc.text('Date: ________________________', colX.price, y + 50);
        doc.end();
    }
    async generateReceiptB(data, res) {
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="delivery-receipt-a.pdf"');
        doc.pipe(res);
        const logoPath = 'assets/logo_nobg.png';
        const logoWidth = 100;
        const logoHeight = 50;
        const pageWidth = doc.page.width;
        const margin = 50;
        doc.font('Helvetica-Bold');
        doc.fontSize(14).text('ASVC', 0, 70, { align: 'center' });
        doc.font('Helvetica');
        doc.fontSize(12).text('Delivery Receipt', 0, 90, { underline: true, align: 'center' });
        const yStart = 120;
        doc.fontSize(10)
            .text(`D.R.No: ${data.drNo || ''}`, 400, yStart)
            .text(`Date: ${data.date || ''}`, 400, yStart + 15)
            .text(`Terms: ${data.terms || ''}`, 400, yStart + 30)
            .text(`P.O. No: ${data.poNo || ''}`, 400, yStart + 45);
        doc.text(`SOLD TO: ${data.customerName || ''}`, 50, yStart)
            .text(`TIN: ${data.customerTIN || ''}`, 50, yStart + 15)
            .text(`Address: ${data.customerAddress || ''}`, 50, yStart + 30);
        const tableTop = 200;
        const colX = { qty: 50, unit: 100, desc: 160, price: 320, discount: 400, amount: 480 };
        doc.font('Helvetica-Bold');
        doc.text('Quantity', colX.qty, tableTop);
        doc.text('Unit', colX.unit, tableTop);
        doc.text('Description', colX.desc, tableTop);
        doc.text('Unit Price', colX.price, tableTop);
        doc.text('Discount', colX.discount, tableTop);
        doc.text('Amount', colX.amount, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica');
        let y = tableTop + 25;
        (data.items || []).forEach(item => {
            const amount = (item.quantity || 0) * (item.price || 0);
            doc.text(item.quantity?.toString() || '', colX.qty, y);
            doc.text(item.unit || '', colX.unit, y);
            doc.text(item.itemName || '', colX.desc, y, { width: 220 });
            doc.text((item.price || 0).toFixed(2), colX.price, y, { width: 60, align: 'right' });
            doc.text((item.discount || 0).toFixed(2), colX.discount, y, { width: 60, align: 'right' });
            doc.text(amount.toFixed(2), colX.amount, y, { width: 70, align: 'right' });
            y += 20;
        });
        const netTotal = (data.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
        y += 20;
        doc.font('Helvetica-Bold').text(`Total Amount Due: `, colX.price, y, { width: 120 });
        doc.text(`${(netTotal).toFixed(2)}`, colX.amount, y, { width: 70, align: 'right' });
        y += 50;
        doc.fontSize(8).text('Received the above goods in good order and condition.', colX.price, y);
        doc.text('By: ___________________________', colX.price, y + 20);
        doc.text('        Signature Over Printed Name', colX.price, y + 30);
        doc.text('Date: ________________________', colX.price, y + 50);
        doc.end();
    }
};
exports.DeliveryReceiptsController = DeliveryReceiptsController;
__decorate([
    (0, common_1.Post)('a'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DeliveryReceiptsController.prototype, "generateReceiptA", null);
__decorate([
    (0, common_1.Post)('b'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DeliveryReceiptsController.prototype, "generateReceiptB", null);
exports.DeliveryReceiptsController = DeliveryReceiptsController = __decorate([
    (0, common_1.Controller)('delivery-receipts')
], DeliveryReceiptsController);
//# sourceMappingURL=delivery-receipts.controller.js.map