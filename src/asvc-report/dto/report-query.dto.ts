import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
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
