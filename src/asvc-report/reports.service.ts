import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Workbook } from 'exceljs';
import { SupabaseService } from '../supabase/supabase.service';

// Column spec for a sheet: header label + a getter off each row object.
type Col = { header: string; key: string; width?: number; money?: boolean };

// The dashboard lists that have a "View full" detail page. Keyed by the
// jsonb key the RPC returns; carries the report it belongs to plus the
// sheet/columns for a one-list xlsx export.
export const DETAIL_PANELS = {
  best_selling: {
    report: 'sales' as const,
    sheet: 'Best-Selling',
    cols: [
      { header: 'Product ID', key: 'product_id', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Total Sales', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  top_customers: {
    report: 'sales' as const,
    sheet: 'Top Customers',
    cols: [
      { header: 'Customer ID', key: 'customer_id', width: 12 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Sales', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  slow_moving: {
    report: 'sales' as const,
    sheet: 'Slow-Moving',
    cols: [
      { header: 'Product ID', key: 'product_id', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Last Sold', key: 'last_sold', width: 14 },
      { header: 'Days Ago', key: 'days_ago', width: 12 },
    ] as Col[],
  },
  sales_by_city: {
    report: 'sales' as const,
    sheet: 'Sales by City',
    cols: [
      { header: 'City', key: 'city', width: 28 },
      { header: 'Sales', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  pnl_by_brand: {
    report: 'sales' as const,
    sheet: 'P&L by Brand',
    cols: [
      { header: 'Brand', key: 'brand', width: 24 },
      { header: 'Revenue', key: 'revenue', width: 16, money: true },
      { header: 'Profit', key: 'profit', width: 16, money: true },
      { header: 'Margin %', key: 'margin_pct', width: 12 },
    ] as Col[],
  },
  top_products: {
    report: 'purchases' as const,
    sheet: 'Top Products',
    cols: [
      { header: 'Product ID', key: 'product_id', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Total', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  top_suppliers: {
    report: 'purchases' as const,
    sheet: 'Top Suppliers',
    cols: [
      { header: 'Supplier ID', key: 'supplier_id', width: 12 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Total', key: 'total', width: 16, money: true },
    ] as Col[],
  },
};
export type DetailPanel = keyof typeof DETAIL_PANELS;
const BIG_LIMIT = 100000;

@Injectable()
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  // The equal-length window immediately before [from, to].
  private previousRange(from: string, to: string) {
    const day = 86400000;
    const f = new Date(from + 'T00:00:00Z').getTime();
    const t = new Date(to + 'T00:00:00Z').getTime();
    const span = t - f;
    const prevTo = new Date(f - day);
    const prevFrom = new Date(f - day - span);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { prevFrom: iso(prevFrom), prevTo: iso(prevTo) };
  }

  private async salesRpc(
    from: string,
    to: string,
    slowDays?: number,
    limit?: number,
    slowLimit?: number,
  ) {
    const args: Record<string, unknown> = {
      p_from: from,
      p_to: to,
      p_slow_days: slowDays ?? 90,
    };
    if (limit != null) args.p_limit = limit;
    if (slowLimit != null) args.p_slow_limit = slowLimit;
    const { data, error } = await this.supabase.client.rpc(
      'report_sales_dashboard',
      args,
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  private async purchaseRpc(
    from: string,
    to: string,
    status?: string,
    limit?: number,
  ) {
    const args: Record<string, unknown> = {
      p_from: from,
      p_to: to,
      p_status: status ?? null,
    };
    if (limit != null) args.p_limit = limit;
    const { data, error } = await this.supabase.client.rpc(
      'report_purchase_dashboard',
      args,
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // Dashboards return the current window plus `kpis_prev` for the previous
  // equal-length window, so the frontend can show period-over-period deltas.
  async salesDashboard(from: string, to: string, slowDays?: number) {
    const { prevFrom, prevTo } = this.previousRange(from, to);
    const [cur, prev] = await Promise.all([
      this.salesRpc(from, to, slowDays),
      this.salesRpc(prevFrom, prevTo, slowDays),
    ]);
    cur.kpis_prev = prev?.kpis ?? null;
    return cur;
  }

  async purchaseDashboard(from: string, to: string, status?: string) {
    const { prevFrom, prevTo } = this.previousRange(from, to);
    const [cur, prev] = await Promise.all([
      this.purchaseRpc(from, to, status),
      this.purchaseRpc(prevFrom, prevTo, status),
    ]);
    cur.kpis_prev = prev?.kpis ?? null;
    return cur;
  }

  // ---- "View full" detail lists -----------------------------------------
  // The full (un-truncated) rows for one dashboard panel.

  async detailList(panel: string, from: string, to: string) {
    const cfg = DETAIL_PANELS[panel as DetailPanel];
    if (!cfg) throw new BadRequestException(`Unknown panel: ${panel}`);
    const data =
      cfg.report === 'sales'
        ? await this.salesRpc(from, to, 90, BIG_LIMIT, BIG_LIMIT)
        : await this.purchaseRpc(from, to, undefined, BIG_LIMIT);
    return { panel, rows: data?.[panel] ?? [] };
  }

  async detailListWorkbook(panel: string, from: string, to: string) {
    const cfg = DETAIL_PANELS[panel as DetailPanel];
    if (!cfg) throw new BadRequestException(`Unknown panel: ${panel}`);
    const { rows } = await this.detailList(panel, from, to);
    const wb = this.newWorkbook();
    this.writeMeta(wb.addWorksheet('About'), cfg.sheet, from, to);
    this.addSheet(wb, cfg.sheet, rows, cfg.cols);
    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  // ---- xlsx export --------------------------------------------------------
  // Same numbers as the dashboards, one sheet per panel.

  async salesWorkbook(from: string, to: string, slowDays?: number) {
    const d = await this.salesDashboard(from, to, slowDays);
    const wb = this.newWorkbook();

    const summary = wb.addWorksheet('Summary');
    this.writeMeta(summary, 'Sales Report', from, to);
    summary.addRow([]);
    summary.addRow(['Metric', 'Value', 'Previous period', 'Change %']).font = {
      bold: true,
    };
    const p = d.kpis_prev;
    this.kpiRow(summary, 'Total Revenue', d.kpis.revenue, p?.revenue);
    this.kpiRow(summary, 'COGS', d.kpis.cogs, p?.cogs);
    this.kpiRow(summary, 'Gross Profit', d.kpis.gross_profit, p?.gross_profit);
    this.kpiRow(summary, 'Gross Margin %', d.kpis.margin_pct, p?.margin_pct);
    summary.getColumn(1).width = 22;
    summary.getColumn(2).width = 16;
    summary.getColumn(3).width = 16;
    summary.getColumn(4).width = 12;
    summary.getColumn(2).numFmt = '#,##0.00';
    summary.getColumn(3).numFmt = '#,##0.00';

    this.addSheet(wb, 'Best-Selling', d.best_selling, [
      { header: 'Product ID', key: 'product_id', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Total Sales', key: 'total', width: 16, money: true },
    ]);
    this.addSheet(wb, 'Top Customers', d.top_customers, [
      { header: 'Customer ID', key: 'customer_id', width: 12 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Sales', key: 'total', width: 16, money: true },
    ]);
    this.addSheet(wb, 'Sales by City', d.sales_by_city, [
      { header: 'City', key: 'city', width: 28 },
      { header: 'Sales', key: 'total', width: 16, money: true },
    ]);
    this.addSheet(wb, 'P&L by Brand', d.pnl_by_brand, [
      { header: 'Brand', key: 'brand', width: 24 },
      { header: 'Revenue', key: 'revenue', width: 16, money: true },
      { header: 'Profit', key: 'profit', width: 16, money: true },
      { header: 'Margin %', key: 'margin_pct', width: 12 },
    ]);
    this.addSheet(wb, 'Slow-Moving', d.slow_moving, [
      { header: 'Product ID', key: 'product_id', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Last Sold', key: 'last_sold', width: 14 },
      { header: 'Days Ago', key: 'days_ago', width: 12 },
    ]);

    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  async purchaseWorkbook(from: string, to: string, status?: string) {
    const d = await this.purchaseDashboard(from, to, status);
    const wb = this.newWorkbook();

    const summary = wb.addWorksheet('Summary');
    this.writeMeta(summary, 'Purchase Report', from, to);
    summary.addRow([]);
    summary.addRow(['Metric', 'Value', 'Previous period', 'Change %']).font = {
      bold: true,
    };
    this.kpiRow(
      summary,
      'Total Purchases',
      d.kpis.total_purchases,
      d.kpis_prev?.total_purchases,
    );
    summary.getColumn(1).width = 22;
    summary.getColumn(2).width = 16;
    summary.getColumn(3).width = 16;
    summary.getColumn(4).width = 12;
    summary.getColumn(2).numFmt = '#,##0.00';
    summary.getColumn(3).numFmt = '#,##0.00';

    this.addSheet(wb, 'Top Products', d.top_products, [
      { header: 'Product ID', key: 'product_id', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Total', key: 'total', width: 16, money: true },
    ]);
    this.addSheet(wb, 'Top Suppliers', d.top_suppliers, [
      { header: 'Supplier ID', key: 'supplier_id', width: 12 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Total', key: 'total', width: 16, money: true },
    ]);

    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  // "Metric | value | previous | change%" row for a Summary sheet.
  private kpiRow(
    ws: import('exceljs').Worksheet,
    label: string,
    cur: unknown,
    prev: unknown,
  ) {
    const c = Number(cur) || 0;
    const hasPrev = prev != null && prev !== '';
    const p = Number(prev);
    const change =
      hasPrev && p !== 0 ? `${(((c - p) / p) * 100).toFixed(1)}%` : '';
    ws.addRow([label, c, hasPrev ? p : '', change]);
  }

  private newWorkbook() {
    const wb = new Workbook();
    wb.creator = 'IMS';
    wb.created = new Date();
    return wb;
  }

  private writeMeta(ws: import('exceljs').Worksheet, title: string, from: string, to: string) {
    ws.addRow([title]).font = { bold: true, size: 14 };
    ws.addRow([`Range: ${from} to ${to}`]);
    ws.addRow([`Generated: ${new Date().toISOString()}`]);
  }

  private addSheet(
    wb: Workbook,
    name: string,
    rows: Array<Record<string, unknown>> | null | undefined,
    cols: Col[],
  ) {
    const ws = wb.addWorksheet(name);
    const header = ws.addRow(cols.map((c) => c.header));
    header.font = { bold: true };
    cols.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      if (c.width) col.width = c.width;
      if (c.money) col.numFmt = '#,##0.00';
    });
    for (const r of rows ?? []) {
      ws.addRow(cols.map((c) => this.cell(r[c.key])));
    }
  }

  private cell(v: unknown) {
    if (v == null) return '';
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v as string | number;
  }
}
