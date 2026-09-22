// Calibration config for Mode A (pre-printed invoice form).
//
// Coordinates are placeholders read off assets/invoice.jpg's pixel layout —
// the JPG has no physical DPI, so these WILL drift on real paper. Do not
// hand-tune escp-builder.ts or dot-matrix-invoice.service.ts to fix a
// misaligned field; re-measure against the physical form and edit only here.
//
// Units:
//   col — absolute horizontal position, in 1/60" units (ESC $).
//   row — line count from top-of-form, at `lpi` lines per inch.
//
// Calibration procedure (see the dot-matrix invoice guide, step 11):
//   1. Load one real pre-printed form.
//   2. Print a '#' at every anchor field's column, one line apart.
//   3. Measure the offset from each '#' to its actual box, in mm.
//   4. Convert to column/row units below and re-print to confirm.

export const INVOICE_FIELD_MAP = {
  lpi: 6 as const, // matches ESC 2 — 6 lines/inch
  topOfFormOffsetLines: 2, // blank lines before the first printable row

  invoiceNo: { col: 70, row: 2 },
  soldTo: { col: 70, row: 4 },
  registeredName: { col: 4, row: 5 },
  shipToAddress: { col: 280, row: 5 },

  date: { col: 4, row: 8 },
  clientTin: { col: 4, row: 9 },
  poNumber: { col: 4, row: 10 },
  terms: { col: 4, row: 11 },

  modeOfPayment: { col: 280, row: 8 },
  checkNo: { col: 280, row: 9 },
  bankName: { col: 280, row: 10 },
  projectId: { col: 280, row: 11 },

  // Item table: one row start + column set, repeated per line item.
  itemsStartRow: 14,
  itemsMaxRows: 20, // rows available before the totals block on the form
  itemCols: {
    no: 4,
    code: 30,
    desc: 70,
    qty: 340,
    unitPrice: 400,
    amount: 470,
  },
  itemRowStride: 1, // lines advanced per item row (2+ if descriptions wrap)

  totals: {
    totalSalesVatIncl: { col: 400, row: 40 },
    lessVat: { col: 400, row: 41 },
    netOfVat: { col: 400, row: 42 },
    lessWithholding: { col: 400, row: 43 },
    amountDue: { col: 400, row: 44 },
    addVat: { col: 400, row: 45 },
    vatableSales: { col: 400, row: 46 },
    vatExemptSales: { col: 400, row: 47 },
    vatZeroRatedSales: { col: 400, row: 48 },
    vatAmount: { col: 400, row: 49 },
  },
} as const;

export type InvoiceFieldKey = keyof typeof INVOICE_FIELD_MAP;

// Mode B (full layout on blank paper) layout.
//
// This is deliberately NOT the same map as Mode A: on blank paper the
// labels themselves have to be printed too, and nothing here is pinned to
// a physical pre-printed box, so rows can just flow top-to-bottom instead
// of jumping to fixed calibrated positions. Column units are still 1/60"
// (ESC $) — kept as multiples of 6 so they land on a 10cpi character cell.
//
// Printable width assumed: 8" = 480 units = 80 characters at 10cpi, to
// match the masthead artwork's width (see invoice-masthead.meta.json).
export const INVOICE_LAYOUT_FULL = {
  lpi: 6 as const,
  pageWidthChars: 80,
  colLeft: 0,
  colRight: 300, // 5" in — start of the second column on paired lines

  // Must match invoice-masthead.meta.json's linesConsumed — checked at
  // build time in dot-matrix-invoice.service.ts so the two can't drift
  // apart silently after a masthead rebuild.
  headerLines: 8,

  blankLinesAfterMasthead: 1,

  // Char positions: No 0-3, Code 4-13, Desc 14-51 (38 chars), Qty 53-58,
  // Unit Price 59-69 (label is 10 chars — needs the full gap to amount),
  // Amount 70-79. Kept as a comment because it's easy to silently collide
  // two columns again by moving one number without checking the others.
  itemsHeaderCols: { no: 0, code: 24, desc: 84, qty: 318, unitPrice: 354, amount: 420 },
  itemDescMaxChars: 38, // desc column (14) to qty column (53), minus a 1-char gap
  itemsMaxRows: 20, // conservative cap for a single 11" page — see the guide's step 10/11

  blankLinesBeforeTotals: 1,
  blankLinesBeforeTerms: 1,
  blankLinesBeforeSignature: 1,
  blankLinesBeforeFooter: 1,

  termsAndConditions: [
    'Terms & Conditions: Checks/cheques should be made payable to Autosync Ventures Corp.',
    'only. Invoices not settled within the agreed terms shall accrue interest at 3% per',
    "month until settled. The customer agrees unsettled accounts may be referred for",
    "collection, with attorney's fees, court costs and damages for the customer's account.",
  ],

  // Deliberately NOT filled in with fabricated numbers — printing invented
  // BIR permit/ATP/accreditation numbers on a real invoice is a compliance
  // problem, not a placeholder problem. Replace with the business's actual
  // registered figures before this mode is used for real invoicing.
  complianceFooterPlaceholder:
    '[Insert BIR Permit No., ATP No. and Printer\'s Accreditation details here before official use]',
} as const;

