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
  
    // =========================
    // SALES ORDER
    // =========================
    @Get('sales-order/:id')
    async print_so(
      @Param('id') id: number,
      @Res() res: Response,
    ) {
      const data = await this.service.read_so(+id);
      this.generate_so(data, res);
    }
  
    // =========================
    // PACKING LIST
    // =========================
    @Get('packing-list/:id')
    async print_pl(
      @Param('id') id: number,
      @Res() res: Response,
    ) {
      const data = await this.service.read_pl(+id);
      this.generate_pl(data, res);
    }
  
    // =========================
    // PDF GENERATORS
    // =========================
  
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
      doc.text(`Order No: ${data.orderId}`, 400, 80);
      doc.text(`Date: ${data.date}`, 400, 95);
      doc.text(`Customer: ${data.customerName}`, 50, 80);
      doc.text(`Address: ${data.customerAddress}`, 50, 95, {
        width: 300,
      });
      doc.text(`TIN: ${data.customerTIN}`, 400, 110);
  
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
  
      // ===== TITLE =====
      doc.font('Helvetica-Bold');
      doc.fontSize(12).text('Packing List', 50, 90, {
        underline: true,
        align: 'center',
      });
  
      // ===== CUSTOMER INFO =====
      doc.font('Helvetica');
      doc.text(`Date: ${data.date}`, 400, 120);
      doc.text(`Customer: ${data.customerName}`, 50, 120);
      doc.text(`Address: ${data.customerAddress}`, 50, 135, {
        width: 300,
      });
      doc.text(`TIN: ${data.customerTIN}`, 400, 135);
  
      // ===== TABLE =====
      const tableTop = 200;
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
          doc.rect(colX.qty, y, colWidth.qty, rowHeight).stroke();
          doc.rect(colX.unit, y, colWidth.unit, rowHeight).stroke();
          doc.rect(colX.item, y, colWidth.item, rowHeight).stroke();
          doc.rect(colX.carton, y, colWidth.carton, rowHeight).stroke();
  
          doc.text(item.quantity.toString(), colX.qty + 5, y + 5);
          doc.text(item.unit, colX.unit + 5, y + 5);
          doc.text(item.itemName, colX.item + 5, y + 5, {
            width: colWidth.item - 10,
          });
          doc.text(item.carton ?? '', colX.carton + 5, y + 5);
  
          y += rowHeight;
        });
  
      doc.end();
    }
  }
  