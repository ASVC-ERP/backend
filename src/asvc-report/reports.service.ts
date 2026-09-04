import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { SupabaseService } from '../supabase/supabase.service';

// Column spec for a sheet: header label + a getter off each row object.
type Col = { header: string; key: string; width?: number; money?: boolean };

@Injectable()
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async salesDashboard(from: string, to: string, slowDays?: number) {
    const { data, error } = await this.supabase.client.rpc(
      'report_sales_dashboard',
      { p_from: from, p_to: to, p_slow_days: slowDays ?? 90 },
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async purchaseDashboard(from: string, to: string, status?: string) {
    const { data, error } = await this.supabase.client.rpc(
      'report_purchase_dashboard',
      { p_from: from, p_to: to, p_status: status ?? null },
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // ---- xlsx export --------------------------------------------------------
  // Same numbers as the dashboards, one sheet per panel.

  async salesWorkbook(from: string, to: string, slowDays?: number) {
    const d = await this.salesDashboard(from, to, slowDays);
    const wb = this.newWorkbook();

    const summary = wb.addWorksheet('Summary');
    this.writeMeta(summary, 'Sales Report', from, to);
    summary.addRow([]);
    summary.addRow(['Metric', 'Value']).font = { bold: true };
    summary.addRow(['Total Revenue', Number(d.kpis.revenue)]);
    summary.addRow(['COGS', Number(d.kpis.cogs)]);
    summary.addRow(['Gross Profit', Number(d.kpis.gross_profit)]);
    summary.addRow(['Gross Margin %', Number(d.kpis.margin_pct)]);
    summary.getColumn(1).width = 22;
    summary.getColumn(2).width = 18;
    summary.getColumn(2).numFmt = '#,##0.00';

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
    summary.addRow(['Metric', 'Value']).font = { bold: true };
    summary.addRow(['Total Purchases', Number(d.kpis.total_purchases)]);
    summary.getColumn(1).width = 22;
    summary.getColumn(2).width = 18;
    summary.getColumn(2).numFmt = '#,##0.00';

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
