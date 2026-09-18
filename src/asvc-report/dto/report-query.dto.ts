import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ReportRangeDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class SalesReportQueryDto extends ReportRangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  slowDays?: number;
}

export class PurchaseReportQueryDto extends ReportRangeDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CustomerReportQueryDto extends ReportRangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CustomerDetailQueryDto extends ReportRangeDto {}

// "View full" detail list for one dashboard panel. The panel value also
// says which report it belongs to (see DETAIL_PANELS in reports.service).
export const DETAIL_PANEL_NAMES = [
  'best_selling',
  'top_customers',
  'slow_moving',
  'pnl_by_brand',
  'customers_by_city',
  'top_products',
  'top_suppliers',
] as const;

export class ReportDetailQueryDto extends ReportRangeDto {
  @IsIn(DETAIL_PANEL_NAMES as unknown as string[])
  panel: string;
}
