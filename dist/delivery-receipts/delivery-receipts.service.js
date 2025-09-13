"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = require("pdfkit");
const fs = require("fs");
let DeliveryReceiptsService = class DeliveryReceiptsService {
    async generateHardCodedReceipt() {
        const filePath = 'delivery-receipt.pdf';
        const doc = new pdfkit_1.default({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);
        doc
            .fontSize(18)
            .text('DELIVERY RECEIPT', { align: 'center', underline: true })
            .moveDown(2);
        doc
            .fontSize(12)
            .text(`Receipt No: DR-1001`, { align: 'right' })
            .text(`Date: 2025-08-18`, { align: 'right' })
            .moveDown();
        doc
            .fontSize(12)
            .text(`Customer Name: John Doe`)
            .text(`Address: 123 Maple Street, NY`)
            .text(`Contact No: 555-1234`)
            .moveDown(2);
        const tableTop = doc.y;
        const itemCodeX = 50;
        const descriptionX = 120;
        const qtyX = 350;
        const priceX = 400;
        const amountX = 480;
        doc
            .fontSize(12)
            .text('Item Code', itemCodeX, tableTop)
            .text('Description', descriptionX, tableTop)
            .text('Qty', qtyX, tableTop)
            .text('Price', priceX, tableTop)
            .text('Amount', amountX, tableTop);
        doc.moveDown();
        const items = [
            { code: 'A101', desc: 'Wireless Mouse', qty: 2, price: 15 },
            { code: 'A102', desc: 'Mechanical Keyboard', qty: 1, price: 45 },
            { code: 'A103', desc: 'HDMI Cable', qty: 3, price: 8 },
        ];
        let y = doc.y + 5;
        items.forEach((item) => {
            const amount = item.qty * item.price;
            doc
                .fontSize(12)
                .text(item.code, itemCodeX, y)
                .text(item.desc, descriptionX, y)
                .text(item.qty.toString(), qtyX, y, { width: 40, align: 'right' })
                .text(item.price.toFixed(2), priceX, y, { width: 60, align: 'right' })
                .text(amount.toFixed(2), amountX, y, { width: 70, align: 'right' });
            y += 20;
        });
        const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);
        doc
            .fontSize(12)
            .text(`TOTAL: $${total.toFixed(2)}`, amountX, y + 10, {
            width: 70,
            align: 'right',
        })
            .moveDown(4);
        doc
            .fontSize(12)
            .text('_________________________', 50, doc.y)
            .text('Received By', 80, doc.y + 15);
        doc
            .text('_________________________', 350, doc.y - 15)
            .text('Delivered By', 380, doc.y);
        doc.end();
        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', reject);
        });
    }
};
exports.DeliveryReceiptsService = DeliveryReceiptsService;
exports.DeliveryReceiptsService = DeliveryReceiptsService = __decorate([
    (0, common_1.Injectable)()
], DeliveryReceiptsService);
//# sourceMappingURL=delivery-receipts.service.js.map