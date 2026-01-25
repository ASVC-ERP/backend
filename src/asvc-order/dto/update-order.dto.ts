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
  @IsOptional()
  @IsNumber()
  item_id: number;

  @IsOptional()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  price: number;
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsNumber()
  cid?: number;

  @IsOptional()
  @IsString()
  order_date?: string;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdateSalesOrderItemDto)
  items: UpdateSalesOrderItemDto[];
}
