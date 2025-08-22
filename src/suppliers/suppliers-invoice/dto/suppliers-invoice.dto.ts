import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
  @IsString()
  itemName: string;

  @IsString()
  itemCode: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsNumber()
  unitCost: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  conversionFactor: number = 1; // default to 1

  @IsNumber()
  subTotal: number;
}

export class CreateInvoiceDto { 

  @IsString()
  poNum: string;

  @IsDateString()
  purchaseDate: Date; // e.g. "2025-08-21"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @IsOptional()
  @IsIn(['Purchased', 'Returned'])
  status?: 'Purchased' | 'Returned';

  @IsOptional()
  @IsString()
  supplierID?: string;
}
