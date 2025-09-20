import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');

@Controller('packing-list')
export class PackingListController {
  @Post('invoice')
  async createInvoice(@Body() data: any, @Res() res: Response) {
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="packing-list.pdf"',
    );

    doc.pipe(res);
    // ===== SALES ORDER TITLE =====
    doc.font("Helvetica-Bold");
    doc.fontSize(12).text('Sales Order', 50, 90, { underline: true, align: 'center' });

    // ===== CUSTOMER INFO =====
    doc.font("Helvetica");
    doc.fontSize(12).text(`Order ID: ${data.orderId}`, 400, 120);
    doc.text(`Date: ${data.date || ''}`, 400, 135);
    doc.text(`Customer: ${data.customerName}`, 50, 120);
    doc.text(`Address: ${data.customerAddress}`, 50, 135);

    // ===== ITEMS TABLE =====
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
      doc.text(item.itemName, colX.desc, y, { width: 500 });
      doc.text(item.itemName, colX.desc, y, { width: 500 });

      y += 30;
    });
    doc.end();
  }

  @Post('invoice-final')
  async createInvoiceFinal(@Body() data: any, @Res() res: Response) {
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="packing-list.pdf"',
    );

    doc.pipe(res);

    // ===== SALES ORDER TITLE =====
    doc.font("Helvetica-Bold");
    doc.fontSize(12).text('Packing List', 50, 90, { underline: true, align: 'center' });

    // ===== CUSTOMER INFO =====
    doc.font("Helvetica");
    doc.fontSize(12).text(`Invoice ID: ${data.invoiceID}`, 50, 120);
    doc.text(`Date: ${data.date || ''}`, 50, 135);
    doc.text(`Customer: ${data.customerName}`, 50, 150);
    doc.text(`Address: ${data.customerAddress}`, 50, 165);

    // ===== ITEMS TABLE =====
    const tableTop = 200;
    const colX = { desc: 100, qty: 50 };

    doc.font('Helvetica-Bold');
    doc.text('Item', colX.desc, tableTop);
    doc.text('Qty', colX.qty, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    doc.font('Helvetica');
    let y = tableTop + 25;

    // Use items from 'items' or fallback to 'orderedItems'
    const itemsList = data.items || data.orderedItems || [];

    itemsList.forEach(item => {
      doc.text(item.quantity?.toString() || '0', colX.qty, y);
      doc.text(item.itemName || '', colX.desc, y, { width: 600 });

      y += 20;
    });

    doc.end();
  }

}
