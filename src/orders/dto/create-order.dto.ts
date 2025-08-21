import { IsString, IsEnum, IsNumber, ValidateNested, IsArray } from "class-validator";
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderedItemDto)
  orderedItems: OrderedItemDto[];

  @IsNumber()
  totalPrice: number;

  @IsString()
  salesAgent: string;

  @IsEnum(OrderStatus)
  status: OrderStatus;
}
