import {
    Controller,
    Get,
    Param,
    Res,
  } from '@nestjs/common';
  import type { Response } from 'express';
  import PDFDocument = require('pdfkit');
  import { PrintService } from './asvc-print.service';
  
  @Controller('print')
  export class PrintController {
    constructor(private readonly service: PrintService) {}

// ===========================================================================
//
// Generate Functions
//
// ===========================================================================

    // SALES ORDER
    // API: /api/print/sales-order/:id
    // ===========================================================================
    @Get('sales-order/:id')
    async print_so(
      @Param('id') id: number,
      @Res() res: Response,
    ) {
      const data = await this.service.read_so(+id);
      this.generate_so(data, res);
    }
  
    // PACKING LIST
    // API: /api/print/packing-list/:id
    // ===========================================================================
    @Get('packing-list/:id')
    async print_pl(
      @Param('id') id: number,
      @Res() res: Response,
    ) {
      const data = await this.service.read_pl(+id);
      this.generate_pl(data, res);
    }

    // DELIVERY RECEIPT A
    // API: /api/print/delivery-receipt/a/:id
    // ===========================================================================
    @Get('delivery-receipt/a/:id')
    async print_dr_a(
        @Param('id') id: number,
        @Res() res: Response,
    ) {
        const data = await this.service.read_dr(+id);
        this.generate_dr_a(data, res);
    }

    // DELIVERY RECEIPT B
    // API: /api/print/delivery-receipt/b/:id
    // ===========================================================================
    @Get('delivery-receipt/b/:id')
    async print_dr_b(
        @Param('id') id: number,
        @Res() res: Response,
    ) {
        const data = await this.service.read_dr(+id);
        this.generate_dr_b(data, res);
    }

// ===========================================================================
// PDF Generator Functions
// ===========================================================================

    // ===========================================================================
    // Sales Order and Packing List
    // ===========================================================================
  
    private generate_so(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40 });
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="sales-order.pdf"',
      );
  
      doc.pipe(res);
  
      // ===== TITLE =====
      doc.font('Helvetica-Bold');
      doc.fontSize(12).text('Sales Order', 50, 50, {
        underline: true,
        align: 'center',
      });
  
      // ===== CUSTOMER INFO =====
      doc.font('Helvetica').fontSize(12);
      doc.text(`Order No: ORD${String(data.id).padStart(4, '0')}`, 400, 80);
      doc.text(`Date: ${data.date}`, 400, 95);
      doc.text(`Customer: ${data.customerName}`, 50, 80);
      doc.text(`Address: ${data.customerAddress}`, 50, 95, {
        width: 300,
      });
  
      // ===== TABLE =====
      const tableTop = 150;
      const colX = { qty: 50, unit: 100, item: 150 };
  
      doc.font('Helvetica-Bold');
      doc.text('Qty', colX.qty, tableTop);
      doc.text('Unit', colX.unit, tableTop);
      doc.text('Item', colX.item, tableTop);
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();
  
      doc.font('Helvetica');
      let y = tableTop + 25;
  
      data.orderedItems.forEach(item => {
        doc.text(item.quantity.toString(), colX.qty, y);
        doc.text(item.unit, colX.unit, y);
        doc.text(item.itemName, colX.item, y, { width: 380 });
        y += 25;
      });
  
      doc.end();
    }
  
    private generate_pl(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="packing-list.pdf"',
      );
  
      doc.pipe(res);

      const y_offset = 50;
  
      // ===== TITLE =====
      doc.font('Helvetica-Bold');
      doc.fontSize(12).text('Packing List', 50, 90 - y_offset, {
        underline: true,
        align: 'center',
      });
  
      // ===== CUSTOMER INFO =====
      doc.font('Helvetica');
      doc.text(`Date: ${data.date}`, 440, 120 - y_offset);
      doc.text(`Customer: ${data.customerName}`, 50, 120 - y_offset);
      doc.text(`Address: ${data.customerAddress}`, 50, 135 - y_offset, {
        width: 300,
      });
      doc.text(`TIN: ${data.customerTIN}`, 440, 135 - y_offset );
  
      // ===== TABLE =====
      const tableTop = 170 - y_offset;
      const colX = {
        qty: 50,
        unit: 100,
        item: 150,
        carton: 480,
      };
      const colWidth = {
        qty: 50,
        unit: 50,
        item: 330,
        carton: 60,
      };
      const rowHeight = 25;
  
      doc.font('Helvetica-Bold');
      doc.text('Qty', colX.qty + 5, tableTop + 5);
      doc.text('Unit', colX.unit + 5, tableTop + 5);
      doc.text('Item', colX.item + 5, tableTop + 5);
      doc.text('Carton', colX.carton + 5, tableTop + 5);
  
      doc.font('Helvetica');
      let y = tableTop + rowHeight;
  
      data.items
        .filter(i => i.quantity > 0)
        .forEach(item => {
          const text_padding = 5;

          // Measure item name height
          const item_height = doc.heightOfString(
            item.itemName,
            { width: colWidth.item - text_padding * 2, }
          );

          // Minimum row height
          const dynamic_height = Math.max(
            rowHeight, item_height + text_padding * 2
          );

          doc.rect(colX.qty, y, colWidth.qty, dynamic_height).stroke();
          doc.rect(colX.unit, y, colWidth.unit, dynamic_height).stroke();
          doc.rect(colX.item, y, colWidth.item, dynamic_height).stroke();
          doc.rect(colX.carton, y, colWidth.carton, dynamic_height).stroke();
  
          doc.text(item.quantity.toString(), colX.qty + text_padding, y + text_padding);
          doc.text(item.unit, colX.unit + 5, y + 5);
          doc.text(item.itemName, colX.item + text_padding, y + text_padding, {
            width: colWidth.item - text_padding*2,
          });
          doc.text(item.carton ?? '', colX.carton + text_padding, y + text_padding);
  
          y += dynamic_height;
        });
  
      doc.end();
    }

    // ===========================================================================
    // Sales Order and Packing List
    // ===========================================================================

    private computeTotals(items: any[]) {
        const netTotal = items.reduce(
          (sum, i) => sum + i.quantity * i.price,
          0,
        );
      
        const vatableSales = netTotal / 1.12;
        const vat = netTotal - vatableSales;
      
        return { netTotal, vatableSales, vat };
      }

    private generate_dr_a(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
          'Content-Disposition',
          'inline; filename="delivery-receipt-a.pdf"',
      );
      
      doc.pipe(res);
      
      // ===== HEADER =====
      doc.image('assets/logo_nobg.png', 450, 30, { width: 100 });
      doc.fontSize(14).text('Autosync Ventures Corp.', 50, 30);
      doc.fontSize(10)
          .text(
              'Unit 207, 210 Speaker Perez St., Corner Del Monte Ave, Quezon City',
              50,
              50,
          )
          .text('VAT Reg. TIN: 682-408-625-00000', 50, 65);
      
      doc.fontSize(12).text('Delivery Receipt', 0, 90, {
          underline: true,
          align: 'center',
      });
      
      // ===== INFO =====
      const yStart = 120;
      doc.fontSize(10)
          .text(`D.R./S.I. No: ${data.drNo}`, 400, yStart)
          .text(`Date: ${data.date}`, 400, yStart + 15)
          .text(`Waybill: ${data.waybill ?? ''}`, 400, yStart + 30)
          .text(`Courier: ${data.courier ?? ''}`, 400, yStart + 45);
      
      doc.text(`SOLD TO: ${data.customerName}`, 50, yStart);
      doc.text(`TIN: ${data.customerTIN}`, 50, yStart + 15);
      doc.text(`Address: ${data.customerAddress}`, 50, yStart + 30, {
          width: 300,
      });
      
      // ===== TABLE =====
      const tableTop = 200;
      const colX = { qty: 50, unit: 75, desc: 110, price: 350, amount: 480 };
      
      doc.font('Helvetica-Bold');
      ['Qty', 'Unit', 'Description', 'Price', 'Amount'].forEach((h, i) => {
          doc.text(h, Object.values(colX)[i], tableTop);
      });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      doc.font('Helvetica');
      let y = tableTop + 25;
      
      data.items
          .filter(item => (item.quantity || 0) > 0)
          .forEach(item => {
              const amount = item.quantity * item.price;
              
              const descHeight = doc.heightOfString(item.itemName, {
                  width: 220,
              });
              
              doc.text(item.quantity.toString(), colX.qty, y);
              doc.text(item.unit, colX.unit, y);
              doc.text(item.itemName, colX.desc, y, { width: 220 });
              doc.text(item.price.toFixed(2), colX.price, y);
              doc.text(amount.toFixed(2), colX.amount, y);
              
              y += Math.max(descHeight, 20) + 3;
          });
      
      // ===== VAT TOTALS =====
      const { netTotal, vatableSales, vat } = this.computeTotals(data.items);
      
      y += 20;
      doc.text('Vatable Sales:', colX.price, y);
      doc.text(vatableSales.toFixed(2), colX.amount, y);
      doc.fontSize(8).text('Received the above goods in good order and condition.', colX.qty, y);
      
      y += 20;
      doc.fontSize(10).text('VAT (12%):', colX.price, y);
      doc.text(vat.toFixed(2), colX.amount, y);
      doc.fontSize(8).text('By: ___________________________', colX.qty, y);
      doc.text('Signature', colX.qty + 56, y + 10);
      
      y += 20;
      doc.text('Date: ________________________', colX.qty, y);
      doc.fontSize(10).font('Helvetica-Bold').text('Total Amount Due:', colX.price, y);
      doc.text(netTotal.toFixed(2), colX.amount, y);
      
      // ===== FOOTER =====
      const drawFooter = () => {
        const footerY =
          doc.page.height - doc.page.margins.bottom - 10;

        doc
          .fontSize(8)
          .text(
            'Sales Invoice to Follow',
            doc.page.margins.left,
            footerY,
            {
              width:
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right,
              align: 'center',
            },
          );
      };
      
      drawFooter();
      doc.on('pageAdded', drawFooter);
      
      doc.end();
  }
      

    private generate_dr_b(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
          'Content-Disposition',
          'inline; filename="delivery-receipt-b.pdf"',
      );
      
      doc.pipe(res);
      
      doc.font('Helvetica-Bold');
      doc.fontSize(12).text('Delivery Receipt', 0, 90, {
          underline: true,
          align: 'center',
      });
      
      const yStart = 120;
      doc.font('Helvetica');
      doc.fontSize(10)
          .text(`D.R./S.I. No: ${data.drNo}`, 400, yStart)
          .text(`Date: ${data.date}`, 400, yStart + 15);
      
      doc.text(`SOLD TO: ${data.customerName}`, 50, yStart);
      doc.text(`TIN: ${data.customerTIN}`, 50, yStart + 15);
      doc.text(`Address: ${data.customerAddress}`, 50, yStart + 30, {
          width: 300,
      });
      
      // ===== TABLE =====
      const tableTop = 200;
      const colX = { qty: 50, unit: 75, desc: 110, price: 350, amount: 480 };
      
      doc.font('Helvetica-Bold');
      ['Qty', 'Unit', 'Description', 'Price', 'Amount'].forEach((h, i) => {
          doc.text(h, Object.values(colX)[i], tableTop);
      });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      doc.font('Helvetica');
      let y = tableTop + 25;
      
      data.items
      .filter(item => (item.quantity || 0) > 0)       //safety measure for items with 0 qty on delivery receipt
      .forEach(item => {
          const amount = item.quantity * item.price;
      
          doc.text(item.quantity.toString(), colX.qty, y);
          doc.text(item.unit, colX.unit, y);
          doc.text(item.itemName, colX.desc, y, { width: 220 });
          doc.text(item.price.toFixed(2), colX.price, y);
          doc.text(amount.toFixed(2), colX.amount, y);
      
          y += 25;
      });
      
      // ===== TOTAL ONLY (NO VAT) =====
      const { netTotal } = this.computeTotals(data.items);
      
      y += 20;
      doc.font('Helvetica-Bold').text('Total Amount Due:', colX.price, y);
      doc.text(netTotal.toFixed(2), colX.amount, y);
      
      y += 50;
      doc.fontSize(8).text(
          'Received the above goods in good order and condition.',
          colX.price,
          y,
      );
      
      doc.text('By: ___________________________', colX.price, y + 20);
      doc.text('        Signature Over Printed Name', colX.price, y + 30);
      doc.text('Date: ________________________', colX.price, y + 50);
      
      doc.end();
    } 
  }
  