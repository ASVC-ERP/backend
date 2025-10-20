// create-order.dto.ts
import { 
  IsString, 
  IsEnum, 
  IsNumber, 
  ValidateNested, 
  IsArray, 
  IsOptional 
} from "class-validator";
import { Type } from "class-transformer";

export enum OrderStatus {
  Pending = "Pending",
  Confirmed = "Confirmed",
  Shipped = "Shipped",
  Delivered = "Delivered",
  Canceled = "Canceled",
}

class OrderedItemDto {
  @IsString()
  itemName: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsOptional()              // NEW
  @IsString()
  unit?: string;             // NEW

  @IsString()
  itemCode?: string;
}

export class CreateOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  date: string;

  @IsString()
  customerName: string;

  @IsString()
  customerAddress: string;

  @IsString()
  customerNumber: string;

  @IsOptional()
  @IsString()
  customerTIN?: string;   // 👈 added

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderedItemDto)
  orderedItems: OrderedItemDto[];

  @IsNumber()
  totalPrice: number;

  @IsOptional()
  @IsNumber()
  discount?: number;      // 👈 added

  @IsString()
  salesAgent: string;

  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  approvalStatus?: string;

}
