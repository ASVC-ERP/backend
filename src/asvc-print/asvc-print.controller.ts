import {
    Controller,
    Get,
    Param,
    Query,
    Res,
  } from '@nestjs/common';
  import type { Response } from 'express';
  import PDFDocument = require('pdfkit');
  import { PrintService } from './asvc-print.service';

  @Controller('print')
  export class PrintController {
    constructor(
      private readonly service: PrintService,
    ) {}

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

    // SALES INVOICE — SHELL (no details)
    // Prints everything EXCEPT this invoice's own data: title, logo,
    // company block, field labels, the corner-bracket boxes, the item
    // table header, and every total's label — all blank. Meant to print
    // once on its own (a reusable blank form) or as the first pass onto
    // paper that "details-only" below then overlays with the actual data.
    // API: /api/print/sales-invoice/:id/no-details
    // ===========================================================================
    @Get('sales-invoice/:id/no-details')
    async print_invoice_no_details(
        @Param('id') id: number,
        @Res() res: Response,
    ) {
        const data = await this.service.read_invoice(+id);
        this.generate_invoice_no_details(data, res);
    }

    // SALES INVOICE — DETAILS ONLY
    // Prints just this invoice's data (customer info, items, totals) —
    // no title/logo/company block/labels/lines. Laid out as its own
    // compact column confined to the right half of the page, with row
    // spacing computed from how many lines there are so it always fits
    // one page without needing the fixed positions "no-details" uses.
    // API: /api/print/sales-invoice/:id/details-only
    // ===========================================================================
    @Get('sales-invoice/:id/details-only')
    async print_invoice_details_only(
        @Param('id') id: number,
        @Res() res: Response,
    ) {
        const data = await this.service.read_invoice(+id);
        this.generate_invoice_details_only(data, res);
    }

    // PURCHASE ORDER
    // API: /api/print/purchase-order/:id
    // ===========================================================================
    @Get('purchase-order/:id')
    async print_po(
        @Param('id') id: number,
        @Res() res: Response,
    ) {
        const data = await this.service.read_po(+id);
        this.generate_po(data, res);
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
        width: 370,
      });
      doc.text(`Order: ORD${String(data.orderId).padStart(4, "0")}`, 440, 135 - y_offset );
  
      // ===== TABLE =====
      const tableTop = 180 - y_offset;
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

    private generate_po1(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
          'Content-Disposition',
          'inline; filename="delivery-receipt-b.pdf"',
      );
      
      doc.pipe(res);
      
      doc.font('Helvetica-Bold');
      doc.fontSize(12).text('Purchase Order', 0, 90, {
          underline: true,
          align: 'center',
      });

      const yStart = 120;
      doc.font('Helvetica');
      doc.fontSize(10)
          .text(`PO No: ${data.po_number}`, 400, yStart)
          .text(`Date: ${data.date}`, 400, yStart + 15);
      
      doc.text(`Supplier: ${data.supplierName}`, 50, yStart);
      doc.text(`Address: ${data.supplierAddress}`, 50, yStart + 15, {
          width: 300,
      });
      
      // ===== TABLE =====
      const tableTop = 200;
      const colX = { qty: 50, unit: 75, desc: 110, price: 350, amount: 480 };
      
      doc.font('Helvetica-Bold');
      ['Qty', 'Unit', 'Description', 'Cost', 'Amount'].forEach((h, i) => {
          doc.text(h, Object.values(colX)[i], tableTop);
      });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      doc.font('Helvetica');
      let y = tableTop + 25;
      
      data.items
      .filter(item => (item.quantity || 0) > 0)       //safety measure for items with 0 qty on delivery receipt
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

    private generate_po(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40 });
    
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="purchase-order.pdf"',
      );
    
      doc.pipe(res);
    
      // ===== TITLE =====
      doc.font("Helvetica-Bold");
      doc.fontSize(12).text("Purchase Order", 0, 90, {
        underline: true,
        align: "center",
      });
    
      // ===== HEADER =====
      const yStart = 120;
    
      doc.font("Helvetica");
      doc.fontSize(10)
        .text(`PO No: ${data.po_number}`, 400, yStart)
        .text(`Date: ${data.date}`, 400, yStart + 15);
    
      doc.text(`Supplier: ${data.supplierName}`, 50, yStart);
    
      doc.text(`Address: ${data.supplierAddress}`, 50, yStart + 15, {
        width: 300,
      });
    
      // ===== TABLE =====
      const tableTop = 200;
      const pageBottom = doc.page.height - 80;
    
      const colX = {
        qty: 50,
        unit: 80,
        desc: 120,
        price: 360,
        amount: 470,
      };
    
      const drawTableHeader = (y: number) => {
        doc.font("Helvetica-Bold");
    
        doc.text("Qty", colX.qty, y);
        doc.text("Unit", colX.unit, y);
        doc.text("Description", colX.desc, y);
        doc.text("Cost", colX.price, y);
        doc.text("Amount", colX.amount, y);
    
        doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    
        doc.font("Helvetica");
    
        return y + 25;
      };
    
      let y = drawTableHeader(tableTop);
    
      data.items
        .filter((item) => (item.quantity || 0) > 0)
        .forEach((item) => {
          const price = Number(item.unit_cost ?? item.price ?? 0);
          const amount = item.quantity * price;
    
          const descHeight = doc.heightOfString(item.itemName, {
            width: 220,
          });
    
          const rowHeight = Math.max(descHeight, 20) + 5;
    
          // Start a new page if this row won't fit
          if (y + rowHeight > pageBottom) {
            doc.addPage();
            y = drawTableHeader(60);
          }
    
          doc.text(item.quantity.toString(), colX.qty, y);
    
          doc.text(item.unit ?? "", colX.unit, y);
    
          doc.text(item.itemName ?? "", colX.desc, y, {
            width: 220,
          });
    
          doc.text(price.toFixed(2), colX.price, y);
    
          doc.text(amount.toFixed(2), colX.amount, y);
    
          y += rowHeight;
        });
    
      // ===== TOTAL =====
      const { netTotal } = this.computeTotals(data.items);
    
      // Ensure totals/signature fit on current page
      if (y + 140 > pageBottom) {
        doc.addPage();
        y = 60;
      }
    
      y += 20;
    
      doc.font("Helvetica-Bold");
    
      doc.text("Total Amount Due:", colX.price, y);
    
      doc.text(netTotal.toFixed(2), colX.amount, y);
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

    // Four short corner brackets framing a box — matching invoice.html's
    // .bracket, which marks the Registered Name / Ship To Address
    // fillable areas this way instead of a full border around them.
    private drawCornerFrame(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
      const cw = 10;
      const ch = 7;
      doc.lineWidth(1.1);
      doc.moveTo(x, y).lineTo(x + cw, y).stroke();
      doc.moveTo(x, y).lineTo(x, y + ch).stroke();
      doc.moveTo(x + w - cw, y).lineTo(x + w, y).stroke();
      doc.moveTo(x + w, y).lineTo(x + w, y + ch).stroke();
      doc.moveTo(x, y + h - ch).lineTo(x, y + h).stroke();
      doc.moveTo(x, y + h).lineTo(x + cw, y + h).stroke();
      doc.moveTo(x + w - cw, y + h).lineTo(x + w, y + h).stroke();
      doc.moveTo(x + w, y + h - ch).lineTo(x + w, y + h).stroke();
      doc.lineWidth(1);
    }

    // Recreates assets/invoice.html's layout (field order, totals block,
    // fonts) as a PDF — Courier maps 1:1 onto invoice.html's own Courier
    // New monospace, and every font-size below is copied straight from
    // invoice.html's own declared pt values (both are real physical
    // points, so there's no dpi conversion to get wrong). A delivery
    // receipt doesn't carry PO #/Terms/sales-type data, so those rows
    // print blank — the same "schema gap" convention already used
    // elsewhere in this file — rather than being dropped from the
    // layout. Waybill #/Courier, which exist for a DR but have no
    // invoice.html field, are added as one extra info row instead of
    // replacing anything invoice.html has.
    private generate_dr_a(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40, size: 'letter' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="delivery-receipt-a.pdf"',
      );

      doc.pipe(res);

      // Same positions, font sizes and item/totals formatting as
      // generate_invoice_no_details/generate_invoice_details_only — this
      // used to hardcode its own copy of every constant and had quietly
      // drifted from them (smaller fonts, different y-positions, no
      // comma-formatted amounts). Sharing invoiceLayout() means it can't
      // drift again.
      const L = this.invoiceLayout(doc);
      const { left, right, contentWidth, midX } = L;
      const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // ===== Header: title + logo + company block =====
      doc.font('Helvetica-Bold').fontSize(17).text('SALES INVOICE', left, 40);

      const logoW = 140;
      try {
        doc.image('assets/logo_nobg.png', right - logoW, 30, { width: logoW });
      } catch {
        // Missing logo shouldn't block printing the receipt — just skip it.
      }
      // Regular weight — matching invoice.html, where the header's company
      // name isn't bold (only the footer's repeat of it is).
      doc.font('Helvetica').fontSize(8.1)
        .text('AUTOSYNC VENTURES CORP.', left, 65, { width: contentWidth, align: 'left' })
        .text('VAT Reg. TIN: 682-408-625-00000', left, 76, { width: contentWidth, align: 'left' })
        .text('Unit 207, 210 Speaker Perez St.,', left, 87, { width: contentWidth, align: 'left' })
        .text('Corner Del Monte Ave, Quezon City', left, 98, { width: contentWidth, align: 'left' });

      // ===== D.R. No / Sold To / Registered Name / Ship To Address —
      // matching invoice.html's Invoice #/Sold To/Registered Name/Ship
      // To Address exactly, just relabeled for a delivery receipt. =====
      doc.font('Helvetica').fontSize(9);
      doc.text(`INVOICE NO.: ${data.drNo}`, left, L.invoiceNoY);
      doc.text(`DATE: ${data.date ?? ''}`, midX, L.invoiceNoY);
      doc.text(`SOLD TO: `, left, L.soldToY);
      doc.text('REGISTERED NAME', left, L.namesLabelY);
      doc.text('SHIP TO ADDRESS:', midX, L.namesLabelY);

      this.drawCornerFrame(doc, left, L.boxTop, L.leftBoxW, L.boxH);
      this.drawCornerFrame(doc, midX, L.boxTop, L.rightBoxW, L.boxH);
      doc.fontSize(8.4)
        .text(data.customerName, left + 4, L.boxTop + 4, { width: L.leftBoxW - 8 })
        .text(data.customerAddress, midX + 4, L.boxTop + 4, { width: L.rightBoxW - 8 });

      // ===== Info block — Client TIN/PO #/Terms (left) + Date/sales-type
      // checkboxes (right), matching invoice.html's <section class="meta">
      // exactly (PO #/Terms/the checkboxes print blank — no DR data for
      // them). =====
      doc.font('Helvetica').fontSize(9);
      const checkbox = (label: string, cx: number, cy: number) => {
        const s = 7;
        doc.rect(cx, cy - s + 1, s, s).lineWidth(0.8).stroke();
        doc.font('Helvetica').fontSize(9).text(label, cx + s + 6, cy - 6);
      };

      doc.text(`CLIENT TIN: ${data.customerTIN}`, left, L.clientTinY);
      checkbox('CHARGE SALES', midX, L.clientTinY + 6);
      doc.text('PO #: ', left, L.poY);
      checkbox('CASH SALES', midX, L.poY + 6);
      doc.text('TERMS: ', left, L.termsY);

      // ===== Item table — no border or shaded header row (invoice.html
      // has none); only DESCRIPTION is letter-spaced. Columns match
      // invoice.html's --col-desc/--col-qty/--col-price/--col-amt
      // (61.4/6.3/14.2/18.1%) — no item-code column; the unit sits
      // beside the qty instead of being folded into the description. =====
      const items = (data.items ?? []).filter(item => (item.quantity || 0) > 0);
      const { descX, qtyX, priceX, amtX, descW, qtyW, priceW, amtW } = L.cols;

      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('DESCRIPTION', descX, L.tableHeaderY, { width: descW, align: 'center', characterSpacing: 3 });
      doc.text('QTY', qtyX, L.tableHeaderY, { width: qtyW, align: 'center' });
      doc.text('UNIT PRICE', priceX, L.tableHeaderY, { width: priceW, align: 'center' });
      doc.text('AMOUNT', amtX, L.tableHeaderY, { width: amtW, align: 'center' });

      doc.font('Helvetica').fontSize(9);
      items.forEach((item, i) => {
        if (i >= L.ITEM_TABLE_ROWS) return; // more items than the shell reserves rows for
        const amount = item.quantity * item.price;
        const qtyLabel = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
        const ry = L.tableBodyTop + i * L.itemRowH;
        doc.text(item.itemName, descX + 2, ry, { width: descW - 4 });
        doc.text(qtyLabel, qtyX, ry, { width: qtyW - 4, align: 'right' });
        doc.text(fmt(item.price), priceX, ry, { width: priceW - 4, align: 'right' });
        doc.text(fmt(amount), amtX, ry, { width: amtW - 4, align: 'right' });
      });

      // ===== Totals — matching invoice.html's tbody.sums/.lower: no
      // border, no divider line; the VAT breakdown (VATABLE/VAT-EXEMPT/
      // VAT ZERO-RATED/VAT AMOUNT) sits to the left, top-aligned with
      // "Total Sales(VAT Inclusive)", instead of stacking under Amount
      // Due. All items are treated as vatable — same VAT math as
      // computeTotals uses everywhere else — so exempt/zero-rated are
      // always 0 here. =====
      const { netTotal, vatableSales, vat } = this.computeTotals(items);
      const withholding = 0; // schema gap — no withholding concept on a DR
      const amountDue = vatableSales - withholding;
      const totalAmountDue = amountDue + vat;
      const vatExemptSales = 0;
      const zeroRatedSales = 0;

      const { totalsLabelRight, totalsRowH, mainRowsTop } = L;

      const rightRow = (label: string, value: string, ry: number) => {
        doc.font('Helvetica').fontSize(9)
          .text(label, left, ry, { width: totalsLabelRight - left, align: 'right' });
        doc.text(value, amtX, ry, { width: amtW - 4, align: 'right' });
      };

      rightRow('Total Sales(VAT Inclusive)', fmt(netTotal), mainRowsTop);
      rightRow('Less: VAT', '', mainRowsTop + totalsRowH);
      rightRow('Amount Net of VAT', fmt(vatableSales), mainRowsTop + totalsRowH * 2);

      // "Less Discount: " (regular) + "SC/PWD/NAAC/MOV/SP" (bold,
      // smaller) — matching invoice.html's <b>, which wraps only the
      // discount codes, not the whole label.
      const discountY = mainRowsTop + totalsRowH * 3;
      const discountLead = 'Less Discount: ';
      doc.font('Helvetica-Bold').fontSize(7.3);
      const codeW = doc.widthOfString('SC/PWD/NAAC/MOV/SP');
      doc.font('Helvetica').fontSize(9);
      const leadW = doc.widthOfString(discountLead);
      doc.text(discountLead, totalsLabelRight - leadW - codeW, discountY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7.3)
        .text('SC/PWD/NAAC/MOV/SP', totalsLabelRight - codeW, discountY + 1, { lineBreak: false });

      rightRow('Less: Withholding Tax', '', mainRowsTop + totalsRowH * 4);
      rightRow('Amount Due', '', mainRowsTop + totalsRowH * 5);
      rightRow('Add: VAT', fmt(vat), mainRowsTop + totalsRowH * 6);
      rightRow('Total Amount Due', fmt(totalAmountDue), mainRowsTop + totalsRowH * 7);

      // Left column — bold, small, gray, letter-spaced, matching
      // invoice.html's .soft; blank when zero, like every other total on
      // this form that isn't a headline figure.
      const softRow = (label: string, value: number, ry: number) => {
        doc.font('Helvetica-Bold').fontSize(7.4).fillColor('#8a8a8a')
          .text(label, left, ry, { width: L.vatBreakdownLabelW, characterSpacing: 0.6, lineBreak: false });
        doc.fillColor('#000000').font('Helvetica').fontSize(9)
          .text(value ? fmt(value) : '', left + L.vatBreakdownLabelW, ry, { width: L.vatBreakdownValueW, align: 'right' });
      };
      softRow('VATABLE SALES', vatableSales, mainRowsTop);
      softRow('VAT-EXEMPT SALES', vatExemptSales, mainRowsTop + totalsRowH);
      softRow('VAT ZERO-RATED SALES', zeroRatedSales, mainRowsTop + totalsRowH * 2);
      softRow('VAT AMOUNT', vat, mainRowsTop + totalsRowH * 3);

      // ===== Checked and received + signature block — bold, matching
      // invoice.html's .received/.sig exactly. =====
      let y = L.signatureTop;
      doc.font('Helvetica-Bold').fontSize(8.6)
        .text('CHECKED AND RECEIVED THE ABOVE ITEMS/GOODS IN GOOD ORDER AND CONDITION', left, y, { width: contentWidth });
      y += 22;
      doc.text(`SIGNATURE :  ${'_'.repeat(45)}`, left, y);
      y += 16;
      doc.text(`PRINTED NAME :  ${'_'.repeat(42)}`, left, y);
      y += 16;
      doc.text(`DATE :  ${'_'.repeat(45)}`, left, y);

      // ===== Compliance footer — matching invoice.html's printerLeft/
      // printerRight config exactly (LL Permit No./Issued Date left; BIR
      // ATP No./Date Issued/Approved Series right, with the company name
      // + rule above it — bold, unlike the header's regular-weight
      // company name). Left blank rather than fabricated. Redrawn on
      // every page PDFKit adds for an overflowing item list. =====
      const drawFooter = () => {
        const footerBottom = doc.page.height - doc.page.margins.bottom;
        const fLeft = doc.page.margins.left;
        const fRight = doc.page.width - doc.page.margins.right;
        const rightColW = 220;
        const rightColX = fRight - rightColW;

        doc.font('Helvetica-Bold').fontSize(9);
        doc.moveTo(rightColX, footerBottom - 42).lineTo(fRight, footerBottom - 42).lineWidth(1.2).stroke();
        doc.text('AUTOSYNC VENTURES CORP.', rightColX, footerBottom - 37, { width: rightColW, align: 'center' });

        doc.font('Helvetica').fontSize(6.3);
        doc.text('BIR ATP No.: ', rightColX, footerBottom - 24);
        doc.text('Date Issued: ', rightColX, footerBottom - 16);
        doc.text('Approved Series: ', rightColX, footerBottom - 8);

        doc.text('LL Permit No.: ', fLeft + 45, footerBottom - 16);
        doc.text('Issued Date: ', fLeft + 45, footerBottom - 8);
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

    // Shared column layout for the Sales Invoice shell/details pair —
    // both need the same DESCRIPTION/QTY/UNIT PRICE/AMOUNT positions so
    // a details-only printout lines up with a no-details shell if the
    // two are ever overlaid on the same sheet of paper.
    private invoiceColumns(left: number, contentWidth: number) {
      const descW = Math.round(contentWidth * 0.614);
      const qtyW = Math.round(contentWidth * 0.063);
      const priceW = Math.round(contentWidth * 0.142);
      const amtW = contentWidth - descW - qtyW - priceW;
      const descX = left;
      const qtyX = descX + descW;
      const priceX = qtyX + qtyW;
      const amtX = priceX + priceW;
      return { descW, qtyW, priceW, amtW, descX, qtyX, priceX, amtX };
    }

    // Every position the shell (no-details) and the values (details-only)
    // printouts need to agree on, computed once so they can't drift apart
    // — both generators below call this and only this for coordinates,
    // so overlaying one page from each produces a filled-in invoice with
    // every value landing exactly where its label/box/column is.
    private invoiceLayout(doc: PDFKit.PDFDocument) {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const contentWidth = right - left;
      const midX = left + Math.round(contentWidth * 0.55);

      const invoiceNoY = 148;
      const soldToY = invoiceNoY + 14;
      const namesLabelY = soldToY + 14;
      const boxTop = namesLabelY + 10;
      const boxH = 38;
      const leftBoxW = midX - left - 15;
      const rightBoxW = right - midX;

      const infoRowH = 14;
      const metaTop = boxTop + boxH + 12;
      const clientTinY = metaTop;
      const poY = metaTop + infoRowH;
      const termsY = metaTop + infoRowH * 2;

      const tableHeaderY = termsY + infoRowH + 10;
      const cols = this.invoiceColumns(left, contentWidth);
      const ITEM_TABLE_ROWS = 16;
      const itemRowH = 12;
      const tableBodyTop = tableHeaderY + 16;

      const totalsLabelRight = cols.amtX - 4;
      const totalsRowH = 13;
      const mainRowsTop = tableBodyTop + ITEM_TABLE_ROWS * itemRowH + 12;
      // Wide enough for "VAT ZERO-RATED SALES" (the longest of the four)
      // at 7.4pt bold with its letter-spacing without wrapping to 2 lines.
      const vatBreakdownLabelW = 118;
      const vatBreakdownValueW = 60;

      const signatureTop = mainRowsTop + totalsRowH * 8 + 16;

      return {
        left, right, contentWidth, midX,
        invoiceNoY, soldToY, namesLabelY, boxTop, boxH, leftBoxW, rightBoxW,
        infoRowH, clientTinY, poY, termsY,
        tableHeaderY, cols, ITEM_TABLE_ROWS, itemRowH, tableBodyTop,
        totalsLabelRight, totalsRowH, mainRowsTop, vatBreakdownLabelW, vatBreakdownValueW,
        signatureTop,
      };
    }

    // ===========================================================================
    // Sales Invoice — shell (no details): everything except this
    // invoice's own data. Same field layout as generate_dr_a's Sales
    // Invoice header, just with every value left blank — a reusable
    // blank form, or the first pass onto paper that details-only (below)
    // overlays with the actual figures.
    // ===========================================================================
    private generate_invoice_no_details(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40, size: 'letter' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="sales-invoice-no-details.pdf"',
      );

      doc.pipe(res);

      const L = this.invoiceLayout(doc);
      const { left, right, contentWidth, midX } = L;

      // ===== Header: title + logo + company block — real, but not
      // "details" of this specific invoice, so it belongs on the shell. =====
      doc.font('Helvetica-Bold').fontSize(17).text('SALES INVOICE', left, 40);

      const logoW = 140;
      try {
        doc.image('assets/logo_nobg.png', right - logoW, 30, { width: logoW });
      } catch {
        // Missing logo shouldn't block printing — just skip it.
      }
      doc.font('Helvetica').fontSize(8.1)
        .text('AUTOSYNC VENTURES CORP.', left, 65, { width: contentWidth, align: 'left' })
        .text('VAT Reg. TIN: 682-408-625-00000', left, 76, { width: contentWidth, align: 'left' })
        .text('Unit 207, 210 Speaker Perez St.,', left, 87, { width: contentWidth, align: 'left' })
        .text('Corner Del Monte Ave, Quezon City', left, 98, { width: contentWidth, align: 'left' });

      // ===== Field labels only — no invoice number, customer name,
      // address, TIN, terms, date, or sales-type mark. =====
      doc.font('Helvetica').fontSize(9);
      doc.text('INVOICE NO.: ', left, L.invoiceNoY);
      doc.text('DATE: ', midX, L.invoiceNoY);
      doc.text('SOLD TO', left, L.soldToY);
      doc.text('REGISTERED NAME', left, L.namesLabelY);
      doc.text('SHIP TO ADDRESS:', midX, L.namesLabelY);

      this.drawCornerFrame(doc, left, L.boxTop, L.leftBoxW, L.boxH);
      this.drawCornerFrame(doc, midX, L.boxTop, L.rightBoxW, L.boxH);

      // Box top matches the label's own y exactly — matching
      // generate_dr_a's checkbox helper, which centers the 7pt square
      // against the label's cap-height (all-caps text has no descenders,
      // so its visible glyph runs from the text's own y down to the
      // baseline, not the full line-height box). This one used to sit
      // the box 6pt above that, floating well above its label.
      doc.text('CLIENT TIN: ', left, L.clientTinY);
      doc.rect(midX, L.clientTinY, 7, 7).lineWidth(0.8).stroke();
      doc.text('CHARGE SALES', midX + 13, L.clientTinY);
      doc.text('PO #: ', left, L.poY);
      doc.rect(midX, L.poY, 7, 7).lineWidth(0.8).stroke();
      doc.text('CASH SALES', midX + 13, L.poY);
      doc.text('TERMS: ', left, L.termsY);

      // ===== Item table — header row + 16 blank reserved rows, matching
      // generate_dr_a's fixed-height table exactly, no item data drawn. =====
      const { descX, qtyX, priceX, amtX, descW, qtyW, priceW, amtW } = L.cols;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('DESCRIPTION', descX, L.tableHeaderY, { width: descW, align: 'center', characterSpacing: 3 });
      doc.text('QTY', qtyX, L.tableHeaderY, { width: qtyW, align: 'center' });
      doc.text('UNIT PRICE', priceX, L.tableHeaderY, { width: priceW, align: 'center' });
      doc.text('AMOUNT', amtX, L.tableHeaderY, { width: amtW, align: 'center' });

      // ===== Totals — labels only, no computed figures. =====
      const { totalsLabelRight, totalsRowH, mainRowsTop } = L;
      const labelOnly = (label: string, ry: number) => {
        doc.font('Helvetica').fontSize(9)
          .text(label, left, ry, { width: totalsLabelRight - left, align: 'right' });
      };
      labelOnly('Total Sales(VAT Inclusive)', mainRowsTop);
      labelOnly('Less: VAT', mainRowsTop + totalsRowH);
      labelOnly('Amount Net of VAT', mainRowsTop + totalsRowH * 2);

      const discountY = mainRowsTop + totalsRowH * 3;
      const discountLead = 'Less Discount: ';
      doc.font('Helvetica-Bold').fontSize(7.3);
      const codeW = doc.widthOfString('SC/PWD/NAAC/MOV/SP');
      doc.font('Helvetica').fontSize(9);
      const leadW = doc.widthOfString(discountLead);
      doc.text(discountLead, totalsLabelRight - leadW - codeW, discountY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7.3)
        .text('SC/PWD/NAAC/MOV/SP', totalsLabelRight - codeW, discountY + 1, { lineBreak: false });

      labelOnly('Less: Withholding Tax', mainRowsTop + totalsRowH * 4);
      labelOnly('Amount Due', mainRowsTop + totalsRowH * 5);
      labelOnly('Add: VAT', mainRowsTop + totalsRowH * 6);
      labelOnly('Total Amount Due', mainRowsTop + totalsRowH * 7);

      const softLabelOnly = (label: string, ry: number) => {
        doc.font('Helvetica-Bold').fontSize(7.4).fillColor('#8a8a8a')
          .text(label, left, ry, { width: L.vatBreakdownLabelW, characterSpacing: 0.6, lineBreak: false });
        doc.fillColor('#000000');
      };
      softLabelOnly('VATABLE SALES', mainRowsTop);
      softLabelOnly('VAT-EXEMPT SALES', mainRowsTop + totalsRowH);
      softLabelOnly('VAT ZERO-RATED SALES', mainRowsTop + totalsRowH * 2);
      softLabelOnly('VAT AMOUNT', mainRowsTop + totalsRowH * 3);

      // ===== Signature block — always the same text, not this invoice's
      // data, so it belongs on the shell. =====
      let y = L.signatureTop;
      doc.font('Helvetica-Bold').fontSize(8.6)
        .text('CHECKED AND RECEIVED THE ABOVE ITEMS/GOODS IN GOOD ORDER AND CONDITION', left, y, { width: contentWidth });
      y += 22;
      doc.text(`SIGNATURE :  ${'_'.repeat(45)}`, left, y);
      y += 16;
      doc.text(`PRINTED NAME :  ${'_'.repeat(42)}`, left, y);
      y += 16;
      doc.text(`DATE :  ${'_'.repeat(45)}`, left, y);

      // ===== Compliance footer — same wording as generate_dr_a's. =====
      const drawFooter = () => {
        const footerBottom = doc.page.height - doc.page.margins.bottom;
        const fLeft = doc.page.margins.left;
        const fRight = doc.page.width - doc.page.margins.right;
        const rightColW = 220;
        const rightColX = fRight - rightColW;

        doc.font('Helvetica-Bold').fontSize(9);
        doc.moveTo(rightColX, footerBottom - 42).lineTo(fRight, footerBottom - 42).lineWidth(1.2).stroke();
        doc.text('AUTOSYNC VENTURES CORP.', rightColX, footerBottom - 37, { width: rightColW, align: 'center' });

        // Bottom line sits 8pt clear of the page's own bottom margin —
        // the previous 6pt clearance was enough at 5.6pt but not at the
        // slightly larger 6.3pt this text now renders at, and PDFKit
        // silently starts a new page (and re-fires this whole footer)
        // rather than letting text print into the margin.
        doc.font('Helvetica').fontSize(6.3);
        doc.text('This part is for BIR LL details.', fLeft + 45, footerBottom - 16);
        /*
        doc.text('BIR ATP No.: ', rightColX, footerBottom - 24);
        doc.text('Date Issued: ', rightColX, footerBottom - 16);
        doc.text('Approved Series: ', rightColX, footerBottom - 8);

        doc.text('LL Permit No.: ', fLeft + 45, footerBottom - 16);
        doc.text('Issued Date: ', fLeft + 45, footerBottom - 8);
        */
      };
      drawFooter();
      doc.on('pageAdded', drawFooter);

      doc.end();
    }

    // ===========================================================================
    // Sales Invoice — details only: just this invoice's data (invoice #,
    // sold to, registered name/ship to, client TIN/PO/terms/date/sales
    // type, item rows, totals), positioned via the exact same
    // invoiceLayout() coordinates as the shell — no title/logo/company
    // block/labels/lines/signature/footer, since those are static and
    // already covered there. Overlay one page from each and every value
    // lands on its label/box/column.
    // ===========================================================================
    private generate_invoice_details_only(data: any, res: Response) {
      const doc = new PDFDocument({ margin: 40, size: 'letter' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="sales-invoice-details-only.pdf"',
      );

      doc.pipe(res);

      const L = this.invoiceLayout(doc);
      const { left, midX } = L;
      const items = (data.items ?? []).filter((item: any) => (item.quantity || 0) > 0);
      const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // ===== Invoice #, Sold To — value drawn right after where the
      // shell's own label text ends, same row. =====
      doc.font('Helvetica').fontSize(9);
      const afterLabel = (label: string, y: number, value: string, baseX: number = left) => {
        const labelW = doc.widthOfString(label);
        doc.text(value, baseX + labelW + 4, y);
      };
      afterLabel('INVOICE NO.: ', L.invoiceNoY, '');
      afterLabel('DATE: ', L.invoiceNoY, data.date ?? '', midX);
      afterLabel('SOLD TO', L.soldToY, '');

      // ===== Registered Name / Ship To Address — inside the shell's
      // corner-bracket boxes, same inset the boxes themselves use. =====
      doc.fontSize(8.4)
        .text(data.customerName ?? '', left + 4, L.boxTop + 4, { width: L.leftBoxW - 8 })
        .text(data.customerAddress ?? '', midX + 4, L.boxTop + 4, { width: L.rightBoxW - 8 });

      // ===== Client TIN/PO #/Terms/Date, and a check mark inside
      // whichever sales-type box applies. The box itself now sits at
      // L.clientTinY/L.poY (see generate_invoice_no_details) — this nudges
      // the X down 1pt from that same box top to sit centered inside it. =====
      doc.font('Helvetica').fontSize(9);
      afterLabel('CLIENT TIN: ', L.clientTinY, data.customerTIN ?? '');
      afterLabel('PO #: ', L.poY, data.poNumber ?? '');
      //afterLabel('TERMS: ', L.termsY, data.terms ?? '');
      if (data.salesType === 'charge') {
        doc.font('Helvetica-Bold').fontSize(8).text('X', midX + 1, L.clientTinY + 1);
      } else if (data.salesType === 'cash') {
        doc.font('Helvetica-Bold').fontSize(8).text('X', midX + 1, L.poY + 1);
      }

      // ===== Item rows — same columns/row height as the shell's
      // reserved 16-row table, starting right below its header row. =====
      doc.font('Helvetica').fontSize(9);
      const { descX, qtyX, priceX, amtX, descW, qtyW, priceW, amtW } = L.cols;
      items.forEach((item: any, i: number) => {
        if (i >= L.ITEM_TABLE_ROWS) return; // more items than the shell reserves rows for
        const amount = item.quantity * item.price;
        const qtyLabel = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
        const ry = L.tableBodyTop + i * L.itemRowH;
        doc.text(item.itemName, descX + 2, ry, { width: descW - 4 });
        doc.text(qtyLabel, qtyX, ry, { width: qtyW - 4, align: 'right' });
        doc.text(fmt(item.price), priceX, ry, { width: priceW - 4, align: 'right' });
        doc.text(fmt(amount), amtX, ry, { width: amtW - 4, align: 'right' });
      });

      // ===== Totals — values only, at the shell's exact label rows. =====
      const { netTotal, vatableSales, vat } = this.computeTotals(items);
      const withholding = 0; // schema gap — no withholding concept computed here
      const amountDue = vatableSales - withholding;
      const totalAmountDue = amountDue + vat;
      const vatExemptSales = 0;
      const zeroRatedSales = 0;

      const { totalsLabelRight, totalsRowH, mainRowsTop } = L;
      const valueOnly = (value: string, ry: number) => {
        doc.font('Helvetica').fontSize(9).text(value, amtX, ry, { width: amtW - 4, align: 'right' });
      };
      valueOnly(fmt(netTotal), mainRowsTop);
      //valueOnly(fmt(vat), mainRowsTop + totalsRowH);
      valueOnly(fmt(vatableSales), mainRowsTop + totalsRowH * 2);
      // Row 3 (Less Discount) and row 4 (Less: Withholding Tax) stay
      // blank — no discount/withholding figures computed for this form.
      //valueOnly(fmt(amountDue), mainRowsTop + totalsRowH * 5);
      valueOnly(fmt(vat), mainRowsTop + totalsRowH * 6);
      valueOnly(fmt(totalAmountDue), mainRowsTop + totalsRowH * 7);

      const softValueOnly = (value: number, ry: number) => {
        if (!value) return;
        doc.font('Helvetica').fontSize(9)
          .text(fmt(value), left + L.vatBreakdownLabelW, ry, { width: L.vatBreakdownValueW, align: 'right' });
      };
      softValueOnly(vatableSales, mainRowsTop);
      softValueOnly(vatExemptSales, mainRowsTop + totalsRowH);
      softValueOnly(zeroRatedSales, mainRowsTop + totalsRowH * 2);
      softValueOnly(vat, mainRowsTop + totalsRowH * 3);

      doc.end();
    }
  }
  