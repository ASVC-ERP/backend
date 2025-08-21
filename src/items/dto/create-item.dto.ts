import { IsString, IsNumber } from 'class-validator';

export class CreateItemDto {
  @IsString()
  itemCode: string;

  @IsString()
  itemName: string;

  @IsString()
  brand: string;

  @IsString()
  origin: string;

  @IsNumber()
  minStock: number;
}
