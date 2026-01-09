import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesOrderItemDto {
  @IsString()
  item_code: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class CreateSalesOrderDto {
  @IsString()
  cid: string;

  @IsString()
  sales_agent: string;

  @IsNumber()
  discount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[];
}
