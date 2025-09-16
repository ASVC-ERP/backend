import { IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PriceDto {
  @Type(() => Number)
  @IsNumber()
  price1: number;

  @Type(() => Number)
  @IsNumber()
  price2: number;

  @Type(() => Number)
  @IsNumber()
  price3: number;

  @Type(() => Number)
  @IsNumber()
  price4: number;
}

export class CreateItemDto {
  @IsString()
  itemCode: string;

  @IsString()
  itemName: string;

  @IsString()
  brand: string;

  @IsString()
  origin: string;

  @Type(() => Number)
  @IsNumber()
  minStock: number;

  @Type(() => Number)
  @IsNumber()
  stock: number;

  @Type(() => Number)
  @IsNumber()
  cost: number;

  @ValidateNested()
  @Type(() => PriceDto)
  price: PriceDto;

  @IsString()
  partNum: string;

  @IsString()
  interNum: string;

  @IsString()
  unit: string;

  @IsString()
  model: string;
}
