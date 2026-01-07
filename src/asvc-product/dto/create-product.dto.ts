import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  item_code: string;

  @IsString()
  item_name: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsNumber()
  min_stock?: number;

  @IsNumber()
  stock: number;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsNumber()
  price1?: number;

  @IsOptional()
  @IsNumber()
  price2?: number;

  @IsOptional()
  @IsNumber()
  price3?: number;

  @IsOptional()
  @IsNumber()
  price4?: number;

  @IsOptional()
  @IsString()
  part_num?: string;

  @IsOptional()
  @IsString()
  internal_num?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
