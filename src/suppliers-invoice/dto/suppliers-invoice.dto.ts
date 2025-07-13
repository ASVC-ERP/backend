import { IsString, IsDateString, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class InvoiceItemDto {
  @IsString()
  itemCode: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @Type(() => Number)
  @IsNumber()
  unitCost: number;

  @Type(() => Number)
  @IsNumber()
  discount: number;

  @Type(() => Number)
  @IsNumber()
  grossPrice: number;
}

export class CreateInvoiceDto {
  @IsString()
  supplierInvoiceID: string;

  @IsDateString()
  purchaseDate: string;

  @IsString()
  supplierID: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}