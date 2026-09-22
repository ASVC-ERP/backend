import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { EscpBuilder } from './escp-builder';
import { INVOICE_FIELD_MAP, INVOICE_LAYOUT_FULL } from './invoice-field-map';

type MastheadMeta = {
  widthDots: number;
  heightDots: number;
  lpi: number;
  linesConsumed: number;
};

export type DotMatrixInvoiceData = {
  invoice_number: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerTIN: string;
  terms: string;
  order_id: number;

  // Not yet on the sales_invoices schema — printed blank until a migration
  // adds them. See the dot-matrix invoice guide, step 10.
  poNumber: string;
  modeOfPayment: string;
  checkNo: string;
  bankName: string;
  projectId: string;

  total_price: number;
  items: {
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: number;
    price: number;
  }[];
};

@Injectable()
export class DotMatrixInvoiceService {
  // MODE A — fills a pre-printed form. No borders, no header, no logo:
  // the physical paper already has them.
  buildModeA(data: DotMatrixInvoiceData): Buffer {
    const map = INVOICE_FIELD_MAP;

    if (data.items.length > map.itemsMaxRows) {
      throw new BadRequestException(
        `Invoice has ${data.items.length} line items, but the pre-printed form only fits ${map.itemsMaxRows} per page. Continuation-page handling isn't built yet.`,
      );
    }

    const b = new EscpBuilder();
    b.reset().pica().lpi6();

    let line = 0;
    const toRow = (row: number) => {
      b.advanceToRow(line, row);
      line = row;
    };

    toRow(map.topOfFormOffsetLines);

    // ===== Header block =====
    toRow(map.invoiceNo.row);
    b.column(map.invoiceNo.col).text(data.invoice_number);

    toRow(map.soldTo.row);
    b.column(map.soldTo.col).text(data.customerName);

    toRow(map.registeredName.row);
    b.column(map.registeredName.col).text(data.customerName);
    b.column(map.shipToAddress.col).text(data.customerAddress);
    b.cr().lf();

    // ===== Info block =====
    toRow(map.date.row);
    b.column(map.date.col).text(data.date);
    b.column(map.modeOfPayment.col).text(data.modeOfPayment);
    b.cr().lf();

    toRow(map.clientTin.row);
    b.column(map.clientTin.col).text(data.customerTIN);
    b.column(map.checkNo.col).text(data.checkNo);
    b.cr().lf();

    toRow(map.poNumber.row);
    b.column(map.poNumber.col).text(data.poNumber);
    b.column(map.bankName.col).text(data.bankName);
    b.cr().lf();

    toRow(map.terms.row);
    b.column(map.terms.col).text(data.terms);
    b.column(map.projectId.col).text(data.projectId);
    b.cr().lf();

    // ===== Item table =====
    let itemRow = map.itemsStartRow;
    for (const [i, item] of data.items.entries()) {
      toRow(itemRow);

      const amount = item.quantity * item.price;
      b.column(map.itemCols.no).text(String(i + 1));
      b.column(map.itemCols.code).text(item.itemCode);
      b.column(map.itemCols.desc).text(item.itemName);
      b.column(map.itemCols.qty).text(String(item.quantity));
      b.column(map.itemCols.unitPrice).text(item.price.toFixed(2));
      b.column(map.itemCols.amount).text(amount.toFixed(2));
      b.cr().lf();

      itemRow += map.itemRowStride;
    }

    // ===== Totals =====
    const { netTotal, vatableSales, vat } = this.computeTotals(data.items);
    const withholding = 0; // schema gap — see DotMatrixInvoiceData comment
    const amountDue = vatableSales - withholding;

    const t = map.totals;
    toRow(t.totalSalesVatIncl.row);
    b.column(t.totalSalesVatIncl.col).text(netTotal.toFixed(2));

    toRow(t.lessVat.row);
    b.column(t.lessVat.col).text(vat.toFixed(2));

    toRow(t.netOfVat.row);
    b.column(t.netOfVat.col).text(vatableSales.toFixed(2));

    toRow(t.lessWithholding.row);
    b.column(t.lessWithholding.col).text(withholding.toFixed(2));

    toRow(t.amountDue.row);
    b.column(t.amountDue.col).text(amountDue.toFixed(2));

    toRow(t.addVat.row);
    b.column(t.addVat.col).text(vat.toFixed(2));

    toRow(t.vatableSales.row);
    b.column(t.vatableSales.col).text(vatableSales.toFixed(2));

    toRow(t.vatExemptSales.row);
    b.column(t.vatExemptSales.col).text((0).toFixed(2));

    toRow(t.vatZeroRatedSales.row);
    b.column(t.vatZeroRatedSales.col).text((0).toFixed(2));

    toRow(t.vatAmount.row);
    b.column(t.vatAmount.col).text(vat.toFixed(2));

    b.formFeed();
    return b.build();
  }

  // MODE B — full layout on blank paper. The masthead (title, logo,
  // company block) is the one region that's a pre-baked bitmap — see
  // escp-image.ts and scripts/build-invoice-masthead.js. Everything below
  // it is plain ESC/P text, forward-interleaved with the variable data,
  // because a dot-matrix printer can never feed paper backward to overlay
  // text onto a region it already passed.
  buildModeB(data: DotMatrixInvoiceData): Buffer {
    const layout = INVOICE_LAYOUT_FULL;

    if (data.items.length > layout.itemsMaxRows) {
      throw new BadRequestException(
        `Invoice has ${data.items.length} line items, but Mode B's single-page layout only fits ${layout.itemsMaxRows}. Continuation-page handling isn't built yet.`,
      );
    }

    const masthead = this.loadMasthead();
    if (masthead.meta.linesConsumed !== layout.headerLines) {
      throw new InternalServerErrorException(
        `invoice-masthead.meta.json reports ${masthead.meta.linesConsumed} lines, but INVOICE_LAYOUT_FULL.headerLines is ${layout.headerLines}. Rebuild the masthead or update the layout config — they drifted apart.`,
      );
    }

    const b = new EscpBuilder();
    b.reset().pica().lpi6();
    b.raw(masthead.buffer);

    for (let i = 0; i < layout.blankLinesAfterMasthead; i++) b.lf();

    const colRightChar = layout.colRight / 6;

    // A short paired field (date, check no., bank name — normally a few
    // characters) on each half of the line. Both sides are truncated to
    // their cell width so a longer-than-expected value can never run into
    // the other column or past the page edge.
    const pairedLine = (leftLabel: string, leftValue: string, rightLabel?: string, rightValue?: string) => {
      const leftMax = colRightChar - leftLabel.length - 1;
      b.column(layout.colLeft).text(`${leftLabel} ${this.truncate(leftValue, Math.max(leftMax, 1))}`);
      if (rightLabel) {
        const rightMax = layout.pageWidthChars - colRightChar - rightLabel.length - 1;
        b.column(layout.colRight).text(`${rightLabel} ${this.truncate(rightValue ?? '', Math.max(rightMax, 1))}`);
      }
      b.cr().lf();
    };

    // A full-width field whose value can genuinely run long (a business
    // name, a street address) — wraps onto continuation lines indented
    // under the label, instead of truncating real customer data.
    const wrappedLine = (label: string, value: string) => {
      const maxChars = Math.max(layout.pageWidthChars - label.length - 1, 10);
      const lines = this.wrapText(value, maxChars);
      b.column(layout.colLeft).text(`${label} ${lines[0]}`);
      b.cr().lf();
      const indent = ' '.repeat(label.length + 1);
      for (let k = 1; k < lines.length; k++) {
        b.column(layout.colLeft).text(indent + lines[k]);
        b.cr().lf();
      }
    };

    const blank = (count = 1) => {
      for (let i = 0; i < count; i++) b.lf();
    };

    // ===== Header block =====
    wrappedLine('Invoice #:', data.invoice_number);
    wrappedLine('Sold To:', data.customerName);
    wrappedLine('Registered Name:', data.customerName);
    wrappedLine('Ship To Address:', data.customerAddress);
    pairedLine('Date:', data.date, 'Mode of Payment:', data.modeOfPayment);
    pairedLine('Client TIN:', data.customerTIN, 'Check No.:', data.checkNo);
    pairedLine('PO #:', data.poNumber, 'Bank Name:', data.bankName);
    pairedLine('Terms:', data.terms, 'Project ID:', data.projectId);

    blank(layout.blankLinesBeforeTotals > 0 ? 1 : 0);

    // ===== Item table =====
    const cols = layout.itemsHeaderCols;
    b.column(cols.no).text('No');
    b.column(cols.code).text('Code');
    b.column(cols.desc).text('Description');
    b.column(cols.qty).text('Qty');
    b.column(cols.unitPrice).text('Unit Price');
    b.column(cols.amount).text('Amount');
    b.cr().lf();
    b.column(0).text('-'.repeat(layout.pageWidthChars));
    b.cr().lf();

    for (const [i, item] of data.items.entries()) {
      const amount = item.quantity * item.price;
      b.column(cols.no).text(String(i + 1));
      b.column(cols.code).text(item.itemCode);
      b.column(cols.desc).text(this.truncate(item.itemName, layout.itemDescMaxChars));
      b.column(cols.qty).text(String(item.quantity));
      b.column(cols.unitPrice).text(item.price.toFixed(2));
      b.column(cols.amount).text(amount.toFixed(2));
      b.cr().lf();
    }

    // ===== Totals =====
    const { netTotal, vatableSales, vat } = this.computeTotals(data.items);
    const withholding = 0; // schema gap — see DotMatrixInvoiceData comment
    const amountDue = vatableSales - withholding;

    blank(layout.blankLinesBeforeTotals);
    pairedLine('Total Sales (VAT Inclusive):', netTotal.toFixed(2));
    pairedLine('Less: VAT:', vat.toFixed(2));
    pairedLine('Amount Net of VAT:', vatableSales.toFixed(2));
    pairedLine('Less: Withholding Tax:', withholding.toFixed(2));
    pairedLine('Amount Due:', amountDue.toFixed(2));
    pairedLine('Add: VAT:', vat.toFixed(2));
    pairedLine('Vatable Sales:', vatableSales.toFixed(2));
    pairedLine('VAT-Exempt Sales:', (0).toFixed(2));
    pairedLine('VAT Zero-Rated Sales:', (0).toFixed(2));
    pairedLine('VAT Amount:', vat.toFixed(2));

    // ===== Terms & signature =====
    blank(layout.blankLinesBeforeTerms);
    for (const row of layout.termsAndConditions) {
      b.column(layout.colLeft).text(row);
      b.cr().lf();
    }

    blank(layout.blankLinesBeforeSignature);
    b.column(layout.colLeft).text('Checked and received the above items/goods in good order and condition.');
    b.cr().lf();
    // Sized to fit their cells outright rather than relying on truncation —
    // an ellipsis mid-blank on a signature line would look like a bug.
    pairedLine('Signature:', '_'.repeat(30), 'Printed Name:', '_'.repeat(15));
    pairedLine('Date:', '_'.repeat(20));

    // ===== Compliance footer — see INVOICE_LAYOUT_FULL for why this is a
    // placeholder rather than real numbers. =====
    blank(layout.blankLinesBeforeFooter);
    b.column(layout.colLeft).text(layout.complianceFooterPlaceholder);
    b.cr().lf();

    b.formFeed();
    return b.build();
  }

  private mastheadCache?: { buffer: Buffer; meta: MastheadMeta };

  private loadMasthead() {
    if (this.mastheadCache) return this.mastheadCache;

    try {
      const buffer = readFileSync('assets/dot-matrix/invoice-masthead.bin');
      const meta = JSON.parse(
        readFileSync('assets/dot-matrix/invoice-masthead.meta.json', 'utf8'),
      ) as MastheadMeta;
      this.mastheadCache = { buffer, meta };
      return this.mastheadCache;
    } catch {
      throw new InternalServerErrorException(
        'Mode B masthead artwork is missing. Run `node scripts/build-invoice-masthead.js` from ims-backend/ to generate assets/dot-matrix/invoice-masthead.bin first.',
      );
    }
  }

  // ESC/P text is single-byte ASCII/codepage, not UTF-8 — a Unicode
  // ellipsis (…) here would encode as garbage on the printer, so this uses
  // three plain dots instead.
  private truncate(s: string, maxChars: number): string {
    if (s.length <= maxChars) return s;
    if (maxChars <= 3) return s.slice(0, maxChars);
    return s.slice(0, maxChars - 3) + '...';
  }

  // Word-wraps to a max line width, hard-breaking any single word longer
  // than the width so a run of characters with no spaces can't overflow.
  private wrapText(s: string, maxChars: number): string[] {
    const words = s.split(' ').filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
    if (current) lines.push(current);

    return lines.length > 0 ? lines : [''];
  }

  // Same VAT math as PrintController.computeTotals for PO/DR — all items
  // treated as vatable until products carry a VAT classification.
  private computeTotals(items: { quantity: number; price: number }[]) {
    const netTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
    const vatableSales = netTotal / 1.12;
    const vat = netTotal - vatableSales;
    return { netTotal, vatableSales, vat };
  }
}
