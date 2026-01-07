import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateSalesOrderItemDto {
  @IsString()
  item_code: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsString()
  cid?: string;

  @IsOptional()
  @IsString()
  sales_agent?: string;

  @IsOptional()
  @IsString()
  order_date?: string;

  @IsOptional()
  @IsNumber()
  discount?: number;

  // REQUIRED, fully validated
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdateSalesOrderItemDto)
  items: UpdateSalesOrderItemDto[];
}
