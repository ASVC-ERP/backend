import { IsArray, IsInt, Min, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';
  
export class ServeOrderItemDto {
  @IsInt()
  sales_order_item_id: number;

  @IsInt()
  @Min(0)
  served_quantity: number;
}
  
export class ServeOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServeOrderItemDto)
  items: ServeOrderItemDto[];
}
  