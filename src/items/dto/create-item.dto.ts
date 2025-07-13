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
  stock: number;

  @IsNumber()
  price1: number;

  @IsNumber()
  price2: number;

  @IsNumber()
  price3: number;

  @IsNumber()
  price4: number;
}
