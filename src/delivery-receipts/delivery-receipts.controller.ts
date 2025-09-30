import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');

@Controller('delivery-receipts')
export class DeliveryReceiptsController {

@Post('a')
async generateReceiptA(@Body() data: any, @Res() res: Response) {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="delivery-receipt-a.pdf"');
  doc.pipe(res);

  const logoPath = 'assets/logo_nobg.png';
  const logoWidth = 100;
  const logoHeight = 50;
  const pageWidth = doc.page.width;
  const margin = 50;

  // Header
  doc.image(logoPath, pageWidth - margin - logoWidth, 30, { width: logoWidth, height: logoHeight });
  doc.fontSize(14).text('Autosync Ventures Corp.', margin, 30);
  doc.fontSize(10)
     .text('Unit 207, 210 Speaker Perez St., Corner Del Monte Ave, Quezon City', margin, 50)
     .text('VAT Reg. TIN: 682-408-625-00000', margin, 65);

  doc.fontSize(12).text('Delivery Receipt', 0, 90, { underline: true, align: 'center' });

  // Customer info
  const yStart = 120;
  doc.fontSize(10)
     .text(`D.R.No: ${data.drNo || ''}`, 400, yStart)
     .text(`Date: ${data.date || ''}`, 400, yStart + 15)
     .text(`Terms: ${data.terms || ''}`, 400, yStart + 30)
     .text(`P.O. No: ${data.poNo || ''}`, 400, yStart + 45);

  doc.text(`SOLD TO: ${data.customerName || ''}`, 50, yStart)
     .text(`TIN: ${data.customerTIN || ''}`, 50, yStart + 15)
     doc.text(`Address: ${data.customerAddress || ''}`, 50, yStart + 30, {
      width: 300, // wraps text within 300px
      align: 'left',
    });

  // Table
  const tableTop = 200;
  const colX = { qty: 50, unit: 75, desc: 110, price: 350, discount: 420, amount: 480 };
  doc.font('Helvetica-Bold');
  ['Qty','Unit','Description','Price','Discount','Amount'].forEach((h,i) => {
    const x = Object.values(colX)[i];
    doc.text(h, x, tableTop);
  });
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Items
  doc.font('Helvetica');
  let y = tableTop + 25;
  (data.items || []).forEach(item => {
    const amount = (item.quantity || 0) * (item.price || 0);
    doc.text(item.quantity?.toString() || '', colX.qty, y);
    doc.text(item.unit || '', colX.unit, y);
    doc.text(item.itemName || '', colX.desc, y, { width: 220 });
    doc.text((item.price || 0).toFixed(2), colX.price, y );
    doc.text((item.discount || 0).toFixed(2), colX.discount, y, );
    doc.text(amount.toFixed(2), colX.amount, y,);
    y += 20;
  });

  // Totals
  const netTotal = (data.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
  const vatSales = netTotal/1.12;
  const vat = netTotal - vatSales;
  y += 20;
  doc.font('Helvetica').text(`Vatable Sales: `, colX.price, y, { width: 120 });
  doc.text(`${vatSales.toFixed(2)}`, colX.amount, y,);
  y += 20;
  doc.text(`VAT(12%): `, colX.price, y, { width: 60 });
  doc.text(`${vat.toFixed(2)}`, colX.amount, y,);
  y += 20;
  doc.font('Helvetica-Bold').text(`Total Amount Due: `, colX.price, y, { width: 120 });
  doc.text(`${(netTotal).toFixed(2)}`, colX.amount, y,);

  // Footer
  y += 50;
  doc.fontSize(8).text('Received the above goods in good order and condition.', colX.price, y);
  doc.text('By: ___________________________', colX.price, y + 20);
  doc.text('        Signature Over Printed Name', colX.price, y + 30);
  doc.text('Date: ________________________', colX.price, y + 50);

  doc.fontSize(8)
    .font('Helvetica')
    .text('Sales Invoice to Follow', 0, doc.page.height - 50, {
      align: 'center',
    });

  doc.end();
}


  @Post('b')
  async generateReceiptB(@Body() data: any, @Res() res: Response) {
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="delivery-receipt-a.pdf"',
    );

    doc.pipe(res);

    // ===== HEADER =====
    const logoPath = 'assets/logo_nobg.png';
    const logoWidth = 100;
    const logoHeight = 50;
    const pageWidth = doc.page.width;
    const margin = 50;

    // Company info top-left
    doc.font('Helvetica-Bold');
    doc.fontSize(14).text('ASVC',  0, 70, { align: 'center' });

    // Title
    doc.font('Helvetica');
    doc.fontSize(12).text('Delivery Receipt', 0, 90, { underline: true, align: 'center' });

    // Customer info
    const yStart = 120;
    doc.fontSize(10)
        .text(`D.R.No: ${data.drNo || ''}`, 400, yStart)
        .text(`Date: ${data.date || ''}`, 400, yStart + 15)
        .text(`Terms: ${data.terms || ''}`, 400, yStart + 30)
        .text(`P.O. No: ${data.poNo || ''}`, 400, yStart + 45);

    doc.text(`SOLD TO: ${data.customerName || ''}`, 50, yStart)
        .text(`TIN: ${data.customerTIN || ''}`, 50, yStart + 15)
        doc.text(`Address: ${data.customerAddress || ''}`, 50, yStart + 30, {
        width: 300, // wraps text within 300px
        align: 'left',
      });

    // Table
    const tableTop = 200;
    const colX = { qty: 50, unit: 75, desc: 110, price: 350, discount: 420, amount: 480 };
    doc.font('Helvetica-Bold');
    ['Qty','Unit','Description','Price','Discount','Amount'].forEach((h,i) => {
      const x = Object.values(colX)[i];
      doc.text(h, x, tableTop);
    });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    doc.font('Helvetica-Bold');
    doc.text('Qty', colX.qty, tableTop);
    doc.text('Unit', colX.unit, tableTop);
    doc.text('Description', colX.desc, tableTop);
    doc.text('Discount', colX.discount, tableTop);
    doc.text('Amount', colX.amount, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Items
    doc.font('Helvetica');
    let y = tableTop + 25;
    (data.items || []).forEach(item => {
      const amount = (item.quantity || 0) * (item.price || 0);
      doc.text(item.quantity?.toString() || '', colX.qty, y);
      doc.text(item.unit || '', colX.unit, y);
      doc.text(item.itemName || '', colX.desc, y, { width: 200 });
      doc.text((item.price || 0).toFixed(2), colX.price, y, { width: 60, align: 'right' });
      doc.text((item.discount || 0).toFixed(2), colX.discount, y, { width: 60, align: 'right' });
      doc.text(amount.toFixed(2), colX.amount, y, { width: 70, align: 'right' });
      y += 20;
    });

    const netTotal = (data.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
    y += 20;
    doc.font('Helvetica-Bold').text(`Total Amount Due: `, colX.price, y, { width: 120 });
    doc.text(`${(netTotal).toFixed(2)}`, colX.amount, y, { width: 70, align: 'right' });

    y += 50; // footer offset
    doc.fontSize(8).text('Received the above goods in good order and condition.', colX.price, y);
    doc.text('By: ___________________________', colX.price, y + 20);
    doc.text('        Signature Over Printed Name', colX.price, y + 30);
    doc.text('Date: ________________________', colX.price, y + 50);

    doc.end();
  }
}
