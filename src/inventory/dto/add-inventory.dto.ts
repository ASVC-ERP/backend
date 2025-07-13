import { IsInt, IsString, Min } from 'class-validator';

export class AddInventoryDto {
  @IsString()
  itemCode: string;

  @IsString()
  supplierId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  invoiceNumber: string;
}
