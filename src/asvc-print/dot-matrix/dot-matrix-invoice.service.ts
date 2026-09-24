import { Injectable, BadRequestException } from '@nestjs/common';
import { EscpBuilder } from './escp-builder';
import { INVOICE_FIELD_MAP } from './invoice-field-map';
import { decodeEscpToText } from './escp-preview';
import { buildInvoiceSvg } from './invoice-svg-template';
import { renderSvgToBitImage, renderSvgToPreviewPng } from './svg-to-bitimage';

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

export type DotMatrixPreview = { contentType: 'text/plain' | 'image/png'; body: string | Buffer };

@Injectable()
export class DotMatrixInvoiceService {
  // Dry run: builds the exact same bytes buildModeA/buildModeB would send
  // to a printer, but never touches a printer. Mode A is genuinely plain
  // text, so its preview is decoded ESC/P text; Mode B is a dithered
  // full-page image, so a text decode would be meaningless — its preview
  // is the same dithered raster the printer would receive, as a PNG, so
  // what you see here is what would actually print.
  async preview(data: DotMatrixInvoiceData, mode: 'form' | 'full'): Promise<DotMatrixPreview> {
    if (mode === 'full') {
      const { svg, width, authorHeight } = buildInvoiceSvg(data);
      const png = await renderSvgToPreviewPng(svg, width, authorHeight);
      return { contentType: 'image/png', body: png };
    }
    return { contentType: 'text/plain', body: decodeEscpToText(this.buildModeA(data)) };
  }

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

  // MODE B — full layout on blank paper. Recreates invoice.jpg's actual
  // layout (invoice-svg-template.ts) rather than approximating it with
  // ASCII text, and prints the WHOLE page as one continuous bit-image
  // pass (svg-to-bitimage.ts) — the only way to get pixel-accurate boxes,
  // shading and logo placement on a dot-matrix printer, at the cost of
  // graphics mode being much slower to print than plain text. The item
  // table height grows with the item count instead of being fixed to
  // whatever blank space a static pre-printed pad happens to have.
  async buildModeB(data: DotMatrixInvoiceData): Promise<Buffer> {
    const { svg, width, authorHeight } = buildInvoiceSvg(data);
    const image = await renderSvgToBitImage(svg, width, authorHeight);

    const b = new EscpBuilder();
    b.reset().pica();
    b.raw(image);
    b.formFeed();
    return b.build();
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
