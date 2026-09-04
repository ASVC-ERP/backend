import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../asvc-auth/roles.decorator';
import {
  SalesReportQueryDto,
  PurchaseReportQueryDto,
  ReportDetailQueryDto,
} from './dto/report-query.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Global JwtAuthGuard applies; @Roles restricts every route here to admins.
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  sales(@Query() q: SalesReportQueryDto) {
    return this.service.salesDashboard(q.from, q.to, q.slowDays);
  }

  @Get('sales/export')
  async salesExport(@Query() q: SalesReportQueryDto, @Res() res: Response) {
    const buf = await this.service.salesWorkbook(q.from, q.to, q.slowDays);
    res
      .set({
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="sales-report_${q.from}_${q.to}.xlsx"`,
      })
      .end(buf);
  }

  @Get('purchases')
  purchases(@Query() q: PurchaseReportQueryDto) {
    return this.service.purchaseDashboard(q.from, q.to, q.status);
  }

  @Get('purchases/export')
  async purchasesExport(
    @Query() q: PurchaseReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.service.purchaseWorkbook(q.from, q.to, q.status);
    res
      .set({
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="purchase-report_${q.from}_${q.to}.xlsx"`,
      })
      .end(buf);
  }

  // "View full" — the complete rows for one dashboard panel.
  @Get('detail')
  detail(@Query() q: ReportDetailQueryDto) {
    return this.service.detailList(q.panel, q.from, q.to);
  }

  @Get('detail/export')
  async detailExport(@Query() q: ReportDetailQueryDto, @Res() res: Response) {
    const buf = await this.service.detailListWorkbook(q.panel, q.from, q.to);
    res
      .set({
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="${q.panel}_${q.from}_${q.to}.xlsx"`,
      })
      .end(buf);
  }
}
