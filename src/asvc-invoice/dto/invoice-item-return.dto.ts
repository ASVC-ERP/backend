import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesReturnItemDto {
  @IsNumber()
  invoice_item_id: number;

  @IsNumber()
  return_qty: number;
}

export class CreateSalesReturnDto {
  @IsNumber()
  invoice_id: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnItemDto)
  items: CreateSalesReturnItemDto[];
}