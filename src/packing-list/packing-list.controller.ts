import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');

@Controller('list')
export class PackingListController {
  @Post('sales-order')
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
    doc.fontSize(12).text('Sales Order', 50, 50, { underline: true, align: 'center' });

    // ===== CUSTOMER INFO =====
    doc.font("Helvetica");
    doc.fontSize(12).text(`Order ID: ${data.orderId}`, 400, 80);
    doc.text(`Date: ${data.date || ''}`, 400, 95);
    doc.text(`Customer: ${data.customerName}`, 50, 80);
    doc.text(`Address: ${data.customerAddress}`, 50, 95, {
      width: 300, // wraps text within 300px
      align: 'left',
    });
    doc.text(`TIN: ${data.customerTIN}`, 400, 110);

    // ===== ITEMS TABLE =====
    const tableTop = 150;
    const colX = { desc: 150, qty: 50, unit: 100 };

    doc.font('Helvetica-Bold');
    doc.text('Item', colX.desc, tableTop);
    doc.text('Qty', colX.qty, tableTop);
    doc.text('Unit', colX.unit, tableTop )
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    doc.font('Helvetica');
    let y = tableTop + 25;
    let total = 0;
    (data.orderedItems || []).forEach(item => {
      doc.text(item.quantity.toString(), colX.qty, y);
      doc.text(item.unit, colX.unit, y, { width: 500 });
      doc.text(item.itemName, colX.desc, y, { width: 500 });

      y += 30;
    });
    doc.end();
  }

  @Post('packing-list')
  async createInvoiceFinal(@Body() data: any, @Res() res: Response) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="packing-list.pdf"',
    );

    doc.pipe(res);

    // ===== PACKING LIST TITLE =====
    doc.font("Helvetica-Bold");
    doc.fontSize(12).text('Packing List', 50, 90, { underline: true, align: 'center' });

    // ===== CUSTOMER INFO =====
    doc.font("Helvetica");
    doc.text(`Date: ${data.date || ''}`, 400, 120);
    doc.text(`Customer: ${data.customerName}`, 50, 120);
    doc.text(`Address: ${data.customerAddress}`, 50, 135, {
      width: 300,
      align: 'left',
    });
    doc.text(`TIN: ${data.customerTIN}`, 400, 135);

    // ===== TABLE CONFIG =====
    const tableTop = 200;
    const colX = {
      qty: 50,
      unit: 100,                         // 50 + 50
      item: 150,                         // 100 + 50
      carton: 480,                       // 150 + 330
    };
    const colWidth = {
      qty: 50,
      unit: 50,
      item: 330,
      carton: 60,
    };
    const rowHeight = 25;
    // ===== TABLE HEADER =====
    doc.font('Helvetica-Bold');
    doc.rect(colX.qty, tableTop, colWidth.qty, rowHeight).stroke();
    doc.rect(colX.unit, tableTop, colWidth.unit, rowHeight).stroke();
    doc.rect(colX.item, tableTop, colWidth.item, rowHeight).stroke();
    doc.rect(colX.carton, tableTop, colWidth.carton, rowHeight).stroke();

    doc.text('Qty', colX.qty + 5, tableTop + 5, { width: colWidth.qty - 10 });
    doc.text('Unit', colX.unit + 5, tableTop + 5, { width: colWidth.unit - 10 });
    doc.text('Item', colX.item + 5, tableTop + 5, { width: colWidth.item - 10 });
    doc.text('Carton', colX.carton + 5, tableTop + 5, { width: colWidth.carton - 10 });

    // ===== TABLE ROWS =====
    doc.font('Helvetica');
    let y = tableTop + rowHeight;
    const itemsList = data.items || data.orderedItems || [];

    itemsList.forEach(item => {
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }

      // Draw cells
      doc.rect(colX.qty, y, colWidth.qty, rowHeight).stroke();
      doc.rect(colX.unit, y, colWidth.unit, rowHeight).stroke();
      doc.rect(colX.item, y, colWidth.item, rowHeight).stroke();
      doc.rect(colX.carton, y, colWidth.carton, rowHeight).stroke();

      // Write values
      doc.text((item.quantity ?? 0).toString(), colX.qty + 5, y + 5, { width: colWidth.qty - 10 });
      doc.text(item.unit || '', colX.unit + 5, y + 5, { width: colWidth.unit - 10 });
      doc.text(item.itemName || '', colX.item + 5, y + 5, { width: colWidth.item - 10 });
      doc.text(item.carton ?? '', colX.carton + 5, y + 5, { width: colWidth.carton - 10 });

      y += rowHeight;
    });

    doc.end();
  }

}

