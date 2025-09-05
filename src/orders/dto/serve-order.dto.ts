// src/orders/dto/serve-order.dto.ts
import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ServeOrderItemDto {
  @IsString()
  itemName: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantityOrdered: number;

  @IsNumber()
  quantityServed: number;

  @IsNumber()
  quantityUnserved: number;
}

export class ServeOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  date: string;

  @IsString()
  customerName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServeOrderItemDto)
  items: ServeOrderItemDto[];
}
