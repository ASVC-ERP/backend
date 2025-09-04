// delivery-receipts.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');

@Controller('delivery-receipts')
export class DeliveryReceiptsController {
  @Get('invoice')
  async getInvoice(@Res() res: Response) {
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="sales-invoice.pdf"',
    );

    doc.pipe(res);

    // ===== HEADER =====
    const logoPath = 'assets/logo_nobg.png';
    const logoWidth = 100;
    const logoHeight = 50;

    // Page dimensions
    const pageWidth = doc.page.width;
    const margin = 50;

    // Place logo on the right side (top-right corner with margin)
    const logoX = pageWidth - margin - logoWidth;
    const logoY = 30;
    doc.image(logoPath, logoX, logoY-10, { width: logoWidth, height: logoHeight });

    // Place company details on the left side
    doc.fontSize(14).text('Autosync Ventures Corp.', margin, logoY, {
      align: 'left',
    });
    doc
      .fontSize(10)
      .text('Unit 207, 210 Speaker Perez St., Corner Del Monte Ave, Quezon City', {
        align: 'left',
      })
      .text('VAT Reg. TIN: 682-408-625-00000', {
        align: 'left',
      });



    // Sales Invoice Label
    doc.fontSize(12).text('Delivery Receipt', 50, 90, {
        underline: true,
        align: 'center',
    });

    let ycurr = 20;

    // Invoice Info
    doc.fontSize(10)
      .text(`D.R.No: `, 400, ycurr + 100)
      .text(`Date: `, 400, ycurr + 115)
      .text(`Terms: `, 400, ycurr + 130)
      .text(`P.O. No: `, 400, ycurr + 145)

    doc.moveDown(2);
    // Customer Info
    doc.text('SOLD TO: ', 50, ycurr + 100);
    doc.text('TIN: ', 50, ycurr + 115);
    doc.text('Address: ', 50, ycurr + 130);

    doc.moveDown(2);

    // ===== TABLE =====
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

    /*
    // Items
    const items = [
      {
        qty: 6,
        unit: 'PC',
        desc: 'TIMING BELT L300 L200 163R PAJERO',
        price: 860,
      },
      {
        qty: 6,
        unit: 'PC',
        desc: 'TIMING BELT L300 PAJERO DIESEL 83R',
        price: 470,
      },
      {
        qty: 6,
        unit: 'PC',
        desc: 'TIMING BELT 130 163RU PAJERO DIESEL',
        price: 920,
      },
      {
        qty: 6,
        unit: 'PC',
        desc: 'TIMING BELT 95-UP L300 DIESEL',
        price: 610,
      },
    ];

    doc.font('Helvetica');
    let y = tableTop + 25;
    let total = 0;
    items.forEach((item) => {
      const amount = item.qty * item.price;
      total += amount;

      doc.text(item.qty.toString(), colX.qty, y);
      doc.text(item.unit, colX.unit, y);
      doc.text(item.desc, colX.desc, y, { width: 220 });
      doc.text(item.price.toFixed(2), colX.price, y, { width: 60, align: 'right' });
      doc.text(amount.toFixed(2), colX.amount, y, { width: 70, align: 'right' });

      y += 20;
    });
    */
    let y = tableTop + 25;
    y += 300;
    // ===== TOTALS =====
    // Start at the current Y
    let currentY = doc.y + 370;

    currentY += 20;
    doc.font('Helvetica');
    doc.text(`Vatable Sales: `, colX.price, currentY, { width: 120, align: 'left' });
//    doc.text(`${netTotal.toFixed(2)}`, colX.amount, currentY, { width: 70, align: 'right' });

    currentY += 20;
    doc.font('Helvetica');
    doc.text(`VAT: `, colX.price, currentY, { width: 60, align: 'left' });
//    doc.text(`${vat.toFixed(2)}`, colX.amount, currentY, { width: 70, align: 'right' });

    currentY += 20;
    doc.font('Helvetica-Bold');
    doc.text(`Total Amount Due: `, colX.price, currentY, { width: 120, align: 'left' });
//    doc.text(`${(netTotal + vat).toFixed(2)}`, colX.amount, currentY, { width: 70, align: 'right' });


    // ===== FOOTER =====
    doc.moveDown(4);
    doc.fontSize(8).text(
      'Received the above goods in good order and condition.',
      colX.price,
      y + 150,
    );
    doc.text('By: ___________________________', colX.price, y + 170);
    doc.text('        Signature Over Printed Name', colX.price, y + 180);
    doc.text('Date: ________________________', colX.price, y + 200);
    // Add "Sales Invoice to Follow" at the bottom
    doc.fontSize(8)
      .font('Helvetica')
      .text('Sales Invoice to Follow', 0, doc.page.height - 50, {
        align: 'center',
      });

    doc.end();
  }












  // ===== NO VAT VERSION =====
  @Get('no-invoice')
  async getInvoiceNoVat(@Res() res: Response) {
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="sales-invoice-no-vat.pdf"',
    );

    doc.pipe(res);

    doc.fontSize(14).text('ASC', 50, 60, {
      align: 'center',
    });

    doc.fontSize(12).text('Delivery Receipt', 50, 90, {
      underline: true,
      align: 'center',
    });

    let ycurr = 20;

    doc.fontSize(10)
      .text(`D.R.No: `, 400, ycurr + 100)
      .text(`Date: `, 400, ycurr + 115)
      .text(`Terms: `, 400, ycurr + 130)
      .text(`P.O. No: `, 400, ycurr + 145);

    doc.moveDown(2);
    doc.text('SOLD TO: ', 50, ycurr + 100);
    doc.text('TIN: ', 50, ycurr + 115);
    doc.text('Address: ', 50, ycurr + 130);

    doc.moveDown(2);

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

    const items = [
      { qty: 6, unit: 'PC', desc: 'TIMING BELT L300 L200 163R PAJERO', price: 860 },
      { qty: 6, unit: 'PC', desc: 'TIMING BELT L300 PAJERO DIESEL 83R', price: 470 },
      { qty: 6, unit: 'PC', desc: 'TIMING BELT 130 163RU PAJERO DIESEL', price: 920 },
      { qty: 6, unit: 'PC', desc: 'TIMING BELT 95-UP L300 DIESEL', price: 610 },
    ];

    /*
    doc.font('Helvetica');
    let y = tableTop + 25;
    let total = 0;
    items.forEach((item) => {
      const amount = item.qty * item.price;
      total += amount;

      doc.text(item.qty.toString(), colX.qty, y);
      doc.text(item.unit, colX.unit, y);
      doc.text(item.desc, colX.desc, y, { width: 220 });
      doc.text(item.price.toFixed(2), colX.price, y, { width: 60, align: 'right' });
      doc.text(amount.toFixed(2), colX.amount, y, { width: 70, align: 'right' });

      y += 20;
    });
    */

    let y = tableTop + 25;
    y += 300;

    let currentY = doc.y + 370;

    currentY += 60;
    doc.font('Helvetica-Bold');
    doc.text(`Total Amount Due: `, colX.price, currentY, { width: 120, align: 'left' });
//    doc.text(`${netTotal.toFixed(2)}`, colX.amount, currentY, { width: 70, align: 'right' });

    // ===== FOOTER =====
    doc.moveDown(4);
    doc.fontSize(8).text(
      'Received the above goods in good order and condition.',
      colX.price,
      y + 150,
    );
    doc.text('By: ___________________________', colX.price, y + 170);
    doc.text('        Signature Over Printed Name', colX.price, y + 180);
    doc.text('Date: ________________________', colX.price, y + 200);
    // Add "Sales Invoice to Follow" at the bottom
    doc.fontSize(8)
      .font('Helvetica')
      .text('Sales Invoice to Follow', 0, doc.page.height - 50, {
        align: 'center',
      });

    doc.end();
  }
}
