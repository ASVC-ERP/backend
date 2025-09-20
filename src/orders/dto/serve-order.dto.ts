// serve-order.dto.ts
import { 
  IsString, 
  IsArray, 
  ValidateNested, 
  IsNumber, 
  IsOptional 
} from 'class-validator';
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

  @IsOptional()
  @IsNumber()
  discount?: number;   // 👈 optional per-item discount (if needed)
}

export class ServeOrderDto {
  @IsString()
  date: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerTIN?: string;  // 👈 keep same as CreateOrderDto

  @IsString()
  customerAddress: string;

  @IsString()
  customerNumber: string;

  @IsString()
  salesAgent: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServeItemDto)
  items: ServeItemDto[];

  @IsOptional()
  @IsNumber()
  totalPrice?: number;   // 👈 computed total (optional)
}
