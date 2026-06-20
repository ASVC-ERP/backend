import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnSupplierInvoiceItemDto {
  @IsNumber()
  item_id: number;

  @IsNumber()
  ret_qty: number;
}

export class ReturnSupplierInvoiceDto {
  @IsString()
  reason: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnSupplierInvoiceItemDto)
  items: ReturnSupplierInvoiceItemDto[];
}