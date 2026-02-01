import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesOrderItemDto {
  @IsNumber()
  item_id: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class CreateSalesOrderDto {
  @IsNumber() 
  cid: number;

  @IsNumber()
  sales_agent: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[];
}
