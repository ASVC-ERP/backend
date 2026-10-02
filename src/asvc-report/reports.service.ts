import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Workbook } from 'exceljs';
import { SupabaseService } from '../supabase/supabase.service';
import { GeminiService } from '../asvc-ai/gemini.service';

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
      { header: 'Code', key: 'item_code', width: 14 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Brand', key: 'brand', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Sales Value', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  top_customers: {
    report: 'sales' as const,
    sheet: 'Top Customers',
    cols: [
      { header: 'Name', key: 'name', width: 32 },
      { header: 'City', key: 'city', width: 24 },
      { header: 'Total Orders', key: 'total_orders', width: 14 },
      { header: 'Total Sales', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  slow_moving: {
    report: 'sales' as const,
    sheet: 'Slow-Moving',
    cols: [
      { header: 'Code', key: 'item_code', width: 14 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Last Sold', key: 'last_sold', width: 14 },
      { header: 'Last Order ID', key: 'last_order_id', width: 14 },
      { header: 'Days Ago', key: 'days_ago', width: 12 },
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
  customers_by_city: {
    report: 'customers' as const,
    sheet: 'Revenue by City',
    cols: [
      { header: 'City', key: 'city', width: 28 },
      { header: 'Revenue', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  top_products: {
    report: 'purchases' as const,
    sheet: 'Top Products',
    cols: [
      { header: 'Code', key: 'item_code', width: 14 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Brand', key: 'brand', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Purchased Value', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  top_suppliers: {
    report: 'purchases' as const,
    sheet: 'Top Suppliers',
    cols: [
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Total Orders', key: 'total_orders', width: 14 },
      { header: 'Total Purchases', key: 'total', width: 16, money: true },
    ] as Col[],
  },
  suppliers_by_currency: {
    report: 'suppliers' as const,
    sheet: 'Spend by Currency',
    cols: [
      { header: 'Currency', key: 'currency', width: 16 },
      { header: 'Spend', key: 'total', width: 16, money: true },
    ] as Col[],
  },
};
export type DetailPanel = keyof typeof DETAIL_PANELS;
const BIG_LIMIT = 100000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: GeminiService,
  ) {}

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

  // Purchase status filter. A PENDING supplier invoice is a draft PO -- it
  // hasn't touched stock or cost -- so the report defaults to posted only.
  //   undefined -> 'POSTED'   (real purchases)
  //   'all'     -> null       (no filter; include pending)
  //   anything else passes through (e.g. 'PENDING')
  private normStatus(status?: string): string | null {
    if (status === 'all') return null;
    return status ?? 'POSTED';
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
      p_status: this.normStatus(status),
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

  // ---- AI insights (Gemini) ----------------------------------------------
  // A dashboard's numbers go to a third-party model, so every customer- or
  // supplier-identifying field is replaced with a generic rank before it
  // leaves the server. Only aggregates, product info, and ranks go out.

  private anonymizeRanked<T extends Record<string, unknown>>(
    rows: T[] | null | undefined,
    idKey: keyof T,
    nameKey: keyof T = 'name' as keyof T,
  ) {
    return (rows ?? []).map((r, i) => {
      const { [idKey]: _id, [nameKey]: _name, ...rest } = r;
      return { rank: i + 1, ...rest };
    });
  }

  private sanitizeSalesForAi(d: any) {
    return {
      kpis: d.kpis,
      kpis_prev: d.kpis_prev,
      best_selling: (d.best_selling ?? []).map(
        ({ product_id, ...rest }: any) => rest,
      ),
      top_customers: this.anonymizeRanked(d.top_customers, 'customer_id'),
      pnl_by_brand: d.pnl_by_brand,
      slow_moving: (d.slow_moving ?? []).map(
        ({ product_id, last_order_id, ...rest }: any) => rest,
      ),
    };
  }

  private sanitizePurchasesForAi(d: any) {
    return {
      kpis: d.kpis,
      kpis_prev: d.kpis_prev,
      top_products: (d.top_products ?? []).map(
        ({ product_id, ...rest }: any) => rest,
      ),
      top_suppliers: this.anonymizeRanked(d.top_suppliers, 'supplier_id'),
    };
  }

  async salesInsights(from: string, to: string, slowDays?: number) {
    const d = await this.salesDashboard(from, to, slowDays);
    const data_sent = this.sanitizeSalesForAi(d);
    const insights = await this.ai.analyzeReport('sales', data_sent);
    return { range: { from, to }, data_sent, insights };
  }

  async purchaseInsights(from: string, to: string, status?: string) {
    const d = await this.purchaseDashboard(from, to, status);
    const data_sent = this.sanitizePurchasesForAi(d);
    const insights = await this.ai.analyzeReport('purchases', data_sent);
    return { range: { from, to }, data_sent, insights };
  }

  private async customerRpc(from: string, to: string, limit?: number) {
    const args: Record<string, unknown> = { p_from: from, p_to: to };
    if (limit != null) args.p_limit = limit;
    const { data, error } = await this.supabase.client.rpc(
      'report_customer_dashboard',
      args,
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async customerDashboard(from: string, to: string, limit?: number) {
    const { prevFrom, prevTo } = this.previousRange(from, to);
    const [cur, prev] = await Promise.all([
      this.customerRpc(from, to, limit),
      this.customerRpc(prevFrom, prevTo, limit),
    ]);
    cur.kpis_prev = prev?.kpis ?? null;
    return cur;
  }

  private async customerDetailRpc(
    customerId: number,
    from: string,
    to: string,
  ) {
    const { data, error } = await this.supabase.client.rpc(
      'report_customer_detail',
      { p_customer_id: customerId, p_from: from, p_to: to },
    );
    if (error) throw new InternalServerErrorException(error.message);
    if (!data?.profile) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }
    return data;
  }

  async customerDetail(customerId: number, from: string, to: string) {
    return this.customerDetailRpc(customerId, from, to);
  }

  private async supplierRpc(
    from: string,
    to: string,
    status?: string,
    limit?: number,
  ) {
    const args: Record<string, unknown> = {
      p_from: from,
      p_to: to,
      p_status: this.normStatus(status),
    };
    if (limit != null) args.p_limit = limit;
    const { data, error } = await this.supabase.client.rpc(
      'report_supplier_dashboard',
      args,
    );
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async supplierDashboard(
    from: string,
    to: string,
    status?: string,
    limit?: number,
  ) {
    const { prevFrom, prevTo } = this.previousRange(from, to);
    const [cur, prev] = await Promise.all([
      this.supplierRpc(from, to, status, limit),
      this.supplierRpc(prevFrom, prevTo, status, limit),
    ]);
    cur.kpis_prev = prev?.kpis ?? null;
    return cur;
  }

  private async supplierDetailRpc(
    supplierId: number,
    from: string,
    to: string,
    status?: string,
  ) {
    const { data, error } = await this.supabase.client.rpc(
      'report_supplier_detail',
      {
        p_supplier_id: supplierId,
        p_from: from,
        p_to: to,
        p_status: this.normStatus(status),
      },
    );
    if (error) throw new InternalServerErrorException(error.message);
    if (!data?.profile) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }
    return data;
  }

  async supplierDetail(
    supplierId: number,
    from: string,
    to: string,
    status?: string,
  ) {
    return this.supplierDetailRpc(supplierId, from, to, status);
  }

  // ---- "View full" detail lists -----------------------------------------
  // The full (un-truncated) rows for one dashboard panel.

  async detailList(panel: string, from: string, to: string) {
    const cfg = DETAIL_PANELS[panel as DetailPanel];
    if (!cfg) throw new BadRequestException(`Unknown panel: ${panel}`);
    const data =
      cfg.report === 'sales'
        ? await this.salesRpc(from, to, 90, BIG_LIMIT, BIG_LIMIT)
        : cfg.report === 'purchases'
          ? await this.purchaseRpc(from, to, undefined, BIG_LIMIT)
          : cfg.report === 'customers'
            ? await this.customerRpc(from, to, BIG_LIMIT)
            : await this.supplierRpc(from, to, undefined, BIG_LIMIT);
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

  async customerWorkbook(from: string, to: string, limit?: number) {
    const d = await this.customerDashboard(from, to, limit);
    const wb = this.newWorkbook();

    const summary = wb.addWorksheet('Summary');
    this.writeMeta(summary, 'Customer Report', from, to);
    summary.addRow([]);
    summary.addRow(['Metric', 'Value', 'Previous period', 'Change %']).font = {
      bold: true,
    };
    const p = d.kpis_prev;
    this.kpiRow(
      summary,
      'Active Customers',
      d.kpis.active_customers,
      p?.active_customers,
    );
    this.kpiRow(summary, 'Total Revenue', d.kpis.revenue, p?.revenue);
    this.kpiRow(
      summary,
      'Avg Order Value',
      d.kpis.avg_order_value,
      p?.avg_order_value,
    );
    this.kpiRow(
      summary,
      'New Customers',
      d.kpis.new_customers,
      p?.new_customers,
    );
    summary.getColumn(1).width = 22;
    summary.getColumn(2).width = 16;
    summary.getColumn(3).width = 16;
    summary.getColumn(4).width = 12;
    summary.getColumn(2).numFmt = '#,##0.00';
    summary.getColumn(3).numFmt = '#,##0.00';

    this.addSheet(wb, 'Top Customers', d.top_customers, [
      { header: 'Customer ID', key: 'customer_id', width: 12 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Orders', key: 'total_orders', width: 10 },
      { header: 'Revenue', key: 'total', width: 16, money: true },
      { header: 'Avg Order Value', key: 'avg_order_value', width: 16, money: true },
      { header: 'Margin %', key: 'margin_pct', width: 12 },
    ]);
    this.addSheet(wb, 'Customers by City', d.customers_by_city, [
      { header: 'City', key: 'city', width: 28 },
      { header: 'Revenue', key: 'total', width: 16, money: true },
    ]);

    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  async customerDetailWorkbook(customerId: number, from: string, to: string) {
    const d = await this.customerDetailRpc(customerId, from, to);
    const wb = this.newWorkbook();

    const profile = wb.addWorksheet('Profile');
    this.writeMeta(profile, d.profile.name || `Customer ${customerId}`, from, to);
    profile.addRow([]);
    profile.addRow(['City', d.profile.city || '']);
    profile.addRow(['TIN', d.profile.tin || '']);
    profile.addRow(['Terms', d.profile.terms || '']);
    profile.addRow(['PIC', d.profile.pic || '']);
    profile.addRow([]);
    profile.addRow(['Metric', 'Value']).font = { bold: true };
    profile.addRow(['Lifetime Revenue', d.kpis.lifetime_revenue]);
    profile.addRow(['Total Orders', d.kpis.total_orders]);
    profile.addRow(['Avg Order Value', d.kpis.avg_order_value]);
    profile.addRow(['Gross Margin %', d.kpis.margin_pct]);
    profile.getColumn(1).width = 22;
    profile.getColumn(2).width = 24;

    this.addSheet(wb, 'Top Products', d.top_products, [
      { header: 'Item ID', key: 'item_id', width: 12 },
      { header: 'Description', key: 'description', width: 36 },
      { header: 'Brand', key: 'brand', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Revenue', key: 'total', width: 16, money: true },
    ]);
    this.addSheet(wb, 'Orders', d.orders, [
      { header: 'Invoice #', key: 'invoice_number', width: 16 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Items', key: 'items', width: 10 },
      { header: 'Total', key: 'total', width: 16, money: true },
    ]);

    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  async supplierWorkbook(
    from: string,
    to: string,
    status?: string,
    limit?: number,
  ) {
    const d = await this.supplierDashboard(from, to, status, limit);
    const wb = this.newWorkbook();

    const summary = wb.addWorksheet('Summary');
    this.writeMeta(summary, 'Supplier Report', from, to);
    summary.addRow([]);
    summary.addRow(['Metric', 'Value', 'Previous period', 'Change %']).font = {
      bold: true,
    };
    const p = d.kpis_prev;
    this.kpiRow(
      summary,
      'Active Suppliers',
      d.kpis.active_suppliers,
      p?.active_suppliers,
    );
    this.kpiRow(summary, 'Total Spend', d.kpis.total_spend, p?.total_spend);
    this.kpiRow(
      summary,
      'Avg Order Value',
      d.kpis.avg_order_value,
      p?.avg_order_value,
    );
    this.kpiRow(
      summary,
      'New Suppliers',
      d.kpis.new_suppliers,
      p?.new_suppliers,
    );
    summary.getColumn(1).width = 22;
    summary.getColumn(2).width = 16;
    summary.getColumn(3).width = 16;
    summary.getColumn(4).width = 12;
    summary.getColumn(2).numFmt = '#,##0.00';
    summary.getColumn(3).numFmt = '#,##0.00';

    this.addSheet(wb, 'Top Suppliers', d.top_suppliers, [
      { header: 'Supplier ID', key: 'supplier_id', width: 12 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Currency', key: 'currency', width: 12 },
      { header: 'Orders', key: 'total_orders', width: 10 },
      { header: 'Spend', key: 'total', width: 16, money: true },
      { header: 'Avg Order Value', key: 'avg_order_value', width: 16, money: true },
    ]);
    this.addSheet(wb, 'Spend by Currency', d.suppliers_by_currency, [
      { header: 'Currency', key: 'currency', width: 16 },
      { header: 'Spend', key: 'total', width: 16, money: true },
    ]);

    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  async supplierDetailWorkbook(
    supplierId: number,
    from: string,
    to: string,
    status?: string,
  ) {
    const d = await this.supplierDetailRpc(supplierId, from, to, status);
    const wb = this.newWorkbook();

    const profile = wb.addWorksheet('Profile');
    this.writeMeta(profile, d.profile.name || `Supplier ${supplierId}`, from, to);
    profile.addRow([]);
    profile.addRow(['Address', d.profile.address || '']);
    profile.addRow(['Currency', d.profile.currency || '']);
    profile.addRow(['Number', d.profile.number || '']);
    profile.addRow([]);
    profile.addRow(['Metric', 'Value']).font = { bold: true };
    profile.addRow(['Lifetime Spend', d.kpis.lifetime_spend]);
    profile.addRow(['Total Orders', d.kpis.total_orders]);
    profile.addRow(['Avg Order Value', d.kpis.avg_order_value]);
    profile.addRow(['Total Items Purchased', d.kpis.total_items]);
    profile.getColumn(1).width = 22;
    profile.getColumn(2).width = 24;

    this.addSheet(wb, 'Top Products', d.top_products, [
      { header: 'Product ID', key: 'product_id', width: 12 },
      { header: 'Description', key: 'description', width: 36 },
      { header: 'Brand', key: 'brand', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Spend', key: 'total', width: 16, money: true },
    ]);
    this.addSheet(wb, 'Orders', d.orders, [
      { header: 'Invoice #', key: 'invoice_number', width: 16 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Items', key: 'items', width: 10 },
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
