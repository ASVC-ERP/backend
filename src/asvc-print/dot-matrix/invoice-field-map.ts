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
