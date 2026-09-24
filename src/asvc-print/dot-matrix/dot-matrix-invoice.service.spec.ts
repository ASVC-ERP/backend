import { BadRequestException } from '@nestjs/common';
import { DotMatrixInvoiceService, DotMatrixInvoiceData } from './dot-matrix-invoice.service';
import { INVOICE_FIELD_MAP } from './invoice-field-map';
import { buildInvoiceSvg } from './invoice-svg-template';

function sampleInvoice(overrides: Partial<DotMatrixInvoiceData> = {}): DotMatrixInvoiceData {
  return {
    invoice_number: 'INV-000123',
    date: '2026-09-22',
    customerName: 'Juan Dela Cruz Trading',
    customerAddress: '45 Rizal St., Brgy. San Isidro, Marikina City',
    customerTIN: '123-456-789-000',
    terms: '30 Days',
    order_id: 456,
    poNumber: '',
    modeOfPayment: 'Check',
    checkNo: '',
    bankName: '',
    projectId: '',
    total_price: 7900,
    items: [
      { itemCode: 'ITM-001', itemName: 'Engine Oil 4L', unit: 'pc', quantity: 4, price: 850 },
      { itemCode: 'ITM-002', itemName: 'Brake Pad Set', unit: 'set', quantity: 2, price: 1200 },
    ],
    ...overrides,
  };
}

describe('DotMatrixInvoiceService.buildModeA', () => {
  let service: DotMatrixInvoiceService;
  beforeEach(() => (service = new DotMatrixInvoiceService()));

  it('produces a buffer ending in a form feed', () => {
    const buf = service.buildModeA(sampleInvoice());
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf[buf.length - 1]).toBe(0x0c);
  });

  it('rejects an invoice with more line items than the form fits', () => {
    const items = Array.from({ length: INVOICE_FIELD_MAP.itemsMaxRows + 1 }, (_, i) => ({
      itemCode: `X${i}`,
      itemName: 'Item',
      unit: 'pc',
      quantity: 1,
      price: 10,
    }));
    expect(() => service.buildModeA(sampleInvoice({ items }))).toThrow(BadRequestException);
  });
});

// buildInvoiceSvg is the source of truth for Mode B's actual content — it
// returns plain SVG markup, so it can be checked with ordinary string
// assertions instead of needing to decode rendered graphics.
describe('buildInvoiceSvg', () => {
  it('includes the real Autosync company header, not the invoice.jpg mock\'s placeholder branding', () => {
    const { svg } = buildInvoiceSvg(sampleInvoice());
    expect(svg).toContain('Autosync Ventures Corp.');
    expect(svg).toContain('682-408-625-00000');
    expect(svg).not.toContain('ONE TRADE PH');
  });

  it('includes the invoice number, customer name, and item rows', () => {
    const data = sampleInvoice();
    const { svg } = buildInvoiceSvg(data);
    expect(svg).toContain(data.invoice_number);
    expect(svg).toContain(data.customerName);
    expect(svg).toContain('ITM-001');
    expect(svg).toContain('3400.00'); // 4 * 850
  });

  it('escapes XML-significant characters so a customer name can\'t break the SVG', () => {
    const { svg } = buildInvoiceSvg(sampleInvoice({ customerName: 'Tom & Jerry <Trading>' }));
    expect(svg).toContain('Tom &amp; Jerry &lt;Trading&gt;');
    expect(svg).not.toContain('Tom & Jerry <Trading>');
  });

  it('grows the page height with the item count instead of a fixed row budget', () => {
    const few = buildInvoiceSvg(sampleInvoice({ items: [sampleInvoice().items[0]] }));
    const many = buildInvoiceSvg(
      sampleInvoice({
        items: Array.from({ length: 15 }, (_, i) => ({
          itemCode: `X${i}`,
          itemName: 'Item',
          unit: 'pc',
          quantity: 1,
          price: 10,
        })),
      }),
    );
    expect(many.authorHeight).toBeGreaterThan(few.authorHeight);
  });

  it('leaves BIR permit/ATP/accreditation numbers blank rather than fabricating them', () => {
    const { svg } = buildInvoiceSvg(sampleInvoice());
    expect(svg).toContain('LL Permit No.');
    expect(svg).toContain('BIR ATP No.');
    expect(svg).toContain("Printer's Accreditation No.");
    // The one figure that's actually real is filled in.
    expect(svg).toContain('682-408-625-00000');
    // No invented permit/ATP/accreditation number anywhere.
    expect(svg).not.toMatch(/(ATP|Permit|Accreditation) No\.?\s*:?\s*[A-Z0-9-]{4,}/);
  });
});

describe('DotMatrixInvoiceService.buildModeB', () => {
  let service: DotMatrixInvoiceService;
  beforeEach(() => (service = new DotMatrixInvoiceService()));

  it('renders the full invoice as one ESC/P bit-image buffer ending in a form feed', async () => {
    const buf = await service.buildModeB(sampleInvoice());
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf[buf.length - 1]).toBe(0x0c);
    // ESC @ (reset) then ESC P (pica) at the very start of every job
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x1b, 0x40, 0x1b, 0x50]));
    // ESC * 33 — the bit-image band command — appears somewhere in the job
    expect(buf.includes(Buffer.from([0x1b, 0x2a, 33]))).toBe(true);
  });

  it('produces a larger job for an invoice with more line items', async () => {
    const small = await service.buildModeB(sampleInvoice({ items: [sampleInvoice().items[0]] }));
    const large = await service.buildModeB(
      sampleInvoice({
        items: Array.from({ length: 10 }, (_, i) => ({
          itemCode: `X${i}`,
          itemName: 'Item',
          unit: 'pc',
          quantity: 1,
          price: 10,
        })),
      }),
    );
    expect(large.length).toBeGreaterThan(small.length);
  }, 20000);
});

describe('DotMatrixInvoiceService.preview', () => {
  let service: DotMatrixInvoiceService;
  beforeEach(() => (service = new DotMatrixInvoiceService()));

  it('Mode A preview never touches a printer — same data in, readable text out', async () => {
    const data = sampleInvoice();
    const { contentType, body } = await service.preview(data, 'form');
    expect(contentType).toBe('text/plain');
    expect(typeof body).toBe('string');
    expect(body).toContain(data.invoice_number);
    expect(body).toContain(data.customerName);
  });

  it('Mode B preview is the dithered raster as a PNG, not text', async () => {
    const { contentType, body } = await service.preview(sampleInvoice(), 'full');
    expect(contentType).toBe('image/png');
    expect(Buffer.isBuffer(body)).toBe(true);
    // PNG magic bytes
    expect((body as Buffer).subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }, 20000);
});
