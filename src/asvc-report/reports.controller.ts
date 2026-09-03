import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../asvc-auth/roles.decorator';
import {
  SalesReportQueryDto,
  PurchaseReportQueryDto,
} from './dto/report-query.dto';

// Global JwtAuthGuard applies; @Roles restricts every route here to admins.
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  sales(@Query() q: SalesReportQueryDto) {
    return this.service.salesDashboard(q.from, q.to, q.slowDays);
  }

  @Get('purchases')
  purchases(@Query() q: PurchaseReportQueryDto) {
    return this.service.purchaseDashboard(q.from, q.to, q.status);
  }
}
