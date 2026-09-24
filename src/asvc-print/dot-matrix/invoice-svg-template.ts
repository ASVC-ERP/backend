import { readFileSync } from 'fs';
import { truncate, wrapText } from './text-wrap';
import type { DotMatrixInvoiceData } from './dot-matrix-invoice.service';

// Recreates invoice.jpg's layout as a clean vector template — not the
// compressed photo itself, which would dither into muddy noise once
// reduced to 1-bit for the printer. Real Autosync Ventures Corp. header
// info (the same text already hardcoded in generate_dr_a's PDF output),
// not the mock's placeholder "ONE TRADE PH" branding.
//
// Authored at a uniform 120dpi for both axes (so hand-picked coordinates
// stay visually square while writing this file); the render pipeline
// (svg-to-bitimage.ts) does the corrective vertical stretch to the
// printer's real 120h x 180v dot geometry before dithering. Width is
// fixed at 8" (960 dots) to match the rest of this module's conventions;
// height grows with the item count instead of being fixed to whatever
// blank space a static pre-printed pad happens to have.

const WIDTH = 960;
const MARGIN = 24;
const CONTENT_LEFT = MARGIN;
const CONTENT_RIGHT = WIDTH - MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

const FONT = 'Arial, Helvetica, sans-serif';

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function text(
  x: number,
  y: number,
  content: string,
  opts: { size?: number; weight?: number; anchor?: 'start' | 'middle' | 'end'; style?: string; spacing?: number } = {},
): string {
  // Bold by default: a 1-bit threshold on a dot-matrix print is unforgiving
  // of thin regular-weight strokes (a lone "1", a lowercase "l") — bold
  // survives dithering and the printer's own dot spread far better, at the
  // cost of not having a real visual distinction from "emphasized" text.
  // That trade is worth it here; invoice.jpg's own text reads as bold too.
  const { size = 11, weight = 700, anchor = 'start', style, spacing } = opts;
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${style ? ` font-style="${style}"` : ''}${spacing ? ` letter-spacing="${spacing}"` : ''} fill="#000000">${esc(content)}</text>`;
}

// A short bottom-left corner bracket — invoice.jpg marks its fillable
// blanks (Registered Name, Ship To Address) this way, not with a full box
// border around the whole field group.
function cornerMark(x: number, y: number, w = 26, h = 10): string {
  return line(x, y - h, x, y) + line(x, y, x + w, y);
}

function rect(x: number, y: number, w: number, h: number, opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}): string {
  const { fill = 'none', stroke = '#000000', strokeWidth = 1.5 } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke === 'none' ? 'none' : stroke}" ${stroke === 'none' ? '' : `stroke-width="${strokeWidth}"`} />`;
}

function line(x1: number, y1: number, x2: number, y2: number, opts: { stroke?: string; strokeWidth?: number } = {}): string {
  const { stroke = '#000000', strokeWidth = 1 } = opts;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

export function buildInvoiceSvg(data: DotMatrixInvoiceData): { svg: string; width: number; authorHeight: number } {
  const parts: string[] = [];
  let y = 0;

  // ===== Header: title + logo + company block =====
  y = 24;
  parts.push(text(CONTENT_LEFT, y + 34, 'INVOICE', { size: 34, weight: 700 }));

  const logoPath = 'assets/logo_nobg.png';
  let logoDataUri = '';
  try {
    logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
  } catch {
    // Missing logo shouldn't block printing the invoice — just skip it.
  }
  const logoW = 170;
  const logoH = 96;
  const logoX = 590;
  const logoY = y - 6;
  if (logoDataUri) {
    parts.push(
      `<image x="${logoX}" y="${logoY}" width="${logoW}" height="${logoH}" href="${logoDataUri}" xlink:href="${logoDataUri}" />`,
    );
  }
  const companyX = logoX + logoW + 14;
  parts.push(text(companyX, logoY + 28, 'Autosync Ventures Corp.', { size: 13, weight: 700 }));
  parts.push(text(companyX, logoY + 46, 'Unit 207, 210 Speaker Perez St.,', { size: 10 }));
  parts.push(text(companyX, logoY + 60, 'Corner Del Monte Ave, Quezon City', { size: 10 }));
  parts.push(text(companyX, logoY + 74, 'VAT Reg. TIN: 682-408-625-00000', { size: 10 }));

  y = logoY + Math.max(logoH, 74) + 20;

  // ===== Invoice #, Sold To, Registered Name, Ship To — plain text with
  // corner-bracket fillable marks, matching invoice.jpg. NOT a boxed field
  // group; the mock has no border drawn around this section at all. =====
  const custTop = y;
  const custRowH = 24;
  const custMidX = CONTENT_LEFT + Math.round(CONTENT_WIDTH * 0.55);

  let cy = custTop + 10;
  parts.push(text(CONTENT_LEFT, cy, `Invoice #:  ${data.invoice_number}`, { size: 11 }));
  cy += custRowH;
  parts.push(text(CONTENT_LEFT, cy, `Sold To:  ${data.customerName}`, { size: 11 }));
  cy += custRowH;
  parts.push(text(CONTENT_LEFT, cy, 'Registered Name:', { size: 11 }));
  parts.push(text(custMidX, cy, 'Ship To Address:', { size: 11 }));
  parts.push(cornerMark(CONTENT_LEFT, cy + 8));
  parts.push(cornerMark(custMidX, cy + 8));
  cy += custRowH - 6;
  parts.push(text(CONTENT_LEFT + 4, cy, data.customerName, { size: 10, weight: 400 }));
  for (const [i, wrapped] of wrapText(data.customerAddress, 34).slice(0, 1).entries()) {
    parts.push(text(custMidX + 4, cy + i * 12, wrapped, { size: 10, weight: 400 }));
  }

  y = cy + 22;

  // ===== Info block: Date/TIN/PO/Terms (left) + payment info (right) =====
  const infoRowH = 20;
  const infoRightX = CONTENT_LEFT + Math.round(CONTENT_WIDTH * 0.55);
  const infoRows: [string, string, string, string][] = [
    ['Date:', data.date, 'Mode of Payment:', data.modeOfPayment],
    ['Client TIN:', data.customerTIN, 'Check No.:', data.checkNo],
    ['PO #:', data.poNumber, 'Bank Name:', data.bankName],
    ['Terms:', data.terms, 'Project ID:', data.projectId],
  ];
  let iy = y + 14;
  for (const [ll, lv, rl, rv] of infoRows) {
    parts.push(text(CONTENT_LEFT, iy, `${ll} ${lv}`, { size: 10 }));
    parts.push(text(infoRightX, iy, `${rl} ${rv}`, { size: 10 }));
    iy += infoRowH;
  }
  y = iy + 10;

  // ===== Item table — bordered grid, shaded header row =====
  const cols = [
    { key: 'no', header: 'ITEM NO.', width: 55, align: 'middle' as const },
    { key: 'code', header: 'ITEM CODE', width: 100, align: 'middle' as const },
    { key: 'desc', header: 'DESCRIPTION', width: 430, align: 'middle' as const },
    { key: 'qty', header: 'QTY', width: 70, align: 'end' as const },
    { key: 'unitPrice', header: 'UNIT PRICE', width: 120, align: 'end' as const },
    { key: 'amount', header: 'AMOUNT', width: 137, align: 'end' as const },
  ];
  const colX: number[] = [CONTENT_LEFT];
  for (const c of cols) colX.push(colX[colX.length - 1] + c.width);
  const tableRight = colX[colX.length - 1];

  const headerRowH = 28;
  const itemRowH = 24;
  const items = data.items.length > 0 ? data.items : [];
  const tableHeight = headerRowH + Math.max(items.length, 1) * itemRowH;

  parts.push(rect(CONTENT_LEFT, y, tableRight - CONTENT_LEFT, headerRowH, { fill: '#dcdcdc', strokeWidth: 1.5 }));
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    const cx = c.align === 'end' ? colX[i + 1] - 8 : c.align === 'middle' ? (colX[i] + colX[i + 1]) / 2 : colX[i] + 8;
    // Letter-spacing only on Description, matching invoice.jpg — applying
    // it to the narrow columns too widens "ITEM NO." past its own column
    // and clips it against the table border.
    const headerSpacing = c.key === 'desc' ? 3 : undefined;
    parts.push(text(cx, y + 19, c.header, { size: 11, weight: 700, anchor: c.align, spacing: headerSpacing }));
  }

  let ry = y + headerRowH;
  for (const item of items) {
    const amount = item.quantity * item.price;
    const cells = [
      '', // no — filled below with index
      item.itemCode,
      truncate(item.itemName, 62),
      String(item.quantity),
      item.price.toFixed(2),
      amount.toFixed(2),
    ];
    cells[0] = String(items.indexOf(item) + 1);
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const cx = c.align === 'end' ? colX[i + 1] - 8 : c.align === 'middle' ? (colX[i] + colX[i + 1]) / 2 : colX[i] + 8;
      parts.push(text(cx, ry + 17, cells[i], { size: 11, anchor: c.align }));
    }
    ry += itemRowH;
  }

  // Outer border + column dividers + header/body divider
  parts.push(rect(CONTENT_LEFT, y, tableRight - CONTENT_LEFT, tableHeight, { strokeWidth: 1.5 }));
  parts.push(line(CONTENT_LEFT, y + headerRowH, tableRight, y + headerRowH, { strokeWidth: 1.5 }));
  for (let i = 1; i < cols.length; i++) {
    parts.push(line(colX[i], y, colX[i], y + tableHeight));
  }
  for (let r = 1; r < items.length; r++) {
    const ly = y + headerRowH + r * itemRowH;
    parts.push(line(CONTENT_LEFT, ly, tableRight, ly, { stroke: '#bbbbbb' }));
  }

  y += tableHeight + 20;

  // ===== Terms (left) + totals box (right), side by side =====
  const netTotal = data.items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const vatableSales = netTotal / 1.12;
  const vat = netTotal - vatableSales;
  const withholding = 0; // schema gap — printed blank until sales_invoices carries it
  const amountDue = vatableSales - withholding;

  const totalsLeft = colX[3]; // aligns with the item table's Qty column boundary
  const totalsDivider = colX[5]; // aligns with the Unit Price / Amount boundary
  const totalsRight = tableRight;
  const totalsRowH = 20;
  const totalsGroup1: [string, string][] = [
    ['Total Sales (VAT Inclusive)', netTotal.toFixed(2)],
    ['Less: VAT', vat.toFixed(2)],
    ['Amount Net of VAT', vatableSales.toFixed(2)],
    ['Less: Withholding Tax', withholding.toFixed(2)],
  ];
  const totalsGroup2: [string, string][] = [
    ['Amount Due', amountDue.toFixed(2)],
    ['Add: VAT', vat.toFixed(2)],
    ['VATABLE SALES', vatableSales.toFixed(2)],
    ['VAT-EXEMPT SALES', (0).toFixed(2)],
    ['VAT ZERO-RATED SALES', (0).toFixed(2)],
    ['VAT AMOUNT', vat.toFixed(2)],
  ];
  const totalsRows = totalsGroup1.length + totalsGroup2.length;
  const totalsBoxHeight = totalsRows * totalsRowH;

  const termsMaxChars = 66;
  const termsLines = wrapText(
    'Checks/Cheques should be made payable to Autosync Ventures Corp. only. Invoices which are not paid ' +
      'within the payment terms granted shall carry an interest rate of 3% per month until settled. As ' +
      'further agreed, if the customer fails to settle, this account shall be turned over to the attorney ' +
      'for collection. Attorney\'s fee, court cost and damages shall be at the customer\'s account.',
    termsMaxChars,
  );

  const bottomBlockTop = y;
  // A bold standalone header, then the paragraph body below it — matching
  // invoice.jpg's "TERMS AND CONDITION :" heading, not a label folded into
  // the first line of the paragraph.
  parts.push(text(CONTENT_LEFT, bottomBlockTop + 12, 'TERMS AND CONDITION :', { size: 11, weight: 700 }));
  for (const [i, ln] of termsLines.entries()) {
    parts.push(text(CONTENT_LEFT, bottomBlockTop + 30 + i * 14, ln, { size: 10, weight: 400 }));
  }

  parts.push(rect(totalsLeft, bottomBlockTop, totalsRight - totalsLeft, totalsBoxHeight, { strokeWidth: 1.5 }));
  parts.push(line(totalsDivider, bottomBlockTop, totalsDivider, bottomBlockTop + totalsBoxHeight, { strokeWidth: 1.5 }));
  let trY = bottomBlockTop;
  for (const [gi, group] of [totalsGroup1, totalsGroup2].entries()) {
    for (const [label, value] of group) {
      parts.push(text(totalsLeft + 8, trY + 15, label, { size: 10 }));
      parts.push(text(totalsRight - 8, trY + 15, value, { size: 10, anchor: 'end' }));
      trY += totalsRowH;
    }
    if (gi === 0) {
      parts.push(line(totalsLeft, trY, totalsRight, trY, { strokeWidth: 1.5 }));
    }
  }

  y = bottomBlockTop + Math.max(30 + termsLines.length * 14 + 10, totalsBoxHeight) + 20;

  // ===== Checked and received + signature block — bold all-caps heading,
  // then Signature / Printed Name / Date as three separate full-width
  // lines (not paired on one line), matching invoice.jpg exactly. =====
  parts.push(
    text(
      CONTENT_LEFT,
      y,
      'CHECKED AND RECEIVED THE ABOVE ITEMS/GOODS IN GOOD ORDER AND CONDITION',
      { size: 10, weight: 700 },
    ),
  );
  y += 28;
  parts.push(text(CONTENT_LEFT, y, `SIGNATURE :  ${'_'.repeat(45)}`, { size: 10, weight: 700 }));
  y += 26;
  parts.push(text(CONTENT_LEFT, y, `PRINTED NAME :  ${'_'.repeat(42)}`, { size: 10, weight: 700 }));
  y += 26;
  parts.push(text(CONTENT_LEFT, y, `DATE :  ${'_'.repeat(45)}`, { size: 10, weight: 700 }));

  y += 34;

  // ===== Secondary letterhead, above the compliance footer — invoice.jpg
  // repeats the company name here too, right-aligned near the totals. =====
  parts.push(text(totalsRight, y, 'Autosync Ventures Corp.', { size: 12, weight: 700, anchor: 'end' }));
  y += 16;

  // ===== Compliance footer — structured like invoice.jpg's two-column
  // permit block, but deliberately left blank rather than filled with
  // fabricated BIR permit/ATP/accreditation numbers. The one figure we
  // actually know (the VAT TIN) is filled in; everything else is a blank
  // for the business to complete with its real registered numbers before
  // this is used for official invoicing. See dot-matrix-invoice.service.ts. =====
  const footerRowH = 12;
  const footerRightX = CONTENT_LEFT + Math.round(CONTENT_WIDTH * 0.6);
  const footerRows: [string, string, string, string][] = [
    ['LL Permit No.:', '', 'VAT Reg. TIN:', '682-408-625-00000'],
    ['BIR ATP No.:', '', "Printer's Accreditation No.:", ''],
    ['Date Issued:', '', 'Date of Accreditation / Expiry:', ''],
  ];
  for (const [ll, lv, rl, rv] of footerRows) {
    parts.push(text(CONTENT_LEFT, y, `${ll} ${lv}`, { size: 7, weight: 400 }));
    parts.push(text(footerRightX, y, `${rl} ${rv}`, { size: 7, weight: 400 }));
    y += footerRowH;
  }

  y += 14;

  const authorHeight = y + MARGIN;

  const svg = `<svg width="${WIDTH}" height="${authorHeight}" viewBox="0 0 ${WIDTH} ${authorHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect x="0" y="0" width="${WIDTH}" height="${authorHeight}" fill="#ffffff"/>${parts.join('')}</svg>`;

  return { svg, width: WIDTH, authorHeight };
}
