import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateSalesInvoiceDto {
  @IsOptional()
  @IsString()
  waybill_number?: string;

  @IsOptional()
  @IsString()
  courier?: string;

  @IsOptional()
  @IsString()
  invoice_number?: string;

  @IsOptional()
  @IsDateString()
  shipping_date?: string;
}