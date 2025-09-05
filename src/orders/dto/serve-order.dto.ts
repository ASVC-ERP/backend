// serve-order.dto.ts
import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ServeItemDto {
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
  date: string;

  @IsString()
  customerName: string;

  @IsString()
  customerAddress: string;   // ✅ new

  @IsString()
  customerNumber: string;    // ✅ new

  @IsString()
  salesAgent: string;        // ✅ new

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServeItemDto)
  items: ServeItemDto[];
}
